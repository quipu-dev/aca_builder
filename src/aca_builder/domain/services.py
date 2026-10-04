from __future__ import annotations

from typing import Any

from .events import BuildError

# --- Query and Resolution Logic (Pure Domain) ---


def select_atoms_by_query(library: dict[str, Any], query: dict[str, Any]) -> set[str]:
    selected_ids = set()
    for atom_id, atom in library.items():
        match = True
        for key, query_value in query.items():
            atom_value = atom["meta"].get(key)
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


def resolve_lookup_by_key(
    ref_key: str, context_pkg: str | None, interfaces: dict[str, Any]
) -> dict[str, Any] | None:
    """Resolves a lookup key checking visibility rules with hierarchical scoping."""
    exports_dict = interfaces.get("exports", {})
    internals_dict = interfaces.get("internals", {})
    lookups_dict = interfaces.get("lookups", {})

    if "::" in ref_key:
        parts = ref_key.split("::")
        pkg = parts[0]
        actual_name = parts[-1]

        # 1. 优先在公开导出表中查找
        if ref_key in exports_dict:
            return exports_dict[ref_key]

        # 2. 查找显式全限定私有键 pkg::internal::name
        if ref_key in lookups_dict:
            target = lookups_dict[ref_key]
            if target.get("visibility") == "private" and context_pkg != pkg:
                raise BuildError(
                    f"Access denied: '{actual_name}' in package '{pkg}' is private."
                )
            return target

        # 3. 如果是用 pkg::name 格式尝试访问私有实现
        pkg_internals = internals_dict.get(pkg, {})
        if actual_name in pkg_internals:
            target = pkg_internals[actual_name]
            if context_pkg != pkg:
                raise BuildError(
                    f"Access denied: '{actual_name}' in package '{pkg}' is private."
                )
            return target

        return None
    else:
        # 相对引用（短名称）
        # 1. 优先在当前包的私有实现表中查找 (支持同名 export -> ref: internal)
        if (
            context_pkg
            and context_pkg in internals_dict
            and ref_key in internals_dict[context_pkg]
        ):
            return internals_dict[context_pkg][ref_key]

        # 2. 查找全局无包归属的 lookup (Legacy)
        if ref_key in lookups_dict:
            return lookups_dict[ref_key]

        # 3. 检查当前包自身公开导出
        if context_pkg:
            scoped_export = f"{context_pkg}::{ref_key}"
            if scoped_export in exports_dict:
                return exports_dict[scoped_export]

        # 4. 容错回退：全局唯一公开导出匹配
        for k, item in exports_dict.items():
            if k.endswith(f"::{ref_key}"):
                return item

        return None


def evaluate_lookup(
    library: dict[str, Any],
    lookup_def: dict[str, Any],
    interfaces: dict[str, Any],
    visited: set[str] | None = None,
) -> set[str]:
    if visited is None:
        visited = set()

    results = set()
    selectors = lookup_def.get("selectors", [])
    pillar = lookup_def.get("pillar")

    for sel in selectors:
        if "query" in sel:
            query = dict(sel["query"])
            if pillar and "type" not in query:
                query["type"] = pillar
            matched = select_atoms_by_query(library, query)
            if pillar:
                matched = {
                    aid
                    for aid in matched
                    if library.get(aid, {}).get("meta", {}).get("type") == pillar
                }
            results.update(matched)

        if "ref" in sel:
            ref_key = sel["ref"]
            if ref_key in visited:
                raise BuildError(f"Circular reference detected: {visited} -> {ref_key}")

            # Resolve Ref
            target_lookup = resolve_lookup_by_key(
                ref_key, lookup_def.get("package"), interfaces
            )
            if not target_lookup:
                raise BuildError(f"Lookup reference '{ref_key}' not found.")

            new_visited = visited.copy()
            new_visited.add(ref_key)
            ref_results = evaluate_lookup(
                library, target_lookup, interfaces, new_visited
            )
            if pillar:
                ref_results = {
                    aid
                    for aid in ref_results
                    if library.get(aid, {}).get("meta", {}).get("type") == pillar
                }
            results.update(ref_results)

    return results


