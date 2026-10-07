from aca_builder.domain.services import evaluate_lookup

SAMPLE_LIBRARY = {
    "d1-core-base": {
        "id": "d1-core-base",
        "meta": {"type": "d1", "domain": ["audit", "core"], "maturity": "production"},
        "content": "Core Base",
    },
    "d1-core-experimental": {
        "id": "d1-core-experimental",
        "meta": {"type": "d1", "domain": ["audit", "core"], "maturity": "experimental"},
        "content": "Core Experimental",
    },
    "d1-audit-legacy": {
        "id": "d1-audit-legacy",
        "meta": {
            "type": "d1",
            "domain": ["audit"],
            "status": "deprecated",
            "maturity": "production",
        },
        "content": "Audit Legacy",
    },
    "d1-other-module": {
        "id": "d1-other-module",
        "meta": {"type": "d1", "domain": ["other"], "maturity": "production"},
        "content": "Other Module",
    },
    "d2-skill-core": {
        "id": "d2-skill-core",
        "meta": {"type": "d2", "domain": ["audit"]},
        "content": "D2 Skill",
    },
}

INTERFACES = {
    "exports": {},
    "internals": {},
    "legacy": {
        "d1l-all-audit": {
            "pillar": "d1",
            "selectors": [{"query": {"domain": ["audit"]}}],
        },
        "d1l-banned-legacy": {
            "pillar": "d1",
            "selectors": [{"query": {"status": "deprecated"}}],
        },
    },
}


def test_backward_compatibility_selectors():
    """验证使用原有 1.0 的 selectors 语法求值完全向后兼容。"""
    lookup_def = {
        "pillar": "d1",
        "selectors": [{"query": {"id": "d1-core-base"}}],
    }
    result = evaluate_lookup(SAMPLE_LIBRARY, lookup_def, INTERFACES)
    assert result == {"d1-core-base"}


def test_algebra_union_operator():
    """验证 2.0 union 算子正确合并多个 query 和 ref。"""
    lookup_def = {
        "pillar": "d1",
        "union": [
            {"query": {"id": "d1-core-base"}},
            {"query": {"id": "d1-other-module"}},
        ],
    }
    result = evaluate_lookup(SAMPLE_LIBRARY, lookup_def, INTERFACES)
    assert result == {"d1-core-base", "d1-other-module"}


def test_algebra_exclude_operator():
    """验证 exclude 差集算子从上游集合中精确剔除指定原子。"""
    lookup_def = {
        "pillar": "d1",
        "union": [
            {
                "ref": "d1l-all-audit"
            },  # 包含 d1-core-base, d1-core-experimental, d1-audit-legacy
        ],
        "exclude": [
            {"ref": "d1l-banned-legacy"},  # 剔除 status: deprecated -> d1-audit-legacy
            {"query": {"id": "d1-core-experimental"}},  # 剔除 d1-core-experimental
        ],
    }
    result = evaluate_lookup(SAMPLE_LIBRARY, lookup_def, INTERFACES)
    assert result == {"d1-core-base"}


def test_algebra_intersect_operator():
    """验证 intersect 交集算子确保仅保留满足条件的交集原子。"""
    lookup_def = {
        "pillar": "d1",
        "union": [
            {
                "ref": "d1l-all-audit"
            },  # 包含 d1-core-base, d1-core-experimental, d1-audit-legacy
        ],
        "intersect": [
            {"query": {"maturity": "production"}},  # 排除 experimental
        ],
    }
    result = evaluate_lookup(SAMPLE_LIBRARY, lookup_def, INTERFACES)
    assert result == {"d1-core-base", "d1-audit-legacy"}
    assert "d1-core-experimental" not in result


def test_algebra_compound_pipeline():
    """验证完整代数管道: Result = (Union \\ Exclude) ∩ Intersect。"""
    lookup_def = {
        "pillar": "d1",
        "union": [
            {"ref": "d1l-all-audit"},
            {"query": {"id": "d1-other-module"}},
        ],
        "exclude": [
            {"ref": "d1l-banned-legacy"},  # 剔除 d1-audit-legacy
        ],
        "intersect": [
            {
                "query": {"domain": ["core"]}
            },  # 仅保留含 core domain 的项 (将剔除 d1-other-module)
            {"query": {"maturity": "production"}},  # 将剔除 d1-core-experimental
        ],
    }
    result = evaluate_lookup(SAMPLE_LIBRARY, lookup_def, INTERFACES)
    # 最终仅剩 d1-core-base
    assert result == {"d1-core-base"}


def test_algebra_pillar_isolation():
    """验证代数管道中 pillar 类型边界始终得到强制约束（防止跨 Pillar 泄露）。"""
    lookup_def = {
        "pillar": "d1",
        "union": [
            {"query": {"domain": ["audit"]}},  # 库中包含 d2-skill-core
        ],
    }
    result = evaluate_lookup(SAMPLE_LIBRARY, lookup_def, INTERFACES)
    assert "d2-skill-core" not in result
    assert all(aid.startswith("d1-") for aid in result)
