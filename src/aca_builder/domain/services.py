from __future__ import annotations

import copy
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
    """
    基于两级分层作用域的符号解析器 (Symbol Resolver)：
    1. 包含 '::' 的全限定引用 -> 跨包作用域：
       - 优先直查 exports 导出表；
       - 若为显式私有访问（pkg::internal::name 或 pkg::name 私有符号），严格做跨包权限校验；
    2. 无 '::' 的短名称引用 -> 局部作用域：
       - 严格优先匹配当前包的 internals 内部私有实现 (支持同名 Facade 代理)；
       - 若包内私有无定义，检查当前包自身的 exports 导出表；
       - 若无包上下文，匹配全局 legacy 遗留表；
       - 彻底杜绝跨包同名短名的模糊猜测。
    """
    exports_dict = interfaces.get("exports", {})
    internals_dict = interfaces.get("internals", {})
    legacy_dict = interfaces.get("legacy", {})

    if "::" in ref_key:
        parts = ref_key.split("::")
        pkg = parts[0]
        actual_name = parts[-1]

        # 1. 优先在公开导出表中直查
        if ref_key in exports_dict:
            return exports_dict[ref_key]

        # 2. 检查当前包私有符号表（支持显式 internal 路径或跨包私有访问拦截）
        pkg_internals = internals_dict.get(pkg, {})
        if actual_name in pkg_internals:
            target = pkg_internals[actual_name]
            if context_pkg != pkg and target.get("visibility") == "private":
                raise BuildError(
                    f"Access denied: '{actual_name}' in package '{pkg}' is private."
                )
            return target

        return None
    else:
        # 短名称局部寻址
        # 1. 优先命中当前包上下文内部私有实现（同名 Re-export 场景的核心保证）
        if (
            context_pkg
            and context_pkg in internals_dict
            and ref_key in internals_dict[context_pkg]
        ):
            return internals_dict[context_pkg][ref_key]

        # 2. 检查当前包自身的公开导出（自包递归或自包代理）
        if context_pkg:
            scoped_export = f"{context_pkg}::{ref_key}"
            if scoped_export in exports_dict:
                return exports_dict[scoped_export]

        # 3. 遗留全局无包符号查验
        if ref_key in legacy_dict:
            return legacy_dict[ref_key]

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


def compile_prompt_closure(
    library: dict[str, Any],
    interfaces: dict[str, Any],
    imports: list[dict[str, Any]] | None = None,
    direct_lookup: tuple[str, dict[str, Any]] | None = None,
    overrides: dict[str, Any] | None = None,
    include_kernel: bool = True,
) -> tuple[dict[str, set[str]], str]:
    """
    通用纯领域编译流水线：
    1. 应用 overrides (深拷贝避免污染运行时接口表)
    2. 计算直接命中映射 (direct_lookup 或 imports)
    3. 传递依赖闭包演算
    4. 单例 Kernel 自动注入或排除
    5. 严格语义排序与序列化
    返回: (final_atom_map, prompt_text)
    """
    if not library:
        from aca_builder.messages import MESSAGES

        raise BuildError(MESSAGES["builder.library.empty"])

    # 1. 隔离应用 overrides
    if overrides:
        interfaces = copy.deepcopy(interfaces)
        for lkey, override in overrides.items():
            if lkey not in interfaces.get("lookups", {}):
                from aca_builder.messages import MESSAGES

                raise BuildError(MESSAGES["builder.override.error"].format(key=lkey))
            interfaces["lookups"][lkey]["selectors"] = override.get("selectors", [])

    # 2. 初始命中收集
    initial_map: dict[str, set[str]] = {}

    if direct_lookup:
        lkey, ldef = direct_lookup
        ids = evaluate_lookup(library, ldef, interfaces)
        for aid in ids:
            initial_map.setdefault(aid, set()).add(lkey)
    elif imports:
        for item in imports:
            if "lookup" in item:
                lkey = item["lookup"]
                ldef = resolve_lookup_by_key(lkey, None, interfaces)
                if not ldef:
                    from aca_builder.messages import MESSAGES

                    raise BuildError(
                        MESSAGES["builder.lookup.not_found"].format(key=lkey)
                    )
                ids = evaluate_lookup(library, ldef, interfaces)
                for aid in ids:
                    initial_map.setdefault(aid, set()).add(lkey)
            elif "query" in item:
                ids = select_atoms_by_query(library, item["query"])
                for aid in ids:
                    if aid not in initial_map:
                        initial_map[aid] = set()

    # 3. 依赖闭包求解
    final_atom_map = resolve_dependencies(initial_map, library, interfaces)

    # 4. 单例 Kernel 注入
    if include_kernel:
        kernel_ids = {
            k for k, v in library.items() if v.get("meta", {}).get("type") == "kernel"
        }
        if not kernel_ids:
            from aca_builder.messages import MESSAGES

            raise BuildError(MESSAGES["builder.kernel.missing"])
        for k_id in kernel_ids:
            if k_id not in final_atom_map:
                final_atom_map[k_id] = set()
    else:
        final_atom_map = {
            k: v
            for k, v in final_atom_map.items()
            if library.get(k, {}).get("meta", {}).get("type") != "kernel"
        }

    # 5. 序列化
    prompt_text = serialize_prompt(final_atom_map, library)
    return final_atom_map, prompt_text
