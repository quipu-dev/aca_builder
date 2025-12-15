# tests/test_packages.py

import pytest
from pathlib import Path
from typer.testing import CliRunner
import yaml

from aca_builder.main import app
from aca_builder.core import (
    load_library,
    load_interfaces,
    evaluate_lookup,
    _resolve_lookup_by_key,
)
from aca_builder.domain.events import BuildError

runner = CliRunner()

# --- Mock Data ---

PKG_A_CONFIG = """
name: "pkg_a"
version: "1.0"
exports:
  d1l-public-facade:
    pillar: d1
    selectors:
      - ref: "d1l-internal-impl"
"""

PKG_A_INTERNAL_D4 = """
type: d4
lookups:
  d1l-internal-impl:
    pillar: d1
    selectors:
      - query: { id: "atom-a-core" }
"""

ATOM_A = """---
id: atom-a-core
type: d1
---
Content A
"""

ATOM_B = """---
id: atom-b-user
type: d2
uses:
  - "pkg_a::d1l-public-facade"
---
Content B
"""

KERNEL = """---
type: kernel
---
Kernel
"""


@pytest.fixture
def setup_package_env(tmp_path: Path, monkeypatch):
    """
    Creates a library with 'pkg_a' (with package.yaml) and a 'pkg_b' (implicit/no-config for now or just root).
    """
    lib_path = tmp_path / "lib"
    lib_path.mkdir()

    # pkg_a setup
    pkg_a = lib_path / "pkg_a"
    pkg_a.mkdir()
    (pkg_a / "package.yaml").write_text(PKG_A_CONFIG)
    (pkg_a / "d4").mkdir()
    (pkg_a / "d4/internal.yaml").write_text(PKG_A_INTERNAL_D4)
    (pkg_a / "atom_a.md").write_text(ATOM_A)

    # pkg_b setup (or just root level atom)
    (lib_path / "atom_b.md").write_text(ATOM_B)

    # Kernel
    (lib_path / "kernel.md").write_text(KERNEL)

    # Config setup
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    config_file = config_dir / "config.yaml"
    config_file.write_text(yaml.dump({"library_paths": [str(lib_path)]}))

    monkeypatch.setattr("aca_builder.config.CONFIG_PATH", config_file)

    return lib_path


def test_package_meta_injection(setup_package_env):
    """Test that atoms inside a directory with package.yaml get the 'package' meta."""
    lib_path = setup_package_env
    library = load_library([lib_path])

    assert "atom-a-core" in library
    # Atom A is inside pkg_a
    assert library["atom-a-core"]["package"] == "pkg_a"

    # Atom B is in root, no package
    assert library["atom-b-user"]["package"] is None


def test_ref_delegation_resolution(setup_package_env):
    """
    Test the chain:
    Public Export (d1l-public-facade) -> Ref -> Private Lookup (d1l-internal-impl) -> Query -> Atom A
    """
    lib_path = setup_package_env
    library = load_library([lib_path])
    interfaces = load_interfaces([lib_path])

    # Locate the public lookup
    public_def = _resolve_lookup_by_key(
        "pkg_a::d1l-public-facade", context_pkg=None, interfaces=interfaces
    )
    assert public_def is not None
    assert public_def["visibility"] == "public"

    # Evaluate it
    selected_ids = evaluate_lookup(library, public_def, interfaces)

    assert "atom-a-core" in selected_ids


def test_explicit_private_access_fails(setup_package_env):
    """Test that accessing a private lookup explicitly via pkg::name fails."""
    lib_path = setup_package_env
    interfaces = load_interfaces([lib_path])

    # Try to resolve internal impl explicitly from outside
    with pytest.raises(BuildError) as excinfo:
        _resolve_lookup_by_key(
            "pkg_a::d1l-internal-impl", context_pkg="other_pkg", interfaces=interfaces
        )

    assert "Access denied" in str(excinfo.value)
    assert "is private" in str(excinfo.value)


def test_build_with_namespace_dependency(setup_package_env):
    """Test full build process where a D2 atom references a dependency via 'pkg::lookup'."""
    # We create a manifest that builds Atom B.
    # Atom B uses "pkg_a::d1l-public-facade".
    # Build should succeed and include Atom A (transitive dependency).

    manifest_path = setup_package_env.parent / "manifest.yaml"
    manifest_path.write_text("""
name: Test Manifest
imports:
  - query: { id: "atom-b-user" }
""")

    result = runner.invoke(app, ["build", str(manifest_path), "-f"])

    assert result.exit_code == 0, result.stdout
    # Output should contain Content A (dependency) and Content B (target)
    assert "Content A" in result.stdout
    assert "Content B" in result.stdout
