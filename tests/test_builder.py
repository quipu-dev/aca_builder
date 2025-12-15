# tests/test_builder.py

import pytest
from pathlib import Path
from typer.testing import CliRunner
import yaml

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
    # --- File System Setup ---
    lib_path = tmp_path / "test_lib"
    manifests_root = tmp_path / "manifests"
    manifest_pkg_path = manifests_root / "test_pkg"

    (lib_path / "d1").mkdir(parents=True)
    (lib_path / "d2").mkdir()
    (lib_path / "d3").mkdir()
    (lib_path / "d4").mkdir()
    manifest_pkg_path.mkdir(parents=True)

    (lib_path / "d1/profile.md").write_text(D1_PROFILE)
    (lib_path / "d2/core.md").write_text(D2_CORE_SKILL)
    (lib_path / "d3/axiom.md").write_text(D3_AXIOM)
    (lib_path / "kernel.md").write_text(KERNEL_CONTENT)
    (lib_path / "d4/lookups.yaml").write_text(D4_LOOKUPS)
    (manifest_pkg_path / "agent.yaml").write_text(MANIFEST_YAML)

    # --- Config File Setup ---
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    config_file = config_dir / "config.yaml"
    
    config_data = {
        "library_paths": [str(lib_path)],
        "manifest_paths": [str(manifest_pkg_path)],
        "post_process_hook": "cat" # Simple hook for testing
    }
    config_file.write_text(yaml.dump(config_data))

    # --- Monkeypatching ---
    # Point the config module to our mock config file
    monkeypatch.setattr("aca_builder.config.CONFIG_PATH", config_file)

    return tmp_path, lib_path, manifest_pkg_path


def test_build_by_name(setup_test_environment):
    """Test building a prompt by using the 'package/name' identifier."""
    result = runner.invoke(app, ["build", "test_pkg/agent"])

    assert result.exit_code == 0, result.stdout
    assert "ACA Runtime Protocol" in result.stdout
    assert "系统档案: Fhrsk" in result.stdout # from d1l-system-profile
    assert "严禁伪造信息" in result.stdout # from d3l-core-safety


def test_build_by_file_path(setup_test_environment):
    """Test building a prompt using a direct file path, ensuring backward compatibility."""
    _, _, manifest_pkg_path = setup_test_environment
    manifest_file = manifest_pkg_path / "agent.yaml"
    
    # We must run from a different directory to simulate a global call
    with runner.isolated_filesystem():
        result = runner.invoke(
            app, ["build", str(manifest_file), "--file"]
        )

        assert result.exit_code == 0, result.stdout
        assert "ACA Runtime Protocol" in result.stdout
        assert "系统档案: Fhrsk" in result.stdout


def test_list_manifests(setup_test_environment):
    """Test the 'list' command to ensure it finds and formats manifest names correctly."""
    result = runner.invoke(app, ["list"])
    
    assert result.exit_code == 0
    assert "test_pkg/agent" in result.stdout.strip()


def test_build_with_post_hook(setup_test_environment):
    """Test that the post-processing hook is correctly executed."""
    # The hook is 'cat', so the output should be identical to a normal build.
    # This test primarily ensures the hook is called and doesn't fail.
    result = runner.invoke(app, ["build", "test_pkg/agent"])

    assert result.exit_code == 0, result.stdout
    assert "ACA Runtime Protocol" in result.stdout
    assert "系统档案: Fhrsk" in result.stdout


def test_build_fails_on_nonexistent_name(setup_test_environment):
    """Test that build fails gracefully if a manifest name does not exist."""
    result = runner.invoke(app, ["build", "ghost_pkg/agent"])

    assert result.exit_code != 0
    # Build errors are explicitly sent to stderr
    assert "Manifest name 'ghost_pkg/agent' not found" in result.stderr