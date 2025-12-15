# aca_builder/core.py

from pathlib import Path
import yaml
from typing import List, Dict, Any, Set, Optional

from .exceptions import BuildError

# --- Data Structures ---
# Atom: { "id": str, "content": str, "meta": dict, "package": Optional[str] }
# Lookup: { "key": str, "pillar": str, "selectors": list, "package": Optional[str], "visibility": "public"|"private" }


def parse_atom(file_path: Path, package_name: Optional[str] = None) -> Dict[str, Any]:
    """
    解析原子文件，分离元数据和内容，并注入包信息。
    """
    try:
        raw_content = file_path.read_text(encoding="utf-8")
        parts = raw_content.split("---", 2)
        if len(parts) < 3 or not parts[0].strip() == "":
            raise ValueError(
                "Invalid YAML front matter format. Missing '---' separator."
            )

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
        }
    except Exception as e:
        raise BuildError(f"Failed to parse atom {file_path}: {e}")


def _find_package_config(path: Path, root: Path) -> Optional[Dict[str, Any]]:
    """
    从当前目录向上查找 package.yaml，直到 root。
    返回解析后的 package info (name, version, etc.) 或者 None。
    """
    current = path
    while current >= root:  # Ensure we don't traverse above library root
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


def load_library(
    library_paths: List[Path],
    errors: Optional[List[str]] = None,
    fail_fast: bool = True,
) -> Dict[str, Dict[str, Any]]:
    """
    加载所有指定库路径的组件到内存中。
    自动检测 package.yaml 并注入包名。
    - if fail_fast=True (default), re-raises the first BuildError encountered.
    - if fail_fast=False, appends errors to the 'errors' list and continues.
    """
    library = {}

    # Cache package info per directory to avoid repeated IO
    # path -> package_name (or None)
    pkg_cache = {}

    for lib_root in library_paths:
        if not lib_root.exists():
            continue

        # We walk top-down to easily identify packages
        for file_path in lib_root.glob("**/*.md"):
            parent_dir = file_path.parent

            # Resolve package name
            pkg_name = None
            if parent_dir in pkg_cache:
                pkg_name = pkg_cache[parent_dir]
            else:
                # Find package.yaml relative to this file
                pkg_info = _find_package_config(parent_dir, lib_root)
                if pkg_info and "name" in pkg_info:
                    pkg_name = pkg_info["name"]
                pkg_cache[parent_dir] = pkg_name

            try:
                atom = parse_atom(file_path, pkg_name)
                if atom["id"] in library:
                    # Duplicate ID check is global for now, but namespaces might allow duplicates in future.
                    # Current spec implies global uniqueness is still good practice or strict requirement
                    # unless fully namespaced. For migration safety, we warn/fail on duplicates.
                    raise BuildError(f"Duplicate atom ID '{atom['id']}' found.")
                library[atom["id"]] = atom
            except BuildError as e:
                if fail_fast:
                    raise
                if errors is not None:
                    errors.append(str(e))
                continue

    return library


def load_interfaces(library_paths: List[Path]) -> Dict[str, Any]:
    """
    加载所有接口定义：
    1. package.yaml 中的 'exports' (Public)
    2. d4/*.yaml 中的 'lookups' (Private)
    """
    interfaces = {"lookups": {}}

    for lib_root in library_paths:
        if not lib_root.exists():
            continue

        # 1. Load Package Exports (Public)
        # We look for all package.yaml files
        for pkg_file in lib_root.rglob("package.yaml"):
            try:
                pkg_data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                pkg_name = pkg_data.get("name")
                if not pkg_name:
                    continue

                exports = pkg_data.get("exports", {})
                for key, def_ in exports.items():
                    # Public Interface
                    # Store with explicit visibility
                    if key in interfaces["lookups"]:
                        # Warning or Error? Name collision in interfaces
                        raise BuildError(
                            f"Duplicate lookup key '{key}' found in packages."
                        )

                    def_["package"] = pkg_name
                    def_["visibility"] = "public"
                    interfaces["lookups"][key] = def_

            except Exception:
                continue

        # 2. Load D4 Internal Lookups (Private)
        for d4_file in lib_root.glob("**/d4/*.yaml"):
            try:
                # Try to determine which package this d4 file belongs to
                pkg_info = _find_package_config(d4_file.parent, lib_root)
                pkg_name = pkg_info["name"] if pkg_info else None

                data = yaml.safe_load(d4_file.read_text(encoding="utf-8"))
                if isinstance(data, dict) and data.get("type") == "d4":
                    if "lookups" in data:
                        for key, lookup_def in data["lookups"].items():
                            # Skip if already loaded (e.g. via export, though export usually references, not defines)
                            # But if defined in both, package.yaml takes precedence or we error.
                            if key in interfaces["lookups"]:
                                continue

                            lookup_def["package"] = pkg_name
                            lookup_def["visibility"] = "private"
                            interfaces["lookups"][key] = lookup_def
            except Exception:
                continue

    return interfaces


