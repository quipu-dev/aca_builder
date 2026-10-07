import pytest

from aca_builder.domain.compiler import compile_prompt
from aca_builder.domain.events import BuildError
from aca_builder.domain.schema import validate_atom_meta_dict

BASE_LIBRARY = {
    "kernel": {
        "id": "kernel",
        "meta": {"type": "kernel"},
        "content": "Kernel Content",
    },
    "d2-root": {
        "id": "d2-root",
        "meta": {"type": "d2", "tags": ["mode:strict", "audit"], "uses": ["d1l-dep1"]},
        "content": "Root Skill",
    },
    "d1-leaf-deprecated": {
        "id": "d1-leaf-deprecated",
        "meta": {"type": "d1", "tags": ["deprecated", "mode:permissive"]},
        "content": "Deprecated Leaf",
    },
    "d1-leaf-ok": {
        "id": "d1-leaf-ok",
        "meta": {"type": "d1", "tags": ["stable"]},
        "content": "OK Leaf",
    },
}

INTERFACES = {
    "exports": {},
    "internals": {},
    "legacy": {
        "d1l-dep1": {
            "pillar": "d1",
            "selectors": [{"query": {"id": "d1-leaf-deprecated"}}],
        },
        "d1l-dep-ok": {
            "pillar": "d1",
            "selectors": [{"query": {"id": "d1-leaf-ok"}}],
        },
    },
}


def test_schema_catches_misspelled_metadata_field():
    """验证元数据拼写错误（如错写为 domains 而非 domain）被 Schema 秒级拦截。"""
    raw_invalid = {
        "id": "d1-typo",
        "type": "d1",
        "domains": ["math"],  # 拼写错误，官方字段为 domain
    }

    with pytest.raises(BuildError) as exc:
        validate_atom_meta_dict(raw_invalid, path_hint="test_atom.md")

    assert "Extra inputs are not permitted" in str(exc.value)
    assert "domains" in str(exc.value)


def test_invariant_forbidden_tags_violation():
    """验证闭包中引入包含 forbidden_tags 的原子时立即阻断编译。"""
    invariants = {
        "forbidden_tags": ["deprecated"],
    }

    with pytest.raises(BuildError) as exc:
        compile_prompt(
            library=BASE_LIBRARY,
            interfaces=INTERFACES,
            imports=[{"query": {"id": "d2-root"}}],  # d2-root 依赖 d1-leaf-deprecated
            invariants=invariants,
        )

    assert "Forbidden tag 'deprecated' detected" in str(exc.value)
    assert "d1-leaf-deprecated" in str(exc.value)


def test_invariant_exclusive_tags_violation():
    """验证闭包中同时存在互斥标签时阻断编译。"""
    # d2-root 带有 mode:strict，d1-leaf-deprecated 带有 mode:permissive
    invariants = {
        "exclusive_tags": [
            ["mode:strict", "mode:permissive"],
        ],
    }

    with pytest.raises(BuildError) as exc:
        compile_prompt(
            library=BASE_LIBRARY,
            interfaces=INTERFACES,
            imports=[{"query": {"id": "d2-root"}}],
            invariants=invariants,
        )

    assert "Mutually exclusive tags" in str(exc.value)
    assert "mode:strict" in str(exc.value)
    assert "mode:permissive" in str(exc.value)


def test_invariant_max_graph_depth_violation():
    """验证当传递依赖深度超过 max_graph_depth 上限时阻断编译。"""
    # d2-root -> d1-leaf-deprecated 深度为 1
    # 设定上限为 0，必然触发违规
    invariants = {
        "max_graph_depth": 0,
    }

    with pytest.raises(BuildError) as exc:
        compile_prompt(
            library=BASE_LIBRARY,
            interfaces=INTERFACES,
            imports=[{"query": {"id": "d2-root"}}],
            invariants=invariants,
        )

    assert "Maximum dependency depth exceeded" in str(exc.value)


def test_invariants_pass_when_compliant():
    """验证当编译闭包完全符合 invariants 断言时顺利完成编译。"""
    clean_library = {
        "kernel": {"id": "kernel", "meta": {"type": "kernel"}, "content": "K"},
        "d2-agent": {
            "id": "d2-agent",
            "meta": {
                "type": "d2",
                "tags": ["mode:strict", "production"],
                "uses": ["d1l-dep-ok"],
            },
            "content": "Agent",
        },
        "d1-leaf-ok": {
            "id": "d1-leaf-ok",
            "meta": {"type": "d1", "tags": ["stable"]},
            "content": "Leaf",
        },
    }

    invariants = {
        "forbidden_tags": ["deprecated", "experimental"],
        "exclusive_tags": [["mode:strict", "mode:permissive"]],
        "max_graph_depth": 3,
    }

    res = compile_prompt(
        library=clean_library,
        interfaces=INTERFACES,
        imports=[{"query": {"id": "d2-agent"}}],
        invariants=invariants,
    )
    assert "Agent" in res.prompt
    assert "Leaf" in res.prompt
