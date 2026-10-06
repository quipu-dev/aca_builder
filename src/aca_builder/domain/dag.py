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


def sort_atoms_canonically(atoms: list[Any]) -> list[Any]:
    """对原子列表执行规范基质拓扑排序：优先按 ACA 架构层级排序，同层级按原子 ID 稳定排序。"""

    def sort_key(atom: Any) -> tuple[int, str]:
        rank = get_canonical_atom_layer_rank(atom)
        aid = atom.get("id", "") if hasattr(atom, "get") else atom["id"]
        return rank, aid

    return sorted(atoms, key=sort_key)