def select_atoms_by_query(library: Dict[str, Any], query: Dict[str, Any]) -> Set[str]:
    """
    基础原子选择逻辑：根据 metadata 查询。
    """
    selected_ids = set()
    for atom_id, atom in library.items():
        match = True
        for key, query_value in query.items():
            atom_value = atom["meta"].get(key)

            # Special handling for 'package' meta if queries use it
            if key == "package":
                atom_value = atom.get("package")

            if isinstance(query_value, list) and isinstance(atom_value, list):
                required = {
                    v
                    for v in query_value
                    if isinstance(v, str) and not v.startswith("-")
                }
                excluded = {
                    v[1:]
                    for v in query_value
                    if isinstance(v, str) and v.startswith("-")
                }
                atom_set = set(atom_value)
                if not required.issubset(atom_set):
                    match = False
                    break
                if not excluded.isdisjoint(atom_set):
                    match = False
                    break
            else:
                if atom_value != query_value:
                    match = False
                    break
        if match:
            selected_ids.add(atom_id)
    return selected_ids


def evaluate_lookup(
    library: Dict[str, Any],
    lookup_def: Dict[str, Any],
    interfaces: Dict[str, Any],
    visited: Optional[Set[str]] = None,
) -> Set[str]:
    """
    递归评估 Lookup。支持 'query' 和 'ref'。
    """
    if visited is None:
        visited = set()

    results = set()
    selectors = lookup_def.get("selectors", [])

    # Identify this lookup (for cycle detection) - we need a unique handle.
    # Since lookup_def is a dict, we can't hash it.
    # We rely on the caller or context to detect cycles via keys if possible.
    # But here we only have the def.
    # NOTE: To strictly detect cycles in "ref", we need to pass the REF KEY, not just def.
    # For now, we assume simple acyclic structure or handle depth limit if needed.
    # Better: The 'ref' handling below does the recursion.

    for sel in selectors:
        if "query" in sel:
            results.update(select_atoms_by_query(library, sel["query"]))

        if "ref" in sel:
            ref_key = sel["ref"]

            # Prevent cycles
            if ref_key in visited:
                raise BuildError(
                    f"Circular reference detected in lookups: {visited} -> {ref_key}"
                )

            # Resolve Ref
            target_lookup = _resolve_lookup_by_key(
                ref_key, lookup_def.get("package"), interfaces
            )
            if not target_lookup:
                raise BuildError(f"Lookup reference '{ref_key}' not found.")

            # Recurse
            new_visited = visited.copy()
            new_visited.add(ref_key)

            results.update(
                evaluate_lookup(library, target_lookup, interfaces, new_visited)
            )

    return results


