import pytest

from aca_builder.domain.dag import sort_atoms_canonically
from aca_builder.domain.events import BuildError


def test_topological_sort_respects_after_ordering():
    """验证同层内使用 after 声明的因果偏序能够被精确排布（覆盖原本的字典序）。"""
    # 按照字典序，d2-b 会排在 d2-c 前面；但声明 d2-b after d2-c 后，必须调整顺序
    atoms = [
        {"id": "d2-b", "meta": {"type": "d2", "after": ["d2-c"]}},
        {"id": "d2-a", "meta": {"type": "d2"}},
        {"id": "d2-c", "meta": {"type": "d2", "after": ["d2-a"]}},
    ]

    sorted_atoms = sort_atoms_canonically(atoms)
    sorted_ids = [a["id"] for a in sorted_atoms]

    # 正确偏序: d2-a -> d2-c -> d2-b
    assert sorted_ids == ["d2-a", "d2-c", "d2-b"]


def test_topological_sort_deterministic_tie_breaking():
    """验证当节点无依赖冲突时，以 ID 字典序作为唯一的稳定 Tie-Breaker。"""
    atoms = [
        {"id": "d1-zebra", "meta": {"type": "d1"}},
        {"id": "d1-apple", "meta": {"type": "d1"}},
        {"id": "d1-banana", "meta": {"type": "d1"}},
    ]

    sorted_atoms = sort_atoms_canonically(atoms)
    sorted_ids = [a["id"] for a in sorted_atoms]
    assert sorted_ids == ["d1-apple", "d1-banana", "d1-zebra"]


def test_topological_sort_macro_layer_priority_unbreakable():
    """验证层间宏观偏序永远高于层内偏序（如 D3 P0 必须永远在 D2 之前，即使尝试声明违规 after）。"""
    atoms = [
        {"id": "d2-skill", "meta": {"type": "d2"}},
        {
            "id": "d3-axiom",
            "meta": {"type": "d3", "priority": 0, "after": ["d2-skill"]},
        },
        {"id": "kernel", "meta": {"type": "kernel"}},
    ]

    sorted_atoms = sort_atoms_canonically(atoms)
    sorted_ids = [a["id"] for a in sorted_atoms]
    # Kernel (-1) -> D3 P0 (0) -> D2 (3) 依然牢不可破
    assert sorted_ids == ["kernel", "d3-axiom", "d2-skill"]


def test_topological_sort_cycle_detection():
    """验证同层内检测到因果循环依赖时抛出 BuildError 异常。"""
    atoms = [
        {"id": "d2-node-1", "meta": {"type": "d2", "after": ["d2-node-2"]}},
        {"id": "d2-node-2", "meta": {"type": "d2", "after": ["d2-node-1"]}},
    ]

    with pytest.raises(BuildError) as exc:
        sort_atoms_canonically(atoms)

    assert "Causal ordering cycle detected" in str(exc.value)
    assert "d2-node-1" in str(exc.value)
    assert "d2-node-2" in str(exc.value)


def test_topological_sort_ignores_missing_after_targets():
    """验证若 after 声明的前置节点未在当前构建闭包中，不造成死锁阻断，平滑忽略。"""
    atoms = [
        {"id": "d2-step-2", "meta": {"type": "d2", "after": ["d2-step-absent"]}},
        {"id": "d2-step-1", "meta": {"type": "d2"}},
    ]

    sorted_atoms = sort_atoms_canonically(atoms)
    sorted_ids = [a["id"] for a in sorted_atoms]
    assert sorted_ids == ["d2-step-1", "d2-step-2"]
