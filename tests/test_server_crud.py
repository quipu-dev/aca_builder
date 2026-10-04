from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

from aca_builder.server.app import create_app

ATOM_SAMPLE = """---
id: d1-crud-atom
type: d1
---
Crud Test Content
"""

PKG_SAMPLE = """
name: pkg_crud
version: "1.0.0"
exports:
  d1l-public-crud:
    pillar: d1
    selectors:
      - query: { id: "d1-crud-atom" }
"""

D4_SAMPLE = """
type: d4
lookups:
  d1l-private-crud:
    pillar: d1
    selectors:
      - query: { id: "d1-crud-atom" }
"""


@pytest.fixture
def setup_crud_env(tmp_path: Path, monkeypatch):
    lib_path = tmp_path / "lib"
    lib_path.mkdir()

    pkg_dir = lib_path / "pkg_crud"
    pkg_dir.mkdir()
    (pkg_dir / "d1").mkdir()
    (pkg_dir / "d4").mkdir()

    (lib_path / "kernel.md").write_text(
        "---\ntype: kernel\n---\n# ACA Kernel Protocol\n", encoding="utf-8"
    )
    (pkg_dir / "package.yaml").write_text(PKG_SAMPLE, encoding="utf-8")
    (pkg_dir / "d1" / "atom.md").write_text(ATOM_SAMPLE, encoding="utf-8")
    (pkg_dir / "d4" / "lookups.yaml").write_text(D4_SAMPLE, encoding="utf-8")

    config_dir = tmp_path / "config"
    config_dir.mkdir()
    config_file = config_dir / "config.yaml"
    config_file.write_text(
        yaml.dump({"library_paths": [str(lib_path)], "manifest_paths": []}),
        encoding="utf-8",
    )
    monkeypatch.setattr("aca_builder.config.CONFIG_PATH", config_file)

    app = create_app()
    client = TestClient(app)
    return client, lib_path, pkg_dir


def test_delete_public_and_private_lookup(setup_crud_env):
    client, _, pkg_dir = setup_crud_env

    # 1. 验证删除公开接口
    res_pub = client.delete("/api/lookups/pkg_crud::d1l-public-crud")
    assert res_pub.status_code == 200
    pkg_yaml = yaml.safe_load((pkg_dir / "package.yaml").read_text(encoding="utf-8"))
    assert "d1l-public-crud" not in pkg_yaml.get("exports", {})

    # 2. 验证删除私有接口
    res_priv = client.delete("/api/lookups/d1l-private-crud")
    assert res_priv.status_code == 200
    d4_yaml = yaml.safe_load(
        (pkg_dir / "d4" / "lookups.yaml").read_text(encoding="utf-8")
    )
    assert "d1l-private-crud" not in d4_yaml.get("lookups", {})


def test_lookup_visibility_migration_cleans_old_definition(setup_crud_env):
    """验证当将一个接口从私有改为公开（或公开改为私有）时，后端能彻底清理旧位置文件，不留残余。"""
    client, _, pkg_dir = setup_crud_env

    # 1. 将现有的私有接口 d1l-private-crud 改为公开导出
    res_migrate_to_pub = client.post(
        "/api/lookups",
        json={
            "package": "pkg_crud",
            "key": "d1l-private-crud",
            "pillar": "d1",
            "is_public": True,
            "description": "Migrated to public",
            "selectors": [{"query": {"id": "d1-crud-atom"}}],
        },
    )
    assert res_migrate_to_pub.status_code == 200

    # 验证 package.yaml 出现了新公开接口
    pkg_yaml = yaml.safe_load((pkg_dir / "package.yaml").read_text(encoding="utf-8"))
    assert "d1l-private-crud" in pkg_yaml.get("exports", {})

    # 验证 d4/lookups.yaml 中的旧定义已被物理删除
    d4_yaml = yaml.safe_load(
        (pkg_dir / "d4" / "lookups.yaml").read_text(encoding="utf-8")
    )
    assert "d1l-private-crud" not in d4_yaml.get("lookups", {})

    # 2. 将公开接口 d1l-public-crud 改为内部私有
    res_migrate_to_priv = client.post(
        "/api/lookups",
        json={
            "package": "pkg_crud",
            "key": "d1l-public-crud",
            "pillar": "d1",
            "is_public": False,
            "description": "Migrated to private",
            "selectors": [{"query": {"id": "d1-crud-atom"}}],
        },
    )
    assert res_migrate_to_priv.status_code == 200

    # 验证 d4/lookups.yaml 出现私有定义
    d4_yaml_2 = yaml.safe_load(
        (pkg_dir / "d4" / "lookups.yaml").read_text(encoding="utf-8")
    )
    assert "d1l-public-crud" in d4_yaml_2.get("lookups", {})

    # 验证 package.yaml 的 exports 中已被物理清理
    pkg_yaml_2 = yaml.safe_load((pkg_dir / "package.yaml").read_text(encoding="utf-8"))
    assert "d1l-public-crud" not in pkg_yaml_2.get("exports", {})


def test_delete_atom_file(setup_crud_env):
    client, _, pkg_dir = setup_crud_env
    atom_file = pkg_dir / "d1" / "atom.md"
    assert atom_file.exists()

    res = client.delete("/api/atoms/d1-crud-atom")
    assert res.status_code == 200
    assert not atom_file.exists()


def test_create_and_delete_package(setup_crud_env):
    client, lib_path, _ = setup_crud_env

    # 1. 创建新包
    res_create = client.post(
        "/api/packages",
        json={
            "name": "pkg_new",
            "description": "Brand new package",
            "version": "1.0.0",
        },
    )
    assert res_create.status_code == 200
    new_pkg_dir = lib_path / "pkg_new"
    assert new_pkg_dir.is_dir()
    assert (new_pkg_dir / "package.yaml").exists()

    # 2. 删除新包
    res_del = client.delete("/api/packages/pkg_new")
    assert res_del.status_code == 200
    assert not new_pkg_dir.exists()


def test_compile_lookup_adhoc_excludes_kernel(setup_crud_env):
    client, _, _ = setup_crud_env

    res = client.post(
        "/api/lookups/compile-adhoc",
        json={
            "key": "d1l-test-slice",
            "selectors": [{"query": {"id": "d1-crud-atom"}}],
            "package": "pkg_crud",
            "pillar": "d1",
        },
    )
    assert res.status_code == 200
    data = res.json()

    # 验证切片编译包含指定原子，但不包含全局 kernel
    chunk_ids = [c["id"] for c in data.get("chunks", [])]
    assert "d1-crud-atom" in chunk_ids
    assert "kernel" not in chunk_ids
    assert "ACA Kernel Protocol" not in data.get("prompt", "")
