from pathlib import Path

from aca_builder.domain.models import Atom, AtomMeta
from aca_builder.domain.rules import diagnose_knowledge_base
from aca_builder.infra.atomic import MutationPlan, atomic_write_text
from aca_builder.infra.filesystem import FSLibraryRepository, FSManifestRepository


def test_atomic_write_text(tmp_path: Path):
    target = tmp_path / "subdir" / "test.txt"
    content = "Hello, Canonical Atomic Write!"
    atomic_write_text(target, content)

    assert target.exists()
    assert target.read_text(encoding="utf-8") == content

    # 验证覆盖更新
    updated = "Updated content"
    atomic_write_text(target, updated)
    assert target.read_text(encoding="utf-8") == updated


def test_mutation_plan_execution(tmp_path: Path):
    file_a = tmp_path / "a.txt"
    file_b = tmp_path / "b.txt"
    file_to_del = tmp_path / "c.txt"
    file_to_del.write_text("delete me", encoding="utf-8")

    plan = MutationPlan()
    plan.writes[file_a] = "Content A"
    plan.moves.append((file_a, file_b))
    plan.deletions.append(file_to_del)

    plan.execute()

    assert not file_a.exists()
    assert file_b.exists()
    assert file_b.read_text(encoding="utf-8") == "Content A"
    assert not file_to_del.exists()


def test_atom_model_dual_access():
    meta = AtomMeta(
        id="d1-test",
        type="d1",
        domain=["core", "test"],
        priority=None,
    )
    atom = Atom(
        id="d1-test",
        meta=meta,
        content="# Test Content",
        package="pkg_core",
        source_file="/path/to/d1.md",
    )

    # 1. 强类型属性访问
    assert atom.id == "d1-test"
    assert atom.meta.type == "d1"
    assert "core" in atom.meta.domain

    # 2. 传统字典接口兼容访问
    assert atom["id"] == "d1-test"
    assert atom["meta"]["type"] == "d1"
    assert atom.get("package") == "pkg_core"
    assert atom["meta"].get("status") == "stable"


def test_pure_rule_pipeline_diagnosis(tmp_path: Path):
    lib_path = tmp_path / "library"
    man_path = tmp_path / "manifests"
    lib_path.mkdir()
    man_path.mkdir()

    (lib_path / "kernel.md").write_text("---\ntype: kernel\n---\nKernel Protocol")
    (lib_path / "d1_test.md").write_text("---\nid: d1-ok\ntype: d1\n---\nD1 Content")

    lib_repo = FSLibraryRepository()
    man_repo = FSManifestRepository()

    diagnostics = diagnose_knowledge_base(lib_repo, man_repo, [lib_path], [man_path])
    assert isinstance(diagnostics, list)
    errors = [d for d in diagnostics if d.level == "ERROR"]
    assert len(errors) == 0
