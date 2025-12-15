# tests/test_manifest_discovery.py

import pytest
from pathlib import Path
from typer.testing import CliRunner
import yaml

from aca_builder.main import app

runner = CliRunner()


@pytest.fixture
def setup_manifest_fs(tmp_path: Path, monkeypatch):
    """Creates a complex manifest structure and a mock global config."""
    manifests_root = tmp_path / "test_manifests"

    # Create package directories
    (manifests_root / "pkg1").mkdir(parents=True)
    (manifests_root / "pkg2/sub_pkg").mkdir(parents=True)

    # Create manifest files
    (manifests_root / "pkg1/agent_one.yaml").write_text("name: agent_one")
    (manifests_root / "pkg1/agent_two.yaml").write_text("name: agent_two")
    (manifests_root / "pkg2/sub_pkg/agent_three.yaml").write_text("name: agent_three")
    (manifests_root / "root_agent.yaml").write_text("name: root_agent")

    # --- Config File Setup ---
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    config_file = config_dir / "config.yaml"

    # We must point to the actual dummy library path we will create in the test functions
    dummy_lib_path = tmp_path / "dummy_lib"

    config_data = {
        "manifest_paths": [str(manifests_root)],
        "library_paths": [str(dummy_lib_path)],
    }
    config_file.write_text(yaml.dump(config_data))

    # --- Monkeypatching ---
    monkeypatch.setattr("aca_builder.config.CONFIG_PATH", config_file)

    return manifests_root


def test_list_manifests_discovery(setup_manifest_fs):
    """Test that `list` correctly discovers root, nested, and sub-packaged manifests."""
    result = runner.invoke(app, ["list"])

    assert result.exit_code == 0
    output = result.stdout.strip().split("\n")

    # Use a set for order-independent comparison
    expected_manifests = {
        "pkg1/agent_one",
        "pkg1/agent_two",
        "pkg2/sub_pkg/agent_three",
        "root_agent",
    }
    assert set(output) == expected_manifests


def test_build_resolves_nested_manifest_name(setup_manifest_fs):
    """Test that `build` can resolve a manifest name from a nested package."""
    # We need a minimal valid library for the build to proceed far enough
    dummy_lib_path = setup_manifest_fs.parent / "dummy_lib"
    dummy_lib_path.mkdir()
    (dummy_lib_path / "kernel.md").write_text("---\ntype: kernel\n---\nKernel")
    (dummy_lib_path / "dummy.md").write_text("---\nid: dummy\ntype: d1\n---\nContent")

    manifest_file = setup_manifest_fs / "pkg1/agent_one.yaml"
    manifest_file.write_text("""
name: Test Agent
imports:
  - query: {id: "dummy"}
""")

    result = runner.invoke(app, ["build", "pkg1/agent_one"])

    assert result.exit_code == 0, result.output
    # Check that it built something from the correct manifest
    assert "Kernel" in result.stdout
    assert "Content" in result.stdout


def test_build_resolves_root_manifest_name(setup_manifest_fs):
    """Test that `build` can resolve a manifest name from the root."""
    dummy_lib_path = setup_manifest_fs.parent / "dummy_lib"
    if not dummy_lib_path.exists():
        dummy_lib_path.mkdir()
        (dummy_lib_path / "kernel.md").write_text("---\ntype: kernel\n---\nKernel")
        (dummy_lib_path / "dummy.md").write_text(
            "---\nid: dummy\ntype: d1\n---\nContent"
        )

    manifest_file = setup_manifest_fs / "root_agent.yaml"
    manifest_file.write_text("""
name: Root Test Agent
imports:
  - query: {id: "dummy"}
""")

    result = runner.invoke(app, ["build", "root_agent"])

    assert result.exit_code == 0, result.output
    assert "Kernel" in result.stdout