def resolve_dependencies(
    initial_map: dict[str, set[str]],
    library: dict[str, Any],
    interfaces: dict[str, Any],
) -> dict[str, set[str]]:
    final_deps = initial_map.copy()
    to_process = list(initial_map.keys())

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
                lookup_def = resolve_lookup_by_key(use_ref, current_pkg, interfaces)
                if not lookup_def:
                    raise BuildError(
                        f"Dependency Error: Lookup '{use_ref}' not found (referenced by {current_id})."
                    )

                triggered_ids = evaluate_lookup(library, lookup_def, interfaces)
                for tid in triggered_ids:
                    if tid not in final_deps:
                        final_deps[tid] = {use_ref}
                        to_process.append(tid)
                    else:
                        final_deps[tid].add(use_ref)
    return final_deps


def serialize_prompt(
    atom_lookup_map: dict[str, set[str]], library: dict[str, Any]
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
        lookup_str = f" (via: {', '.join(sorted(lookups))})" if lookups else ""

        if meta["type"] == "d3":
            priority = meta["priority"]
            header = f"======= {atom_id}-{atom_type}-P{priority}{lookup_str} ======="
        else:
            header = f"======= {atom_id}-{atom_type}{lookup_str} ======="

        prompt_parts.append(f"{header}\n{atom['content']}")

    return "\n---\n".join(prompt_parts) + "\n"


def generate_prompt_profile(
    atom_lookup_map: dict[str, set[str]], library: dict[str, Any]
) -> dict[str, Any]:
    """Generates structured context profiling metrics including tokens and pillar distributions."""
    final_ids = atom_lookup_map.keys()
    by_pillar = {"kernel": 0, "d1": 0, "d2": 0, "d3": 0}
    atoms_profile = []
    total_tokens = 0

    for atom_id in final_ids:
        atom = library.get(atom_id)
        if not atom:
            continue
        meta = atom["meta"]
        atom_type = str(meta.get("type", "unknown")).lower()
        content = atom.get("content", "")
        char_count = len(content)
        # Token estimation: approximately 3.8 chars per token
        tokens = max(1, round(char_count / 3.8))
        total_tokens += tokens
        if atom_type in by_pillar:
            by_pillar[atom_type] += tokens
        else:
            by_pillar[atom_type] = tokens

        lookups = sorted(atom_lookup_map.get(atom_id, set()))
        atoms_profile.append(
            {
                "id": atom_id,
                "type": atom_type,
                "priority": meta.get("priority"),
                "package": atom.get("package"),
                "source_file": atom.get("source_file"),
                "char_count": char_count,
                "estimated_tokens": tokens,
                "via_lookups": lookups,
            }
        )

    atoms_profile.sort(key=lambda x: x["estimated_tokens"], reverse=True)
    return {
        "total_tokens": total_tokens,
        "by_pillar": by_pillar,
        "atoms": atoms_profile,
    }


def generate_prompt_chunks(
    atom_lookup_map: dict[str, set[str]], library: dict[str, Any]
) -> list[dict[str, Any]]:
    """Generates ordered structured prompt chunks for block-based UI rendering."""
    final_ids = atom_lookup_map.keys()
    atoms_to_serialize = [
        library[atom_id] for atom_id in final_ids if atom_id in library
    ]

    def sort_key(atom):
        meta = atom["meta"]
        if meta.get("type") == "kernel":
            return (-1,)
        priority = meta.get("priority", 99)
        if meta.get("type") == "d3":
            if priority == 0:
                return (0,)
            if priority == 1:
                return (1,)
            if priority == 2:
                return (4,)
        elif meta.get("type") == "d1":
            return (2,)
        elif meta.get("type") == "d2":
            return (3,)
        return (99,)

    atoms_to_serialize.sort(key=sort_key)
    chunks = []

    for atom in atoms_to_serialize:
        meta = atom["meta"]
        atom_id = atom["id"]
        lookups = sorted(atom_lookup_map.get(atom_id, set()))
        chunks.append(
            {
                "id": atom_id,
                "type": meta.get("type", "unknown").lower(),
                "priority": meta.get("priority"),
                "package": atom.get("package"),
                "source_file": atom.get("source_file"),
                "meta": meta,
                "content": atom.get("content", "").strip(),
                "via_lookups": lookups,
            }
        )

    return chunks
