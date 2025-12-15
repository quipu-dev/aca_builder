# tests/test_linter.py

import pytest
from pathlib import Path
from typer.testing import CliRunner
import yaml

from aca_builder.main import app

runner = CliRunner()

# --- Reusable Valid Atoms ---
VALID_D1 = """---
id: d1-valid
type: d1
---
Valid D1 content.
"""

VALID_D2 = """---
id: d2-valid
type: d2
uses:
  - d3l-core-safety
---
Valid D2 content.
"""

VALID_D3_P0 = """---
id: d3-valid-p0
type: d3
priority: 0
---
Valid D3 P0 content.
"""

VALID_KERNEL = """---
type: kernel
---
Valid Kernel
"""

VALID_D4 = """
type: d4
lookups:
  d3l-core-safety:
    pillar: d3
    selectors:
      - query: { id: "d3-valid-p0" }
"""

@pytest.fixture
def setup_lint_environment(tmp_path: Path, monkeypatch):
    """
    Fixture to create a temporary library, a mock global config pointing to it,
    and monkeypatch the config path for the linter to use.
    """
    # --- File System Setup ---
    lib_path = tmp_path / "lint_test_lib"
    lib_path.mkdir()

    # --- Config File Setup ---
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    config_file = config_dir / "config.yaml"
    
    config_data = {
        "library_paths": [str(lib_path)],
        # manifest_paths are not needed for linting libraries
    }
    config_file.write_text(yaml.dump(config_data))

    # --- Monkeypatching ---
    monkeypatch.setattr("aca_builder.config.CONFIG_PATH", config_file)

    return lib_path


def test_lint_success(setup_lint_environment):
    """Tests that a valid library passes the linter by reading from config."""
    lib_path = setup_lint_environment
    (lib_path / "d1").mkdir(parents=True)
    (lib_path / "d2").mkdir()
    (lib_path / "d3").mkdir()
    (lib_path / "d4").mkdir()

    (lib_path / "d1/valid.md").write_text(VALID_D1)
    (lib_path / "d2/valid.md").write_text(VALID_D2)
    (lib_path / "d3/valid.md").write_text(VALID_D3_P0)
    (lib_path / "kernel.md").write_text(VALID_KERNEL)
    (lib_path / "d4/lookups.yaml").write_text(VALID_D4)
    
    result = runner.invoke(app, ["lint"])
    
    assert result.exit_code == 0, result.output
    assert "All configured ACA libraries are valid" in result.output


def test_lint_broken_dependency(setup_lint_environment):
    """Tests failure when a D2 references a non-existent lookup."""
    lib_path = setup_lint_environment
    # A valid library structure is needed for the linter to proceed
    (lib_path / "d2").mkdir()
    (lib_path / "kernel.md").write_text(VALID_KERNEL) # Kernel is always required

    (lib_path / "d2/broken_dep.md").write_text("""---
id: d2-broken-dep
type: d2
uses: ["d1l-non-existent"]
---
Content
""")
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0
    assert "references non-existent Lookup 'd1l-non-existent'" in result.output


def test_lint_d4_naming_violation_wrong_prefix(setup_lint_environment):
    """Tests D4 failure when a lookup key has the wrong prefix."""
    lib_path = setup_lint_environment
    (lib_path / "d4").mkdir()
    (lib_path / "kernel.md").write_text(VALID_KERNEL)

    (lib_path / "d4/bad_name.yaml").write_text("""
type: d4
lookups:
  wrong-prefix-lookup:
    pillar: d1
    selectors: []
""")
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0
    # Lint errors are printed to stdout (default secho behavior)
    assert "must start with 'd1l-'" in result.stdout


def test_lint_d4_naming_violation_mismatch_pillar(setup_lint_environment):
    """Tests D4 failure when a a key's prefix and pillar mismatch."""
    lib_path = setup_lint_environment
    (lib_path / "d4").mkdir()
    (lib_path / "kernel.md").write_text(VALID_KERNEL)

    (lib_path / "d4/mismatch.yaml").write_text("""
type: d4
lookups:
  d1l-mismatch:
    pillar: d3 # Mismatch with 'd1l-'
    selectors: []
""")
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0
    # Lint errors are printed to stdout (default secho behavior)
    assert "must start with 'd3l-'" in result.stdout


def test_lint_missing_required_metadata(setup_lint_environment):
    """Tests failure when an atom is missing 'id' or 'type'."""
    lib_path = setup_lint_environment
    (lib_path / "d1").mkdir()
    (lib_path / "kernel.md").write_text(VALID_KERNEL)

    (lib_path / "d1/missing_id.md").write_text("---\ntype: d1\n---\nContent")
    result = runner.invoke(app, ["lint"])
    
    assert result.exit_code != 0
    assert "missing required metadata 'id'" in result.output