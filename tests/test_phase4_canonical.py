from aca_builder.domain.compiler import compile_prompt


def test_unified_compiler_pipeline_pure_functional():
    library = {
        "kernel": {
            "id": "kernel",
            "meta": {"type": "kernel"},
            "content": "# ACA Kernel Protocol",
            "package": None,
        },
        "d3-p0": {
            "id": "d3-p0",
            "meta": {"type": "d3", "priority": 0},
            "content": "Axiom Content",
            "package": "core",
        },
        "d1-data": {
            "id": "d1-data",
            "meta": {"type": "d1"},
            "content": "Data Content",
            "package": "core",
        },
    }

    interfaces = {
        "exports": {
            "core::d1l-all": {
                "pillar": "d1",
                "package": "core",
                "selectors": [{"query": {"id": "d1-data"}}],
            },
            "core::d3l-safety": {
                "pillar": "d3",
                "package": "core",
                "selectors": [{"query": {"priority": 0}}],
            },
        },
        "internals": {},
        "legacy": {},
    }

    # 1. 运行编译
    res = compile_prompt(
        library=library,
        interfaces=interfaces,
        imports=[{"lookup": "core::d1l-all"}, {"lookup": "core::d3l-safety"}],
        include_kernel=True,
    )

    # 验证 Prompt 包含 Kernel、D3-P0 与 D1
    assert "ACA Kernel Protocol" in res.prompt
    assert "Axiom Content" in res.prompt
    assert "Data Content" in res.prompt

    # 验证 Chunks 输出
    chunk_ids = [c.id for c in res.chunks]
    assert chunk_ids == ["kernel", "d3-p0", "d1-data"]

    # 验证 Profile Token 估算
    assert res.profile.total_tokens > 0
    assert "kernel" in res.profile.by_pillar
    assert "d1" in res.profile.by_pillar
    assert "d3" in res.profile.by_pillar


def test_compiler_pipeline_slice_excludes_kernel():
    library = {
        "kernel": {
            "id": "kernel",
            "meta": {"type": "kernel"},
            "content": "Kernel",
        },
        "d1-slice": {
            "id": "d1-slice",
            "meta": {"type": "d1"},
            "content": "Slice Only",
        },
    }

    lookup_def = {
        "pillar": "d1",
        "selectors": [{"query": {"id": "d1-slice"}}],
    }

    res = compile_prompt(
        library=library,
        interfaces={},
        direct_lookup=("slice-key", lookup_def),
        include_kernel=False,
    )

    chunk_ids = [c.id for c in res.chunks]
    assert "d1-slice" in chunk_ids
    assert "kernel" not in chunk_ids
    assert "Kernel" not in res.prompt
