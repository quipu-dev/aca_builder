# aca_builder/core.py

from pathlib import Path
import yaml
from typing import List, Dict, Any, Set

from .exceptions import BuildError

def apply_overrides(interfaces: Dict[str, Any], overrides: Dict[str, Any]) -> None:
    """
    Applies overrides from the manifest to the loaded interfaces in-memory.
    Allows changing the selectors of a lookup dynamically per build.
    """
    for lookup_key, override_def in overrides.items():
        if lookup_key not in interfaces["lookups"]:
            # Optional: Warning could be logged here, but for now we skip or strict fail.
            # We choose to verify existence to prevent typo bugs in manifest.
            raise BuildError(f"Manifest Override Error: Lookup '{lookup_key}' does not exist in the library interfaces.")
        
        target_lookup = interfaces["lookups"][lookup_key]
        
        # Override selectors if provided
        if "selectors" in override_def:
            target_lookup["selectors"] = override_def["selectors"]
            # Mark as overridden for debugging visibility if needed
            target_lookup["_overridden"] = True

def parse_atom(file_path: Path, library_path: Path) -> Dict[str, Any]:
    """解析原子文件，分离元数据和内容。"""
    try:
        raw_content = file_path.read_text(encoding="utf-8")
        parts = raw_content.split("---", 2)
        if len(parts) < 3 or not parts[0].strip() == "":
            raise ValueError(
                "Invalid YAML front matter format. Missing '---' separator."
            )

        meta_str = parts[1]
        content_str = parts[2]

        # The content is now the raw string from the atom file, with no inclusion logic.
        processed_content = content_str

        meta = yaml.safe_load(meta_str)
        if not isinstance(meta, dict) or "type" not in meta:
            raise ValueError("Atom missing required metadata 'type'.")

        if meta["type"] == "kernel":
            atom_id = "kernel"
        elif "id" not in meta:
            raise ValueError("Atom missing required metadata 'id'.")
        else:
            atom_id = meta["id"]

        return {"meta": meta, "content": processed_content.strip(), "id": atom_id}
    except Exception as e:
        raise BuildError(f"Failed to parse atom {file_path}: {e}")


def load_library(library_paths: List[Path]) -> Dict[str, Dict[str, Any]]:
    """加载所有指定库路径的组件到内存中，以 ID 为键。"""
    library = {}
    for lib_path in library_paths:
        if not lib_path.exists():
            continue
        for file_path in lib_path.glob("**/*.md"):
            try:
                # Pass the specific lib_path for relative path calculations if needed
                atom = parse_atom(file_path, lib_path)
                if atom["id"] in library:
                    raise BuildError(f"Duplicate atom ID '{atom['id']}' found across libraries.")
                library[atom["id"]] = atom
            except BuildError:
                # For `build`, we silently ignore files that are not valid atoms.
                continue
    return library


def load_interfaces(library_paths: List[Path]) -> Dict[str, Any]:
    """从所有指定的库路径加载 D4 接口定义。"""
    interfaces = {"lookups": {}}
    for lib_path in library_paths:
        if not lib_path.exists():
            continue
        for file_path in lib_path.glob("**/*.yaml"):
            try:
                data = yaml.safe_load(file_path.read_text(encoding="utf-8"))
                if isinstance(data, dict) and data.get("type") == "d4":
                    if "lookups" in data:
                        for key, lookup_def in data["lookups"].items():
                            # Validate Naming Convention
                            pillar = lookup_def.get("pillar")
                            if pillar not in ["d1", "d2", "d3"]:
                                raise BuildError(
                                    f"D4 Error in '{file_path.name}': Lookup '{key}' has invalid pillar '{pillar}'. Must be d1, d2, or d3."
                                )
                            
                            expected_prefix = f"{pillar}l-"
                            if not key.startswith(expected_prefix):
                                raise BuildError(
                                    f"D4 Error in '{file_path.name}': Lookup '{key}' for pillar '{pillar}' must start with '{expected_prefix}'."
                                )
                            
                            if key in interfaces["lookups"]:
                                raise BuildError(f"Duplicate lookup key '{key}' found across D4 interface files.")

                            interfaces["lookups"][key] = lookup_def
            except (yaml.YAMLError, BuildError) as e:
                # Raise build errors, but ignore malformed yaml
                if isinstance(e, BuildError):
                    raise e
                continue
    return interfaces


