# tests/test_info_debug_commands.py

from pathlib import Path
from unittest.mock import ANY, MagicMock

import pytest
import yaml
from typer.testing import CliRunner

from aca_builder import config
from aca_builder.infra.filesystem import FSLibraryRepository, FSManifestRepository
from aca_builder.main import app

runner = CliRunner()

# --- Test Data ---

PKG_A_CONFIG = """
name: "pkg_a"
exports:
  d1l-public-api:
    pillar: d1
    description: "The main public API for package A."
    selectors:
      - ref: "d1l-private-impl"
  d1l-no-desc:
    pillar: d1
    selectors:
      - query: { id: "atom-a-extra" }
"""

PKG_A_INTERNAL_D4 = """
type: d4
lookups:
  d1l-private-impl:
    pillar: d1
    selectors:
      - query: { id: "atom-a-core" }
"""

ATOM_A_CORE = """---
id: atom-a-core
type: d1
---
Content from Atom A Core
"""

ATOM_A_EXTRA = """---
id: atom-a-extra
type: d1
---
Content from Atom A Extra
"""

PKG_B_CONFIG = """
name: "pkg_b"
# No exports
"""

ATOM_B = """---
id: atom-b-core
type: d1
---
Content from Atom B
"""


@pytest.fixture
def setup_test_env(tmp_path: Path, monkeypatch):
    """Set up a test environment with multiple packages for info/debug commands."""
    lib_path = tmp_path / "test_lib"
    lib_path.mkdir()

    # Package A setup
    pkg_a_path = lib_path / "pkg_a"
    (pkg_a_path / "d4").mkdir(parents=True)
    (pkg_a_path / "package.yaml").write_text(PKG_A_CONFIG, encoding="utf-8")
    (pkg_a_path / "d4/internal.yaml").write_text(PKG_A_INTERNAL_D4, encoding="utf-8")
    (pkg_a_path / "atom_core.md").write_text(ATOM_A_CORE, encoding="utf-8")
    (pkg_a_path / "atom_extra.md").write_text(ATOM_A_EXTRA, encoding="utf-8")

    # Package B setup (no exports)
    pkg_b_path = lib_path / "pkg_b"
    pkg_b_path.mkdir()
    (pkg_b_path / "package.yaml").write_text(PKG_B_CONFIG, encoding="utf-8")
    (pkg_b_path / "atom_b.md").write_text(ATOM_B, encoding="utf-8")

    # Config setup
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    config_file = config_dir / "config.yaml"
    config_data = {
        "default_workspace": "default",
        "workspaces": {
            "default": {
                "name": "Default",
                "libraries": [str(lib_path)],
                "manifests": [],
            }
        },
    }
    config_file.write_text(yaml.dump(config_data), encoding="utf-8")

    monkeypatch.setattr("aca_builder.config.CONFIG_PATH", config_file)
    monkeypatch.setenv("ACA_CACHE_DB_PATH", str(tmp_path / "cache.db"))
    return lib_path


@pytest.fixture
def mock_bus(monkeypatch):
    """Mocks the message bus to allow for call assertions."""
    bus = MagicMock()
    from aca_builder.messages import MESSAGES

    bus._format.side_effect = lambda msg_id, **kwargs: MESSAGES.get(msg_id, "").format(
        **kwargs
    )

    ws_id, ws_cfg = config.resolve_workspace()
    real_lib_repo = FSLibraryRepository()
    real_man_repo = FSManifestRepository()
    monkeypatch.setattr(
        "aca_builder.commands._bootstrap",
        lambda ws=None: (real_lib_repo, real_man_repo, bus, ws_id, ws_cfg),
    )
    return bus


# --- Tests for `info` command ---


def test_info_package_success(setup_test_env, mock_bus):
    """Test `info --package` shows public lookups correctly."""
    result = runner.invoke(app, ["info", "--package", "pkg_a"])

    assert result.exit_code == 0
    mock_bus.success.assert_called_once_with("info.pkg.header", name="pkg_a")

    # Check that both public lookups were printed
    assert mock_bus.info.call_count == 2
    mock_bus.info.assert_any_call(
        "info.pkg.item", key="pkg_a::d1l-no-desc", desc="(No description provided)"
    )
    mock_bus.info.assert_any_call(
        "info.pkg.item",
        key="pkg_a::d1l-public-api",
        desc="The main public API for package A.",
    )


def test_info_package_not_found(setup_test_env, mock_bus):
    """Test `info --package` with a non-existent package."""
    result = runner.invoke(app, ["info", "--package", "non_existent_pkg"])

    assert result.exit_code != 0
    mock_bus.warn.assert_called_once_with("info.pkg.not_found", name="non_existent_pkg")


def test_info_package_no_exports(setup_test_env, mock_bus):
    """Test `info --package` with a package that has no public interface."""
    result = runner.invoke(app, ["info", "--package", "pkg_b"])

    assert result.exit_code != 0
    mock_bus.warn.assert_called_once_with("info.pkg.not_found", name="pkg_b")


# --- Tests for `debug` command ---


def test_debug_lookup_success_simple(setup_test_env, mock_bus):
    """Test `debug` on a lookup with a direct query."""
    result = runner.invoke(app, ["debug", "pkg_a::d1l-no-desc"])

    assert result.exit_code == 0
    mock_bus.success.assert_called_once_with("debug.result_header", count=1)
    mock_bus.info.assert_any_call(
        "debug.result_item", atom_id="atom-a-extra", type="d1", pkg="pkg_a", src=ANY
    )


def test_debug_lookup_success_with_ref(setup_test_env, mock_bus):
    """Test `debug` on a lookup that references another private lookup."""
    result = runner.invoke(app, ["debug", "pkg_a::d1l-public-api"])

    assert result.exit_code == 0
    mock_bus.success.assert_called_once_with("debug.result_header", count=1)
    mock_bus.info.assert_any_call(
        "debug.result_item", atom_id="atom-a-core", type="d1", pkg="pkg_a", src=ANY
    )


def test_debug_lookup_not_found(setup_test_env, mock_bus):
    """Test `debug` with a non-existent lookup key."""
    result = runner.invoke(app, ["debug", "fake::lookup"])

    assert result.exit_code != 0
    mock_bus.error.assert_called_once_with("debug.lookup_not_found", key="fake::lookup")
