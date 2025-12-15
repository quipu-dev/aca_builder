# aca_builder/tests/test_core_selection.py

import pytest
from aca_builder.core import select_atoms

# --- Mock Library Data ---
LIBRARY = {
    "atom-kos-core": {
        "id": "atom-kos-core",
        "meta": {
            "type": "d1",
            "domain": ["kos", "core"],
            "tags": ["stable", "v1"]
        }
    },
    "atom-kos-ui": {
        "id": "atom-kos-ui",
        "meta": {
            "type": "d2",
            "domain": ["kos", "ui"],
            "tags": ["experimental", "v2"]
        }
    },
    "atom-biz-core": {
        "id": "atom-biz-core",
        "meta": {
            "type": "d1",
            "domain": ["biz", "core"],
            "tags": ["stable", "deprecated"]
        }
    },
    "atom-biz-ui": {
        "id": "atom-biz-ui",
        "meta": {
            "type": "d2",
            "domain": ["biz", "ui"],
            "tags": ["legacy"]
        }
    }
}

def test_select_basic_inclusion():
    """测试标准的正向匹配 (AND 逻辑)。"""
    # 查找所有 domain 包含 'kos' 的原子
    query = {"domain": ["kos"]}
    result = select_atoms(LIBRARY, query)
    assert "atom-kos-core" in result
    assert "atom-kos-ui" in result
    assert "atom-biz-core" not in result
    assert len(result) == 2

def test_select_basic_exclusion():
    """测试单个否定条件。"""
    # 查找 domain 包含 'kos' 但不包含 'ui' 的原子
    query = {"domain": ["kos", "-ui"]}
    result = select_atoms(LIBRARY, query)
    assert "atom-kos-core" in result
    assert "atom-kos-ui" not in result
    assert len(result) == 1

def test_select_tags_exclusion():
    """测试对 tags 字段的否定逻辑。"""
    # 查找 tags 包含 'stable' 但不包含 'deprecated' 的原子
    query = {"tags": ["stable", "-deprecated"]}
    result = select_atoms(LIBRARY, query)
    assert "atom-kos-core" in result
    assert "atom-biz-core" not in result # 它虽然是 stable，但也 deprecated
    assert len(result) == 1

def test_select_mixed_fields_logic():
    """测试跨字段的组合查询。"""
    # domain 必须包含 'core'，且 tags 不能包含 'deprecated'
    query = {
        "domain": ["core"],
        "tags": ["-deprecated"]
    }
    result = select_atoms(LIBRARY, query)
    assert "atom-kos-core" in result
    assert "atom-biz-core" not in result
    assert len(result) == 1

def test_select_all_exclusions():
    """测试仅包含排除条件的查询（虽然业务上少见，逻辑上应支持）。"""
    # 排除所有 tag 为 experimental 的原子
    # 注意：如果只提供排除项，select_atoms 当前逻辑是基于 match=True 开始的，
    # 只要不违反排除项，就会被选中。
    # 但前提是字段必须存在。
    query = {"tags": ["-experimental"]}
    result = select_atoms(LIBRARY, query)
    
    # atom-kos-ui 有 experimental -> 排除
    assert "atom-kos-ui" not in result
    
    # 其他原子没有 experimental -> 包含
    assert "atom-kos-core" in result
    assert "atom-biz-core" in result
    assert "atom-biz-ui" in result