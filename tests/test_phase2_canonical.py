from aca_builder.domain.indexing import InvertedIndex
from aca_builder.domain.services import select_atoms_by_query

SAMPLE_LIBRARY = {
    "atom-1": {
        "id": "atom-1",
        "package": "core_pkg",
        "meta": {"type": "d1", "domain": ["math", "logic"], "tags": ["v1", "stable"]},
    },
    "atom-2": {
        "id": "atom-2",
        "package": "core_pkg",
        "meta": {
            "type": "d2",
            "domain": ["math", "calc"],
            "tags": ["v2", "experimental"],
        },
    },
    "atom-3": {
        "id": "atom-3",
        "package": "ext_pkg",
        "meta": {"type": "d1", "domain": ["bio"], "tags": ["v1", "deprecated"]},
    },
}


def test_inverted_index_inclusion_and_exclusion():
    index = InvertedIndex(SAMPLE_LIBRARY)

    # 1. 查询 domain 包含 math 的原子
    res_math = index.select({"domain": ["math"]})
    assert res_math == {"atom-1", "atom-2"}

    # 2. 查询 domain 包含 math 但排除 calc 的原子
    res_logic = index.select({"domain": ["math", "-calc"]})
    assert res_logic == {"atom-1"}

    # 3. 跨字段复合查询: type 为 d1 且 tags 包含 stable
    res_compound = index.select({"type": "d1", "tags": ["stable"]})
    assert res_compound == {"atom-1"}

    # 4. 纯排除查询: 排除 deprecated
    res_no_dep = index.select({"tags": ["-deprecated"]})
    assert res_no_dep == {"atom-1", "atom-2"}


def test_inverted_index_facade_service_integration():
    # 验证领域服务入口 select_atoms_by_query 的透明重构兼容性
    res = select_atoms_by_query(
        SAMPLE_LIBRARY, {"package": "core_pkg", "domain": ["math"]}
    )
    assert res == {"atom-1", "atom-2"}

    res_empty = select_atoms_by_query(SAMPLE_LIBRARY, {"domain": ["non_existent"]})
    assert res_empty == set()
