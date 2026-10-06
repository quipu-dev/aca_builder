import pytest

from aca_builder.domain.dag import DependencyDAG, sort_atoms_canonically
from aca_builder.domain.events import BuildError


def test_dag_topological_sort_linear():
    dag = DependencyDAG()
    dag.add_node("d1-base")
    dag.add_node("d2-task", predecessors={"d1-base"})
    dag.add_node("d2-advanced", predecessors={"d2-task"})

    order = dag.topological_sort()
    assert order.index("d1-base") < order.index("d2-task")
    assert order.index("d2-task") < order.index("d2-advanced")


def test_dag_circular_dependency_detection():
    dag = DependencyDAG()
    dag.add_node("node-a", predecessors={"node-b"})
    dag.add_node("node-b", predecessors={"node-a"})

    with pytest.raises(BuildError) as exc:
        dag.topological_sort()
    assert "Circular dependency detected" in str(exc.value)


def test_canonical_atom_layer_sorting():
    atoms = [
        {"id": "d2-skill", "meta": {"type": "d2"}},
        {"id": "d3-p2-order", "meta": {"type": "d3", "priority": 2}},
        {"id": "kernel", "meta": {"type": "kernel"}},
        {"id": "d1-fact", "meta": {"type": "d1"}},
        {"id": "d3-p0-axiom", "meta": {"type": "d3", "priority": 0}},
        {"id": "d3-p1-rule", "meta": {"type": "d3", "priority": 1}},
    ]

    sorted_atoms = sort_atoms_canonically(atoms)
    sorted_ids = [a["id"] for a in sorted_atoms]

    # 验证严格符合 ACA 认知架构基质执行顺序:
    # Kernel (-1) -> D3 P0 (0) -> D3 P1 (1) -> D1 (2) -> D2 (3) -> D3 P2 (4)
    expected_order = [
        "kernel",
        "d3-p0-axiom",
        "d3-p1-rule",
        "d1-fact",
        "d2-skill",
        "d3-p2-order",
    ]
    assert sorted_ids == expected_order
