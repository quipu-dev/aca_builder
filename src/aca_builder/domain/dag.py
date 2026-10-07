from __future__ import annotations

from typing import Any

from graphlib import CycleError, TopologicalSorter

from aca_builder.domain.events import BuildError


class DependencyDAG:
    """标准有向无环图调度器 (DAG Scheduler)：基于 graphlib.TopologicalSorter 求解依赖与拓扑偏序。"""

    def __init__(self) -> None:
        self._graph: dict[str, set[str]] = {}

    def add_node(self, node: str, predecessors: set[str] | None = None) -> None:
        if node not in self._graph:
            self._graph[node] = set()
        if predecessors:
            self._graph[node].update(predecessors)

    def topological_sort(self) -> list[str]:
        sorter = TopologicalSorter(self._graph)
        try:
            return list(sorter.static_order())
        except CycleError as e:
            cycle = " -> ".join(e.args[1])
            raise BuildError(f"Circular dependency detected in graph: {cycle}")


def get_canonical_atom_layer_rank(atom: Any) -> int:
    """计算 ACA 基质架构的规范偏序层级：
    Kernel (-1) -> D3 P0 (0) -> D3 P1 (1) -> D1 (2) -> D2 (3) -> D3 P2 (4) -> 其他 (99)
    """
    meta = atom.get("meta", {}) if hasattr(atom, "get") else atom["meta"]
    atype = str(
        meta.get("type") if hasattr(meta, "get") else getattr(meta, "type", "")
    ).lower()

    if atype == "kernel":
        return -1

    priority = (
        meta.get("priority", 99)
        if hasattr(meta, "get")
        else getattr(meta, "priority", 99)
    )
    if atype == "d3":
        if priority == 0:
            return 0
        if priority == 1:
            return 1
        if priority == 2:
            return 4
    elif atype == "d1":
        return 2
    elif atype == "d2":
        return 3

    return 99


import heapq
from collections import defaultdict


def sort_atoms_canonically(atoms: list[Any]) -> list[Any]:
    """
    对原子列表执行规范基质拓扑排序：
    1. 宏观架构偏序：Kernel (-1) -> D3 P0 (0) -> D3 P1 (1) -> D1 (2) -> D2 (3) -> D3 P2 (4) -> 其他 (99)
    2. 层内因果偏序：基于 'after' 声明构建有向边，通过 Kahn 算法线性化，以原子 ID 字典序作为唯一平局仲裁 (Tie-Breaker)。
    3. 严格环检测：若同层内存在因果循环偏序，阻断编译并抛出清晰的 BuildError。
    """
    if not atoms:
        return []

    # 1. 宏观层级桶划分
    layer_buckets: dict[int, list[Any]] = defaultdict(list)
    for atom in atoms:
        rank = get_canonical_atom_layer_rank(atom)
        layer_buckets[rank].append(atom)

    final_sorted_atoms: list[Any] = []

    # 2. 依次遍历每个宏观层级，在同层内执行 Kahn 算法拓扑排序
    for rank in sorted(layer_buckets.keys()):
        layer_atoms = layer_buckets[rank]

        # 映射 aid -> atom 实体
        atom_map = {
            (a.get("id") if hasattr(a, "get") else a["id"]): a for a in layer_atoms
        }

        in_degree: dict[str, int] = {aid: 0 for aid in atom_map}
        adj: dict[str, list[str]] = {aid: [] for aid in atom_map}

        # 提取同层内 after 有向依赖边 (u in after of v => u -> v)
        for aid, atom in atom_map.items():
            meta = atom.get("meta", {}) if hasattr(atom, "get") else atom["meta"]
            after_refs = (
                meta.get("after", [])
                if hasattr(meta, "get")
                else getattr(meta, "after", [])
            )
            if not isinstance(after_refs, list):
                after_refs = []

            for pred_id in after_refs:
                # 仅当前驱同在当前层闭包中且非自环时建立因果依赖
                if pred_id in atom_map and pred_id != aid:
                    adj[pred_id].append(aid)
                    in_degree[aid] += 1

        # 初始化就绪最小堆 (保证字典序 Tie-Breaking)
        ready_heap = [aid for aid, deg in in_degree.items() if deg == 0]
        heapq.heapify(ready_heap)

        ordered_layer: list[Any] = []
        while ready_heap:
            curr_id = heapq.heappop(ready_heap)
            ordered_layer.append(atom_map[curr_id])

            for successor in adj[curr_id]:
                in_degree[successor] -= 1
                if in_degree[successor] == 0:
                    heapq.heappush(ready_heap, successor)

        # 环检测
        if len(ordered_layer) < len(layer_atoms):
            cycle_nodes = sorted(
                set(atom_map.keys())
                - {
                    (a.get("id") if hasattr(a, "get") else a["id"])
                    for a in ordered_layer
                }
            )
            raise BuildError(
                f"Causal ordering cycle detected in layer rank {rank}: {cycle_nodes}"
            )

        final_sorted_atoms.extend(ordered_layer)

    return final_sorted_atoms
