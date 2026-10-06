from pathlib import Path

import pytest

from aca_builder.domain.services import evaluate_lookup, resolve_lookup_by_key
from aca_builder.infra.filesystem import FSLibraryRepository

# 场景 1：两个包拥有相同名称的公开和私有 lookup
PKG1_CONFIG = """
name: pkg_one
exports:
  d1l-shared-public:
    pillar: d1
    selectors:
      - query: { id: "d1-pkg1-atom" }
"""

PKG1_D4 = """
type: d4
lookups:
  d1l-shared-internal:
    pillar: d1
    selectors:
      - query: { id: "d1-pkg1-atom" }
"""

ATOM_PKG1 = """---
id: d1-pkg1-atom
type: d1
---
Package 1 Content
"""

PKG2_CONFIG = """
name: pkg_two
exports:
  d1l-shared-public:
    pillar: d1
    selectors:
      - query: { id: "d1-pkg2-atom" }
"""

PKG2_D4 = """
type: d4
lookups:
  d1l-shared-internal:
    pillar: d1
    selectors:
      - query: { id: "d1-pkg2-atom" }
"""

ATOM_PKG2 = """---
id: d1-pkg2-atom
type: d1
---
Package 2 Content
"""

# 场景 2：用户提出的真实场景，同一个包内公开接口与内部私有查找同名，且公开接口 ref 同名私有实现
SAME_NAME_PKG_CONFIG = """
name: quipu_dev
version: 1.0.0
exports:
  d3l-development-protocol:
    pillar: d3
    description: "加载 Quipu 项目的核心开发工作流与交互协议"
    selectors:
      - ref: d3l-development-protocol
"""

SAME_NAME_PKG_D4 = """
type: d4
lookups:
  d3l-development-protocol:
    pillar: d3
    description: "加载 Quipu 项目的核心开发工作流与交互协议"
    selectors:
      - query: { id: "d3-workflow-atom" }
"""

ATOM_WORKFLOW = """---
id: d3-workflow-atom
type: d3
priority: 1
---
Workflow Content
"""


@pytest.fixture
def setup_isolation_env(tmp_path: Path):
    lib_path = tmp_path / "lib"
    lib_path.mkdir()

    # Package 1
    p1 = lib_path / "pkg_one"
    p1.mkdir()
    (p1 / "d4").mkdir()
    (p1 / "d1").mkdir()
    (p1 / "package.yaml").write_text(PKG1_CONFIG, encoding="utf-8")
    (p1 / "d4" / "lookups.yaml").write_text(PKG1_D4, encoding="utf-8")
    (p1 / "d1" / "atom.md").write_text(ATOM_PKG1, encoding="utf-8")

    # Package 2
    p2 = lib_path / "pkg_two"
    p2.mkdir()
    (p2 / "d4").mkdir()
    (p2 / "d1").mkdir()
    (p2 / "package.yaml").write_text(PKG2_CONFIG, encoding="utf-8")
    (p2 / "d4" / "lookups.yaml").write_text(PKG2_D4, encoding="utf-8")
    (p2 / "d1" / "atom.md").write_text(ATOM_PKG2, encoding="utf-8")

    # Same Name Package (quipu_dev)
    p3 = lib_path / "quipu_dev"
    p3.mkdir()
    (p3 / "d4").mkdir()
    (p3 / "d3").mkdir()
    (p3 / "package.yaml").write_text(SAME_NAME_PKG_CONFIG, encoding="utf-8")
    (p3 / "d4" / "lookups.yaml").write_text(SAME_NAME_PKG_D4, encoding="utf-8")
    (p3 / "d3" / "workflow.md").write_text(ATOM_WORKFLOW, encoding="utf-8")

    return lib_path


