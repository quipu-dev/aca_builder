from __future__ import annotations

from typing import Any

from aca_builder.domain.events import BuildError


def compute_max_dependency_depth(
    seed_ids: set[str],
    final_atom_map: dict[str, set[str]],
    library: dict[str, Any],
) -> int:
    """计算从初始种子原子出发的最长依赖拓扑路径深度。"""
    active_ids = set(final_atom_map.keys()) & set(library.keys())

    # 构建闭包内原子的前向依赖有向边
    adj: dict[str, set[str]] = {aid: set() for aid in active_ids}
    for aid in active_ids:
        atom = library[aid]
        meta = atom.get("meta", {}) if hasattr(atom, "get") else atom["meta"]
        uses = (
            meta.get("uses", []) if hasattr(meta, "get") else getattr(meta, "uses", [])
        )
        requires = (
            meta.get("requires", {})
            if hasattr(meta, "get")
            else getattr(meta, "requires", {})
        )
        all_refs = list(uses)
        if isinstance(requires, dict):
            all_refs.extend(requires.values())

        for ref in all_refs:
            # 若直接指向具体原子 ID
            if ref in active_ids:
                adj[aid].add(ref)
            else:
                # 凡是通过该 lookup 引入的下游原子均视作依赖边
                for target_aid, via_lookups in final_atom_map.items():
                    if ref in via_lookups and target_aid in active_ids:
                        adj[aid].add(target_aid)

    # 记忆化 DFS 求解最长路径
    memo: dict[str, int] = {}
    visiting: set[str] = set()

    def dfs(curr: str) -> int:
        if curr in memo:
            return memo[curr]
        if curr in visiting:
            return 0  # 遇环防爆保护

        visiting.add(curr)
        max_child = 0
        for succ in adj.get(curr, set()):
            if succ != curr:
                max_child = max(max_child, 1 + dfs(succ))

        visiting.remove(curr)
        memo[curr] = max_child
        return max_child

    entry_seeds = seed_ids & active_ids
    if not entry_seeds:
        entry_seeds = active_ids

    longest_path = 0
    for root in entry_seeds:
        longest_path = max(longest_path, dfs(root))

    return longest_path


def validate_invariants(
    final_atom_map: dict[str, set[str]],
    library: dict[str, Any],
    invariants: dict[str, Any] | None,
    seed_atom_ids: set[str] | None = None,
) -> None:
    """离散架构断言守卫：纯集合论与 DAG 遍历，运行时开销 < 2ms。"""
    if not invariants or not isinstance(invariants, dict):
        return

    active_atoms = [library[aid] for aid in final_atom_map if aid in library]

    # 1. 收集闭包原子标签全集与标签所有者映射
    tag_to_atoms: dict[str, list[str]] = {}
    all_closure_tags: set[str] = set()

    for atom in active_atoms:
        aid = atom.get("id") if hasattr(atom, "get") else atom["id"]
        meta = atom.get("meta", {}) if hasattr(atom, "get") else atom["meta"]
        tags = (
            meta.get("tags", []) if hasattr(meta, "get") else getattr(meta, "tags", [])
        )
        if not isinstance(tags, list):
            tags = [tags]

        for t in tags:
            tag_str = str(t)
            all_closure_tags.add(tag_str)
            tag_to_atoms.setdefault(tag_str, []).append(aid)

    # 2. 禁忌标签守卫 (forbidden_tags)
    forbidden_tags = invariants.get("forbidden_tags", [])
    if isinstance(forbidden_tags, list):
        for f_tag in forbidden_tags:
            if f_tag in all_closure_tags:
                violators = tag_to_atoms.get(f_tag, [])
                raise BuildError(
                    f"Invariant Violation: Forbidden tag '{f_tag}' detected in compiled closure. "
                    f"Violating atoms: {violators}"
                )

    # 3. 标签互斥守卫 (exclusive_tags)
    exclusive_groups = invariants.get("exclusive_tags", [])
    if isinstance(exclusive_groups, list):
        for group in exclusive_groups:
            if isinstance(group, list):
                colliding = [t for t in group if t in all_closure_tags]
                if len(colliding) > 1:
                    evidence = {t: tag_to_atoms.get(t, []) for t in colliding}
                    raise BuildError(
                        f"Invariant Violation: Mutually exclusive tags {colliding} co-exist in closure. "
                        f"Source atoms: {evidence}"
                    )

    # 4. 依赖深度上限守卫 (max_graph_depth)
    max_depth_limit = invariants.get("max_graph_depth")
    if isinstance(max_depth_limit, int) and max_depth_limit >= 0:
        actual_depth = compute_max_dependency_depth(
            seed_ids=seed_atom_ids or set(),
            final_atom_map=final_atom_map,
            library=library,
        )
        if actual_depth > max_depth_limit:
            raise BuildError(
                f"Invariant Violation: Maximum dependency depth exceeded. "
                f"Limit: {max_depth_limit}, Actual: {actual_depth}"
            )