def _resolve_lookup_by_key(
    ref_key: str, context_pkg: Optional[str], interfaces: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """
    解析 Lookup Key，处理命名空间和可见性。
    Syntax:
      - "pkg::name": Absolute reference.
      - "name": Relative (context_pkg) then Global fallback.
    """
    if "::" in ref_key:
        # Absolute reference
        pkg, name = ref_key.split("::", 1)
        # Find explicit match
        # We need to scan interfaces to find one with package==pkg and key==name
        # BUT interfaces["lookups"] is flattened by KEY.
        # Naming convention: The key in interfaces dict usually includes prefix but not namespace "::".
        # Currently, keys in `load_interfaces` are just the keys defined in yaml (e.g. d1l-profile).
        # We have to handle potential key collisions if multiple packages define 'd1l-profile'.
        # CURRENT IMPLEMENTATION constraint: Keys in interfaces["lookups"] must be unique globally
        # OR we need to change data structure to interfaces["lookups"][pkg][key].
        #
        # OPTION: Flat dictionary with unique keys is assumed for legacy.
        # With packages, 'd1l-profile' might appear in 'common' and 'fhrsk'.
        # `load_interfaces` currently errors on duplicate keys.
        # For this Phase 1, we assume KEYS ARE STILL UNIQUE GLOBALLY to ensure migration safety.
        # But we check package attribute.

        target = interfaces["lookups"].get(name)
        if target and target.get("package") == pkg:
            # Check visibility?
            # If context_pkg != pkg, target must be public.
            if context_pkg != pkg and target.get("visibility") != "public":
                raise BuildError(
                    f"Access denied: '{name}' in package '{pkg}' is private."
                )
            return target
        return None

    else:
        # Relative / Global reference
        target = interfaces["lookups"].get(ref_key)
        if not target:
            return None

        target_pkg = target.get("package")

        # 1. If target has no package (legacy global), allow.
        if target_pkg is None:
            return target

        # 2. If target is in same package, allow.
        if context_pkg == target_pkg:
            return target

        # 3. If target is in different package, must be public.
        if target.get("visibility") == "public":
            return target

        # Implicitly trying to access private member of another package
        # Warning: For backward compatibility during migration, we might allow this but warn.
        # For Strict Mode:
        # raise BuildError(f"Access denied: '{ref_key}' is private to package '{target_pkg}'.")
        return target  # Permissive for migration phase


def apply_overrides(interfaces: Dict[str, Any], overrides: Dict[str, Any]) -> None:
    for lookup_key, override_def in overrides.items():
        if lookup_key not in interfaces["lookups"]:
            raise BuildError(
                f"Manifest Override Error: Lookup '{lookup_key}' does not exist."
            )
        interfaces["lookups"][lookup_key]["selectors"] = override_def["selectors"]


def resolve_dependencies(
    initial_map: Dict[str, Set[str]],
    library: Dict[str, Any],
    interfaces: Dict[str, Any],
) -> Dict[str, Set[str]]:
    """
    递归解析依赖。
    """
    final_deps = initial_map.copy()
    to_process = list(initial_map.keys())

    # Set of (atom_id, lookup_key) to prevent infinite loops in dependency resolution
    # Though atoms don't usually cycle back via Lookups unless logic is circular.

    while to_process:
        current_id = to_process.pop(0)
        atom = library.get(current_id)
        if not atom:
            continue

        meta = atom["meta"]
        current_pkg = atom.get("package")

        if meta["type"] == "d2":
            uses = meta.get("uses", [])
            for use_ref in uses:
                # use_ref could be "d1l-foo" or "common::d1l-foo"
                lookup_def = _resolve_lookup_by_key(use_ref, current_pkg, interfaces)

                if not lookup_def:
                    raise BuildError(
                        f"Dependency Error: Lookup '{use_ref}' not found (referenced by {current_id})."
                    )

                # Recursively evaluate the lookup (handling refs inside it)
                triggered_ids = evaluate_lookup(library, lookup_def, interfaces)

                for tid in triggered_ids:
                    if tid not in final_deps:
                        final_deps[tid] = {use_ref}
                        to_process.append(tid)
                    else:
                        final_deps[tid].add(use_ref)

    return final_deps


def serialize_prompt(
    atom_lookup_map: Dict[str, Set[str]], library: Dict[str, Any]
) -> str:
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
        return (99,)

    atoms_to_serialize.sort(key=sort_key)

    prompt_parts = []
    for atom in atoms_to_serialize:
        meta = atom["meta"]
        atom_id = atom["id"]
        atom_type = meta["type"].upper()

        lookups = atom_lookup_map.get(atom_id, set())
        # Clean up lookup names for display? maybe remove package prefix if too long?
        # For now keep full key.
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
