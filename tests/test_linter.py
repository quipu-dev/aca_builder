# tests/test_linter.py

import pytest
from pathlib import Path
from typer.testing import CliRunner

from aca_builder.main import app

runner = CliRunner()

# --- Reusable Valid Atoms for Tests (v1.1) ---
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
def setup_valid_fs(tmp_path: Path):
    """Fixture to create a completely valid library for success-case testing."""
    lib_path = tmp_path / "aca_library"
    (lib_path / "d1").mkdir(parents=True)
    (lib_path / "d2").mkdir(parents=True)
    (lib_path / "d3").mkdir(parents=True)
    (lib_path / "d4").mkdir()

    (lib_path / "d1/valid.md").write_text(VALID_D1)
    (lib_path / "d2/valid.md").write_text(VALID_D2)
    (lib_path / "d3/valid.md").write_text(VALID_D3_P0)
    (lib_path / "kernel.md").write_text(VALID_KERNEL)
    (lib_path / "d4/lookups.yaml").write_text(VALID_D4)
    return lib_path


def test_lint_success(setup_valid_fs):
    """Tests that a valid library passes the linter."""
    lib_path = setup_valid_fs
    result = runner.invoke(app, ["lint", str(lib_path)])
    assert result.exit_code == 0
    assert "ACA library is valid." in result.stdout


def test_lint_broken_dependency(setup_valid_fs):
    """Tests failure when a D2 atom references a non-existent lookup."""
    lib_path = setup_valid_fs
    (lib_path / "d2/broken_dep.md").write_text("""---
id: d2-broken-dep
type: d2
uses: ["d1l-non-existent"]
---
Content
""")
    result = runner.invoke(app, ["lint", str(lib_path)])
    assert result.exit_code != 0
    assert "Dependency Error" in result.stdout
    assert "references non-existent Lookup 'd1l-non-existent'" in result.stdout


def test_lint_d4_naming_violation_wrong_prefix(setup_valid_fs):
    """Tests failure when D4 lookup key doesn't start with d{X}l-."""
    lib_path = setup_valid_fs
    (lib_path / "d4/bad_name.yaml").write_text("""
type: d4
lookups:
  wrong-prefix-lookup:
    pillar: d1
    selectors: []
""")
    result = runner.invoke(app, ["lint", str(lib_path)])
    assert result.exit_code != 0
    # Error is raised during interface loading, which lint calls
    assert "must start with 'd1l-'" in result.stdout


def test_lint_d4_naming_violation_mismatch_pillar(setup_valid_fs):
    """Tests failure when D4 lookup key prefix doesn't match the pillar."""
    lib_path = setup_valid_fs
    (lib_path / "d4/mismatch.yaml").write_text("""
type: d4
lookups:
  d1l-mismatch:
    pillar: d3
    selectors: []
""")
    result = runner.invoke(app, ["lint", str(lib_path)])
    assert result.exit_code != 0
    assert "must start with 'd3l-'" in result.stdout


def test_lint_missing_required_metadata(setup_valid_fs):
    """Tests failure when 'id' or 'type' is missing."""
    lib_path = setup_valid_fs
    (lib_path / "d1/missing_id.md").write_text("---\ntype: d1\n---\nContent")
    result = runner.invoke(app, ["lint", str(lib_path)])
    assert result.exit_code != 0
    assert "missing required metadata" in result.stdout