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
    ws_root = tmp_path / "ws"
    lib_path = ws_root / "library"
    man_path = ws_root / "manifests"
    lib_path.mkdir(parents=True)
    man_path.mkdir(parents=True)

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
        yaml.dump(
            {
                "default_workspace": "default",
                "workspaces": {
                    "default": {
                        "name": "Default Workspace",
                        "root": str(ws_root),
                    }
                },
            }
        ),
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


def test_update_package_metadata(setup_crud_env):
    client, _, pkg_dir = setup_crud_env

    res = client.put(
        "/api/packages/pkg_crud",
        json={"version": "1.2.0", "description": "Updated Package Desc"},
    )
    assert res.status_code == 200
    pkg_yaml = yaml.safe_load((pkg_dir / "package.yaml").read_text(encoding="utf-8"))
    assert pkg_yaml.get("version") == "1.2.0"
    assert pkg_yaml.get("description") == "Updated Package Desc"


def test_rename_atom_with_cascade(setup_crud_env):
    client, _, pkg_dir = setup_crud_env
    old_file = pkg_dir / "d1" / "atom.md"
    new_file = pkg_dir / "d1" / "d1-renamed-atom.md"

    res = client.post(
        "/api/atoms/d1-crud-atom/rename",
        json={"new_id": "d1-renamed-atom", "cascade": True},
    )
    assert res.status_code == 200
    assert not old_file.exists()
    assert new_file.exists()

    # 1. 验证 Frontmatter 中的 ID 已同步更新
    content = new_file.read_text(encoding="utf-8")
    assert "id: d1-renamed-atom" in content
    assert "Crud Test Content" in content

    # 2. 验证 package.yaml 中公开接口的选择器已被级联更新
    pkg_yaml = yaml.safe_load((pkg_dir / "package.yaml").read_text(encoding="utf-8"))
    sel_id = pkg_yaml["exports"]["d1l-public-crud"]["selectors"][0]["query"]["id"]
    assert sel_id == "d1-renamed-atom"

    # 3. 验证 d4/lookups.yaml 中的私有接口选择器也被级联更新
    d4_yaml = yaml.safe_load(
        (pkg_dir / "d4" / "lookups.yaml").read_text(encoding="utf-8")
    )
    sel_d4_id = d4_yaml["lookups"]["d1l-private-crud"]["selectors"][0]["query"]["id"]
    assert sel_d4_id == "d1-renamed-atom"


def test_rename_lookup_with_old_key_cleans_legacy(setup_crud_env):
    client, _, pkg_dir = setup_crud_env

    # 现存公开接口为 pkg_crud::d1l-public-crud
    # 将其重命名为 d1l-public-renamed，并传入 old_key
    res = client.post(
        "/api/lookups",
        json={
            "package": "pkg_crud",
            "key": "d1l-public-renamed",
            "pillar": "d1",
            "is_public": True,
            "description": "Renamed Lookup",
            "selectors": [{"query": {"id": "d1-crud-atom"}}],
            "old_key": "pkg_crud::d1l-public-crud",
        },
    )
    assert res.status_code == 200

    pkg_yaml = yaml.safe_load((pkg_dir / "package.yaml").read_text(encoding="utf-8"))
    exports = pkg_yaml.get("exports", {})
    assert "d1l-public-renamed" in exports
    assert "d1l-public-crud" not in exports


def test_get_lookup_providers_with_contract(setup_crud_env):
    client, _lib_path, _pkg_dir = setup_crud_env

    # 1. 建立一个带契约的查找接口
    res_create = client.post(
        "/api/lookups",
        json={
            "package": "pkg_crud",
            "key": "d1l-contracted-api",
            "pillar": "d1",
            "is_public": True,
            "description": "Contracted API",
            "contract": {
                "required_domains": ["test"],
            },
            "selectors": [{"query": {"id": "d1-crud-atom"}}],
        },
    )
    assert res_create.status_code == 200

    # 2. 查询 /api/assets，确认 contract 字段被正确透出
    res_assets = client.get("/api/assets")
    assert res_assets.status_code == 200
    assets_data = res_assets.json()
    pkg_item = next(p for p in assets_data["packages"] if p["name"] == "pkg_crud")
    contract_def = pkg_item["exports"]["pkg_crud::d1l-contracted-api"]
    assert "contract" in contract_def
    assert contract_def["contract"] == {"required_domains": ["test"]}

    # 3. 调用 /api/lookups/{key}/providers 检索候选实现者
    res_prov = client.get("/api/lookups/pkg_crud::d1l-contracted-api/providers")
    assert res_prov.status_code == 200
    prov_data = res_prov.json()
    assert prov_data["has_contract"] is True
    assert prov_data["pillar"] == "d1"
    assert "providers" in prov_data


def test_atom_and_lookup_references(setup_crud_env):
    client, lib_path, _pkg_dir = setup_crud_env
    # 创建一个显式引用原子的 Manifest 到已配置的工作区目录中
    manifest_dir = lib_path.parent / "manifests"
    manifest_dir.mkdir(exist_ok=True)
    (manifest_dir / "test_manifest.yaml").write_text(
        "name: test_m\nimports:\n  - query: {id: 'd1-crud-atom'}\n",
        encoding="utf-8",
    )

    # 1. 验证探测原子的引用者（同时包含 lookups 与 manifests）
    res_atom = client.get("/api/atoms/d1-crud-atom/references")
    assert res_atom.status_code == 200
    data_atom = res_atom.json()
    assert data_atom["reference_count"] >= 2
    ref_keys = [item["key"] for item in data_atom["referenced_by_lookups"]]
    assert any("d1l-public-crud" in k for k in ref_keys)
    assert len(data_atom.get("referenced_by_manifests", [])) >= 1

    # 2. 验证探测 Lookup 的引用者
    res_lookup = client.get("/api/lookups/pkg_crud::d1l-public-crud/references")
    assert res_lookup.status_code == 200
    data_lookup = res_lookup.json()
    assert "total_references" in data_lookup
