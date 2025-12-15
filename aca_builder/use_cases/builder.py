from typing import List, Optional
from pathlib import Path
from aca_builder.domain.ports import LibraryRepository, ManifestRepository
from aca_builder.domain.services import (
    select_atoms_by_query, 
    evaluate_lookup, 
    resolve_dependencies, 
    serialize_prompt, 
    resolve_lookup_by_key
)
from aca_builder.domain.events import BuildError
from aca_builder.messages import MESSAGES # 新增导入

class BuilderService:
    def __init__(self, lib_repo: LibraryRepository, man_repo: ManifestRepository):
        self.lib_repo = lib_repo
        self.man_repo = man_repo

    def build_prompt(self, manifest_identifier: str, library_paths: List[Path], manifest_paths: List[Path], is_file_path: bool = False) -> str:
        
        # 1. Resolve Manifest Path
        manifest_path = None
        if is_file_path:
             manifest_path = Path(manifest_identifier)
             if not manifest_path.exists():
                 raise BuildError(MESSAGES["builder.manifest.file_not_found"].format(path=manifest_identifier))
        else:
             manifest_path = self.man_repo.find_manifest(manifest_identifier, manifest_paths)
             if not manifest_path:
                 raise BuildError(MESSAGES["builder.manifest.not_found"].format(identifier=manifest_identifier))
        
        # 2. Load Resources
        manifest = self.man_repo.load_manifest(manifest_path)
        library = self.lib_repo.load_library(library_paths)
        interfaces = self.lib_repo.load_interfaces(library_paths)

        if not library:
            raise BuildError(MESSAGES["builder.library.empty"])
        
        # 3. Apply Overrides (Inline logic from old core)
        if "overrides" in manifest:
             for lkey, override in manifest["overrides"].items():
                 if lkey not in interfaces["lookups"]:
                     raise BuildError(MESSAGES["builder.override.error"].format(key=lkey))
                 interfaces["lookups"][lkey]["selectors"] = override["selectors"]

        # 4. Imports & Resolution
        initial_map = {}
        imports = manifest.get("imports", [])
        manifest_pkg = None # Manifests are user-land / global context usually

        for item in imports:
            if "lookup" in item:
                lkey = item["lookup"]
                l_def = resolve_lookup_by_key(lkey, manifest_pkg, interfaces)
                if not l_def:
                    raise BuildError(MESSAGES["builder.lookup.not_found"].format(key=lkey))
                
                ids = evaluate_lookup(library, l_def, interfaces)
                for aid in ids:
                    initial_map.setdefault(aid, set()).add(lkey)
            
            elif "query" in item:
                ids = select_atoms_by_query(library, item["query"])
                for aid in ids:
                    if aid not in initial_map:
                        initial_map[aid] = set()

        final_atom_map = resolve_dependencies(initial_map, library, interfaces)

        # 5. Kernel Injection
        kernel_ids = {k for k, v in library.items() if v["meta"]["type"] == "kernel"}
        if not kernel_ids:
            raise BuildError(MESSAGES["builder.kernel.missing"])
        for k_id in kernel_ids:
            if k_id not in final_atom_map:
                final_atom_map[k_id] = set()

        # 6. Serialzie
        return serialize_prompt(final_atom_map, library)