def select_atoms(library: Dict[str, Any], query: Dict[str, Any]) -> Set[str]:
    """根据查询选择原子 ID，特殊处理 domain 字段为 AND 逻辑。"""
    selected_ids = set()
    for atom_id, atom in library.items():
        match = True
        for key, query_value in query.items():
            atom_value = atom["meta"].get(key)

            # 通用处理列表类型的字段 (如 domain, tags)
            if isinstance(query_value, list) and isinstance(atom_value, list):
                # 解析查询: 分离必须包含的项和必须排除的项
                required = {v for v in query_value if isinstance(v, str) and not v.startswith("-")}
                excluded = {v[1:] for v in query_value if isinstance(v, str) and v.startswith("-")}
                
                atom_set = set(atom_value)

                # 1. 检查必须包含项 (AND 逻辑)
                if not required.issubset(atom_set):
                    match = False
                    break
                
                # 2. 检查必须排除项 (NOT 逻辑)
                # 如果交集不为空，说明包含被排除的项，匹配失败
                if not excluded.isdisjoint(atom_set):
                    match = False
                    break

            # 其他情况使用标准等值比较
            else:
                if atom_value != query_value:
                    match = False
                    break

        if match:
            selected_ids.add(atom_id)
    return selected_ids


def resolve_dependencies(
    initial_map: Dict[str, Set[str]], library: Dict[str, Any], interfaces: Dict[str, Any]
) -> Dict[str, Set[str]]:
    """递归解析所有依赖项，并追踪 lookup 来源。"""
    # atom_id -> set(triggering_lookups)
    final_deps = initial_map.copy()
    to_process = list(initial_map.keys())

    while to_process:
        current_id = to_process.pop(0)
        atom = library.get(current_id)
        if not atom:
            continue

        meta = atom["meta"]

        # 仅 D2 组件能触发 lookup 依赖
        if meta["type"] == "d2":
            for lookup_key in meta.get("uses", []):
                if lookup_key not in interfaces["lookups"]:
                    raise BuildError(
                        f"Dependency Error: Lookup '{lookup_key}' not found (referenced by {current_id})."
                    )
                
                lookup_def = interfaces["lookups"][lookup_key]
                for selector in lookup_def["selectors"]:
                    triggered_ids = select_atoms(library, selector["query"])
                    for tid in triggered_ids:
                        # 记录来源
                        if tid not in final_deps:
                            final_deps[tid] = {lookup_key}
                            to_process.append(tid)
                        else:
                            final_deps[tid].add(lookup_key)

    return final_deps


def serialize_prompt(atom_lookup_map: Dict[str, Set[str]], library: Dict[str, Any]) -> str:
    """根据 ACA 规范排序并拼接原子内容，并为每个部分添加标识头，包含来源信息。"""
    final_ids = atom_lookup_map.keys()
    atoms_to_serialize = [library[atom_id] for atom_id in final_ids]

    def sort_key(atom):
        meta = atom["meta"]
        if meta["type"] == "kernel":
            return (-1,)

        priority = meta.get("priority", 99)

        if meta["type"] == "d3":
            if priority == 0:
                return (0,)
            if priority == 1:
                return (1,)
            if priority == 2:
                return (4,)
        elif meta["type"] == "d1":
            return (2,)
        elif meta["type"] == "d2":
            return (3,)
        return (99,)  # Should not happen

    atoms_to_serialize.sort(key=sort_key)

    prompt_parts = []
    for atom in atoms_to_serialize:
        meta = atom["meta"]
        atom_id = atom["id"]
        atom_type = meta["type"].upper()
        
        # 获取该原子的来源 lookups
        lookups = atom_lookup_map.get(atom_id, set())
        lookup_str = f" (via: {', '.join(sorted(lookups))})" if lookups else ""

        if meta["type"] == "d3":
            priority = meta["priority"]
            header = f"======= {atom_id}-{atom_type}-P{priority}{lookup_str} ======="
        else:
            header = f"======= {atom_id}-{atom_type}{lookup_str} ======="

        content = atom["content"]
        full_part = f"{header}\n{content}"
        prompt_parts.append(full_part)

    return "\n---\n".join(prompt_parts) + "\n"