def test_two_packages_with_same_internal_and_public_lookups(setup_isolation_env):
    """验证两个不同包拥有同名私有查找和同名公开接口时，加载与解析完全独立隔离。"""
    lib_path = setup_isolation_env
    repo = FSLibraryRepository()

    library = repo.load_library([lib_path])
    interfaces = repo.load_interfaces([lib_path])

    # 1. 验证两个包的同名私有查找均成功加载且独立在 internals 字典中
    assert "d1l-shared-internal" in interfaces["internals"]["pkg_one"]
    assert "d1l-shared-internal" in interfaces["internals"]["pkg_two"]

    # 2. 验证两个包的同名公开接口均成功加载且在 exports 导出表中带有完整命名空间
    assert "pkg_one::d1l-shared-public" in interfaces["exports"]
    assert "pkg_two::d1l-shared-public" in interfaces["exports"]

    # 3. 验证相对引用（同包内解析短名）能准确命中自身包的私有查找
    p1_def = resolve_lookup_by_key(
        "d1l-shared-internal", context_pkg="pkg_one", interfaces=interfaces
    )
    assert p1_def is not None
    assert p1_def["package"] == "pkg_one"
    p1_atoms = evaluate_lookup(library, p1_def, interfaces)
    assert "d1-pkg1-atom" in p1_atoms
    assert "d1-pkg2-atom" not in p1_atoms

    p2_def = resolve_lookup_by_key(
        "d1l-shared-internal", context_pkg="pkg_two", interfaces=interfaces
    )
    assert p2_def is not None
    assert p2_def["package"] == "pkg_two"
    p2_atoms = evaluate_lookup(library, p2_def, interfaces)
    assert "d1-pkg2-atom" in p2_atoms
    assert "d1-pkg1-atom" not in p2_atoms

    # 4. 验证跨包访问私有查找依然严格抛出 Access denied 异常
    with pytest.raises(Exception) as excinfo:
        resolve_lookup_by_key(
            "pkg_one::internal::d1l-shared-internal",
            context_pkg="pkg_two",
            interfaces=interfaces,
        )
    assert "Access denied" in str(excinfo.value)


def test_package_with_identical_public_export_and_internal_lookup(setup_isolation_env):
    """验证同一个包内公开接口与内部私有查找同名，且公开接口通过 ref 委托同名内部实现时，不报错并正常解析。"""
    lib_path = setup_isolation_env
    repo = FSLibraryRepository()

    library = repo.load_library([lib_path])
    # 加载接口时绝对不能报 Duplicate key 错误
    interfaces = repo.load_interfaces([lib_path])

    # 1. 验证 exports 与 internals 分层存在同名项
    assert "quipu_dev::d3l-development-protocol" in interfaces["exports"]
    assert "d3l-development-protocol" in interfaces["internals"]["quipu_dev"]

    # 2. 验证外部解析 quipu_dev::d3l-development-protocol 能命中公开接口
    pub_lookup = resolve_lookup_by_key(
        "quipu_dev::d3l-development-protocol", context_pkg=None, interfaces=interfaces
    )
    assert pub_lookup is not None
    assert pub_lookup["visibility"] == "public"

    # 3. 验证公开接口通过 evaluate_lookup 解析其 ref: d3l-development-protocol 能命中内部实现并求值出底层原子
    matched_atom_ids = evaluate_lookup(library, pub_lookup, interfaces)
    assert "d3-workflow-atom" in matched_atom_ids


def test_evaluate_lookup_strictly_respects_pillar(tmp_path: Path):
    """验证当 query 仅包含 domain 时，evaluate_lookup 严格受限于 lookup 的 pillar，不会泄露其他 pillar 原子。"""
    lib_path = tmp_path / "lib_pillar"
    lib_path.mkdir()

    # D1 原子，domain 包含 reasoning
    (lib_path / "d1_atom.md").write_text(
        "---\nid: d1-reasoning\ntype: d1\ndomain: ['reasoning']\n---\nD1 content",
        encoding="utf-8",
    )
    # D2 原子，同样 domain 包含 reasoning
    (lib_path / "d2_atom.md").write_text(
        "---\nid: d2-reasoning\ntype: d2\ndomain: ['reasoning']\n---\nD2 content",
        encoding="utf-8",
    )

    repo = FSLibraryRepository()
    library = repo.load_library([lib_path])

    # 1. 以 d1l (pillar: d1) 查询 domain: ['reasoning']
    d1_lookup_def = {
        "pillar": "d1",
        "selectors": [{"query": {"domain": ["reasoning"]}}],
    }
    d1_matched = evaluate_lookup(library, d1_lookup_def, {})
    assert "d1-reasoning" in d1_matched
    assert "d2-reasoning" not in d1_matched

    # 2. 以 d2l (pillar: d2) 查询 domain: ['reasoning']
    d2_lookup_def = {
        "pillar": "d2",
        "selectors": [{"query": {"domain": ["reasoning"]}}],
    }
    d2_matched = evaluate_lookup(library, d2_lookup_def, {})
    assert "d2-reasoning" in d2_matched
    assert "d1-reasoning" not in d2_matched
