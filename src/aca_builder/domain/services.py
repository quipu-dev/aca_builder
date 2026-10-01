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
    """Resolves a lookup key checking visibility rules."""
    if "::" in ref_key:
        # Absolute reference 'pkg::name'.
        # First, check if it's a direct hit on a public (namespaced) key.
        public_target = interfaces["lookups"].get(ref_key)
        if public_target:
            return public_target

        # If not, it might be an attempt to access a private member.
        parts = ref_key.split("::", 1)
        if len(parts) != 2:
            return None
        pkg, name = parts

        private_target = interfaces["lookups"].get(name)
        if private_target and private_target.get("package") == pkg:
            # It's a valid member of the package. Now check visibility.
            if context_pkg != pkg and private_target.get("visibility") != "public":
                raise BuildError(
                    f"Access denied: '{name}' in package '{pkg}' is private."
                )
            return private_target
        return None  # No public or private match found
    else:
        # Relative reference
        target = interfaces["lookups"].get(ref_key)
        if not target:
            return None

        target_pkg = target.get("package")
        if target_pkg is None:
            return target  # Global/Legacy
        if context_pkg == target_pkg:
            return target  # Same package
        if target.get("visibility") == "public":
            return target  # Public API

        # Permissive for implicit relative access to private members of other packages.
        # This is for backward compatibility; strict linting should catch this.
        return target


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

    for sel in selectors:
        if "query" in sel:
            results.update(select_atoms_by_query(library, sel["query"]))

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
            results.update(
                evaluate_lookup(library, target_lookup, interfaces, new_visited)
            )

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
