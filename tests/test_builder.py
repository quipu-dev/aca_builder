# tests/test_builder.py

from pathlib import Path
from unittest.mock import ANY, MagicMock

import pytest
import yaml
from typer.testing import CliRunner

from aca_builder.infra.filesystem import FSLibraryRepository, FSManifestRepository
from aca_builder.main import app

runner = CliRunner()

# --- Test Data ---

D1_PROFILE = """---
id: d1-profile-fhrsk
type: d1
---
# 系统档案: Fhrsk
"""

D2_CORE_SKILL = """---
id: d2-core-task
type: d2
uses:
  - d3l-core-safety
  - d1l-system-profile
---
# D2 流程
"""

D3_AXIOM = """---
id: d3-axiom-safety
type: d3
priority: 0
---
**公理**: 严禁伪造信息。
"""

KERNEL_CONTENT = """---
type: kernel
---
# ACA Runtime Protocol
"""

D4_LOOKUPS = """
type: d4
lookups:
  d1l-system-profile:
    pillar: d1
    selectors:
      - query: { id: "d1-profile-fhrsk" }
  d3l-core-safety:
    pillar: d3
    selectors:
      - query: { priority: 0 }
"""

MANIFEST_YAML = """
name: "Fhrsk Test Agent"
imports:
  - query: { id: "d2-core-task" }
"""


@pytest.fixture
def setup_test_environment(tmp_path: Path, monkeypatch):
    """Creates a temporary file system with libraries, manifests, and a mock global config."""
    ws_root = tmp_path / "ws"
    lib_path = ws_root / "library"
    manifests_root = ws_root / "manifests"
    manifest_pkg_path = manifests_root / "test_pkg"

    (lib_path / "d1").mkdir(parents=True)
    (lib_path / "d2").mkdir()
    (lib_path / "d3").mkdir()
    (lib_path / "d4").mkdir()
    manifest_pkg_path.mkdir(parents=True)

    (lib_path / "d1/profile.md").write_text(D1_PROFILE, encoding="utf-8")
    (lib_path / "d2/core.md").write_text(D2_CORE_SKILL, encoding="utf-8")
    (lib_path / "d3/axiom.md").write_text(D3_AXIOM, encoding="utf-8")
    (lib_path / "kernel.md").write_text(KERNEL_CONTENT, encoding="utf-8")
    (lib_path / "d4/lookups.yaml").write_text(D4_LOOKUPS, encoding="utf-8")
    (manifest_pkg_path / "agent.yaml").write_text(MANIFEST_YAML, encoding="utf-8")

    config_dir = tmp_path / "config"
    config_dir.mkdir()
    config_file = config_dir / "config.yaml"

    config_data = {
        "default_workspace": "test_ws",
        "workspaces": {
            "test_ws": {
                "name": "Test Workspace",
                "root": str(ws_root),
                "post_process_hook": "cat",
            }
        },
    }
    config_file.write_text(yaml.dump(config_data), encoding="utf-8")

    monkeypatch.setattr("aca_builder.config.CONFIG_PATH", config_file)
    monkeypatch.setenv("ACA_CACHE_DB_PATH", str(tmp_path / "cache.db"))

    return tmp_path, lib_path, manifest_pkg_path


@pytest.fixture
def mock_deps(monkeypatch):
    mock_bus = MagicMock()
    from aca_builder import config

    ws_id, ws_cfg = config.resolve_workspace()
    real_lib_repo = FSLibraryRepository()
    real_man_repo = FSManifestRepository()
    monkeypatch.setattr(
        "aca_builder.commands._bootstrap",
        lambda ws=None: (real_lib_repo, real_man_repo, mock_bus, ws_id, ws_cfg),
    )
    return mock_bus


def test_build_by_name(setup_test_environment):
    result = runner.invoke(app, ["build", "test_pkg/agent"])

    assert result.exit_code == 0, result.stdout
    assert "ACA Runtime Protocol" in result.stdout
    assert "系统档案: Fhrsk" in result.stdout
    assert "严禁伪造信息" in result.stdout


def test_build_by_file_path(setup_test_environment, monkeypatch):
    tmp_path, _, manifest_pkg_path = setup_test_environment
    manifest_file = manifest_pkg_path / "agent.yaml"

    outside_dir = tmp_path / "outside"
    outside_dir.mkdir()
    monkeypatch.chdir(outside_dir)

    result = runner.invoke(app, ["build", str(manifest_file), "--file"])

    assert result.exit_code == 0, result.stdout
    assert "ACA Runtime Protocol" in result.stdout
    assert "系统档案: Fhrsk" in result.stdout


def test_list_manifests(setup_test_environment):
    result = runner.invoke(app, ["list"])

    assert result.exit_code == 0
    assert "test_pkg/agent" in result.stdout.strip()


def test_build_with_post_hook(setup_test_environment):
    """Test that the post-processing hook is correctly executed."""
    result = runner.invoke(app, ["build", "test_pkg/agent"])

    assert result.exit_code == 0, result.stdout
    assert "ACA Runtime Protocol" in result.stdout
    assert "系统档案: Fhrsk" in result.stdout


def test_build_fails_on_nonexistent_name(setup_test_environment, mock_deps):
    result = runner.invoke(app, ["build", "ghost_pkg/agent"])

    assert result.exit_code != 0
    mock_deps.error.assert_called_once_with("system.unexpected_error", error=ANY)
    assert "Manifest 'ghost_pkg/agent' not found" in str(
        mock_deps.error.call_args.kwargs["error"]
    )
