from pathlib import Path

from aca_builder.domain.compiler import compile_prompt
from aca_builder.domain.rules import diagnose_knowledge_base
from aca_builder.infra.filesystem import FSLibraryRepository, FSManifestRepository


def test_scoped_dependency_injection_isolation():
    """验证通过 with 语法实现的局部作用域依赖注入，模块 A 与模块 B 互不干扰。"""
    library = {
        "kernel": {"id": "kernel", "meta": {"type": "kernel"}, "content": "Kernel"},
        # 两个通用业务技能，均依赖通用的抽象查找 d2l-file-skill
        "d2-task-a": {
            "id": "d2-task-a",
            "meta": {"type": "d2", "uses": ["d2l-file-skill"]},
            "content": "# Task A",
        },
        "d2-task-b": {
            "id": "d2-task-b",
            "meta": {"type": "d2", "uses": ["d2l-file-skill"]},
            "content": "# Task B",
        },
        # 具体的两种实现原子
        "d2-file-quipu": {
            "id": "d2-file-quipu",
            "meta": {"type": "d2", "domain": ["file", "quipu"]},
            "content": "# Quipu File Skill",
        },
        "d2-file-mcp": {
            "id": "d2-file-mcp",
            "meta": {"type": "d2", "domain": ["file", "mcp"]},
            "content": "# MCP File Skill",
        },
    }

    interfaces = {
        "exports": {},
        "internals": {},
        "legacy": {
            # 默认配置下，d2l-file-skill 命中 quipu 实现
            "d2l-file-skill": {
                "pillar": "d2",
                "selectors": [{"query": {"id": "d2-file-quipu"}}],
            }
        },
    }

    # 场景 1：默认编译，拉入 quipu 实现
    res_default = compile_prompt(
        library=library,
        interfaces=interfaces,
        imports=[{"query": {"id": "d2-task-a"}}],
    )
    assert "Quipu File Skill" in res_default.prompt
    assert "MCP File Skill" not in res_default.prompt

    # 场景 2：在 Task A 上局部注入 MCP 实现（直接绑定原子 ID）
    res_injected = compile_prompt(
        library=library,
        interfaces=interfaces,
        imports=[
            {
                "query": {"id": "d2-task-a"},
                "with": {"d2l-file-skill": "d2-file-mcp"},
            }
        ],
    )
    assert "MCP File Skill" in res_injected.prompt
    assert "Quipu File Skill" not in res_injected.prompt

    # 场景 3：并行分支隔离测试 —— 验证 Task A 局部注入不污染 Task B
    res_isolated = compile_prompt(
        library=library,
        interfaces=interfaces,
        imports=[
            {
                "query": {"id": "d2-task-a"},
                "with": {"d2l-file-skill": "d2-file-mcp"},
            },
            {
                "query": {"id": "d2-task-b"},  # 保持默认依赖
            },
        ],
    )
    # 两者均被收录，证明既能按需注入，又能各取所需
    assert "MCP File Skill" in res_isolated.prompt
    assert "Quipu File Skill" in res_isolated.prompt


def test_d2_requires_port_declaration():
    """验证 D2 原子的 requires 端口字典声明被正确识别并求解。"""
    library = {
        "kernel": {"id": "kernel", "meta": {"type": "kernel"}, "content": "Kernel"},
        "d2-agent": {
            "id": "d2-agent",
            "meta": {
                "type": "d2",
                "requires": {
                    "fs": "d2l-abstract-storage",
                },
            },
            "content": "# Agent using storage port",
        },
        "d2-storage-sqlite": {
            "id": "d2-storage-sqlite",
            "meta": {"type": "d2"},
            "content": "# SQLite Storage Provider",
        },
    }

    res = compile_prompt(
        library=library,
        interfaces={"exports": {}, "internals": {}, "legacy": {}},
        imports=[
            {
                "query": {"id": "d2-agent"},
                "with": {"d2l-abstract-storage": "d2-storage-sqlite"},
            }
        ],
    )
    assert "SQLite Storage Provider" in res.prompt


def test_structural_contract_conformance_and_violation(tmp_path: Path):
    """测试 D4 Lookup 的 contract 静态契约检查（缺失 domain 抛出 ERROR）。"""
    lib_path = tmp_path / "lib"
    lib_path.mkdir()
    (lib_path / "d4").mkdir()
    (lib_path / "d2").mkdir()

    (lib_path / "kernel.md").write_text("---\ntype: kernel\n---\nKernel")

    # 合格原子：具备 domain: [file] 与 status 元数据
    (lib_path / "d2/atom_valid.md").write_text(
        "---\nid: d2-atom-valid\ntype: d2\ndomain: [file]\nstatus: stable\n---\nValid",
        encoding="utf-8",
    )
    # 违规原子：缺失 domain: [file]
    (lib_path / "d2/atom_invalid.md").write_text(
        "---\nid: d2-atom-invalid\ntype: d2\ndomain: [other]\nstatus: stable\n---\nInvalid",
        encoding="utf-8",
    )

    d4_content = """
type: d4
lookups:
  d2l-contracted:
    pillar: d2
    contract:
      required_domains: ["file"]
      required_metadata: ["status"]
    selectors:
      - query: { id: "d2-atom-invalid" }
"""
    (lib_path / "d4/lookups.yaml").write_text(d4_content, encoding="utf-8")

    lib_repo = FSLibraryRepository()
    man_repo = FSManifestRepository()

    diagnostics = diagnose_knowledge_base(lib_repo, man_repo, [lib_path], [])
    contract_errors = [
        d for d in diagnostics if d.code == "linter.lookup.contract_violation"
    ]
    assert len(contract_errors) == 1
    assert "Missing required domain(s)" in contract_errors[0].message
