from pathlib import Path
import yaml
from typing import List, Dict, Optional, Any
from aca_builder.domain.ports import LibraryRepository, ManifestRepository
from aca_builder.domain.events import BuildError

class FSLibraryRepository(LibraryRepository):
    
    def _parse_atom(self, file_path: Path, package_name: Optional[str] = None) -> Dict[str, Any]:
        try:
            raw_content = file_path.read_text(encoding="utf-8")
            parts = raw_content.split("---", 2)
            if len(parts) < 3 or not parts[0].strip() == "":
                raise ValueError("Invalid YAML front matter format. Missing '---' separator.")

            meta_str = parts[1]
            content_str = parts[2]

            meta = yaml.safe_load(meta_str)
            if not isinstance(meta, dict) or "type" not in meta:
                raise ValueError("Atom missing required metadata 'type'.")

            if meta["type"] == "kernel":
                atom_id = "kernel"
            elif "id" not in meta:
                raise ValueError("Atom missing required metadata 'id'.")
            else:
                atom_id = meta["id"]

            return {
                "id": atom_id,
                "meta": meta,
                "content": content_str.strip(),
                "package": package_name,
                "source_file": str(file_path),
            }
        except Exception as e:
            from aca_builder.messages import MESSAGES
            raise BuildError(MESSAGES["system.parse_error"].format(path=file_path, error=e))

    def _find_package_config(self, path: Path, root: Path) -> Optional[Dict[str, Any]]:
        current = path
        while current >= root:
            pkg_file = current / "package.yaml"
            if pkg_file.is_file():
                try:
                    data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                    return data
                except Exception:
                    return None
            if current == root:
                break
            current = current.parent
        return None

    def load_library(self, library_paths: List[Path], fail_fast: bool = True, errors: Optional[List[str]] = None) -> Dict[str, Dict[str, Any]]:
        library = {}
        pkg_cache = {}

        for lib_root in library_paths:
            if not lib_root.exists():
                continue

            for file_path in lib_root.glob("**/*.md"):
                parent_dir = file_path.parent
                pkg_name = None
                
                if parent_dir in pkg_cache:
                    pkg_name = pkg_cache[parent_dir]
                else:
                    pkg_info = self._find_package_config(parent_dir, lib_root)
                    if pkg_info and "name" in pkg_info:
                        pkg_name = pkg_info["name"]
                    pkg_cache[parent_dir] = pkg_name

                try:
                    atom = self._parse_atom(file_path, pkg_name)
                    if atom["id"] in library:
                        from aca_builder.messages import MESSAGES
                        raise BuildError(MESSAGES["linter.atom.duplicate_id"].format(atom_id=atom["id"]))
                    library[atom["id"]] = atom
                except BuildError as e:
                    if fail_fast:
                        raise
                    if errors is not None:
                        errors.append(str(e))
                    continue
        return library

    def load_interfaces(self, library_paths: List[Path]) -> Dict[str, Any]:
        """Loads d4 files and package exports."""
        interfaces = {"lookups": {}}
        
        for lib_root in library_paths:
            if not lib_root.exists():
                continue

            # 1. Package Exports
            for pkg_file in lib_root.rglob("package.yaml"):
                try:
                    pkg_data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                    pkg_name = pkg_data.get("name")
                    if not pkg_name:
                        continue
                    
                    exports = pkg_data.get("exports", {})
                    for key, def_ in exports.items():
                        if key in interfaces["lookups"]:
                            raise BuildError(f"Duplicate lookup key '{key}' found in packages.")
                        
                        def_["package"] = pkg_name
                        def_["visibility"] = "public"
                        interfaces["lookups"][key] = def_
                except Exception:
                    continue
            
            # 2. D4 Internal Lookups
            for d4_file in lib_root.glob("**/d4/*.yaml"):
                try:
                    pkg_info = self._find_package_config(d4_file.parent, lib_root)
                    pkg_name = pkg_info["name"] if pkg_info else None
                    
                    data = yaml.safe_load(d4_file.read_text(encoding="utf-8"))
                    if isinstance(data, dict) and data.get("type") == "d4":
                        if "lookups" in data:
                            for key, lookup_def in data["lookups"].items():
                                if key in interfaces["lookups"]:
                                    continue
                                lookup_def["package"] = pkg_name
                                lookup_def["visibility"] = "private"
                                interfaces["lookups"][key] = lookup_def
                except Exception:
                    continue
                    
        return interfaces

class FSManifestRepository(ManifestRepository):
    
    def find_manifest(self, manifest_identifier: str, manifest_paths: List[Path]) -> Optional[Path]:
        path_obj = Path(manifest_identifier)
        if path_obj.exists() or path_obj.is_absolute():
             # It might be a file path, but interface expects logic name usually.
             # If caller passes file path as identifier for direct load, we support it potentially.
             if path_obj.is_file():
                 return path_obj
        
        # Search by logic name
        for base_path in manifest_paths:
            if not base_path.is_dir():
                continue
            potential_path = base_path / f"{manifest_identifier}.yaml"
            if potential_path.is_file():
                return potential_path
        return None

    def load_manifest(self, path: Path) -> Dict[str, Any]:
        try:
             return yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError as e:
            from aca_builder.messages import MESSAGES
            raise BuildError(MESSAGES["system.yaml_error"].format(name=path.name, error=e))
        except Exception as e:
            from aca_builder.messages import MESSAGES
            raise BuildError(MESSAGES["system.load_error"].format(path=path, error=e))

    def list_manifests(self, manifest_paths: List[Path]) -> List[str]:
        found = set()
        for base_path in manifest_paths:
            if not base_path.is_dir():
                continue
            for yaml_file in base_path.rglob("*.yaml"):
                relative = yaml_file.relative_to(base_path)
                found.add(str(relative.with_suffix("")))
        return sorted(list(found))