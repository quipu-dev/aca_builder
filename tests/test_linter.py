# tests/test_linter.py

from pathlib import Path
from unittest.mock import ANY, MagicMock

import pytest
import yaml
from typer.testing import CliRunner

from aca_builder import config
from aca_builder.infra.filesystem import FSLibraryRepository, FSManifestRepository
from aca_builder.main import app

runner = CliRunner()

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

VALID_D4_GLOBAL = """
type: d4
lookups:
  d3l-core-safety:
    pillar: d3
    selectors:
      - query: { id: "d3-valid-p0" }
"""

PKG_ALPHA_CONFIG = """
name: "alpha"
exports:
  d1l-public-alpha:
    pillar: d1
    selectors:
      - query: { id: "d1-alpha-atom" }
"""

PKG_ALPHA_D4 = """
type: d4
lookups:
  d1l-private-alpha:
    pillar: d1
    visibility: private
    selectors:
      - query: { id: "d1-alpha-hidden" }
"""

ATOM_ALPHA = """---
id: d1-alpha-atom
type: d1
---
Alpha Public Content
"""

ATOM_ALPHA_PRIVATE = """---
id: d1-alpha-hidden
type: d1
---
Alpha Private Content
"""

PKG_BETA_CONFIG = """
name: "beta"
exports:
  d1l-public-beta:
    pillar: d1
    selectors:
      - query: {id: "d1-beta-atom"}
"""

ATOM_BETA = """---
id: d1-beta-atom
type: d1
---
Beta Public Content
"""


@pytest.fixture
def setup_lint_environment(tmp_path: Path, monkeypatch):
    ws_root = tmp_path / "lint_ws"
    lib_path = ws_root / "library"
    lib_path.mkdir(parents=True)

    manifests_path = ws_root / "manifests"
    manifests_path.mkdir(parents=True)

    (lib_path / "d1").mkdir()
    (lib_path / "d2").mkdir()
    (lib_path / "d3").mkdir()
    (lib_path / "d4").mkdir()

    (lib_path / "d1/valid.md").write_text(VALID_D1, encoding="utf-8")
    (lib_path / "d2/valid.md").write_text(VALID_D2, encoding="utf-8")
    (lib_path / "d3/valid.md").write_text(VALID_D3_P0, encoding="utf-8")
    (lib_path / "kernel.md").write_text(VALID_KERNEL, encoding="utf-8")
    (lib_path / "d4/lookups_global.yaml").write_text(VALID_D4_GLOBAL, encoding="utf-8")

    (lib_path / "d1/legacy_atom.md").write_text(
        "---id: legacy-atom\ntype: d1\n---\nLegacy content.", encoding="utf-8"
    )

    pkg_alpha_path = lib_path / "pkg_alpha"
    pkg_alpha_path.mkdir()
    (pkg_alpha_path / "package.yaml").write_text(PKG_ALPHA_CONFIG, encoding="utf-8")
    (pkg_alpha_path / "d4").mkdir()
    (pkg_alpha_path / "d4/lookups.yaml").write_text(PKG_ALPHA_D4, encoding="utf-8")
    (pkg_alpha_path / "d1").mkdir()
    (pkg_alpha_path / "d1/atom_alpha.md").write_text(ATOM_ALPHA, encoding="utf-8")
    (pkg_alpha_path / "d1/atom_alpha_private.md").write_text(
        ATOM_ALPHA_PRIVATE, encoding="utf-8"
    )

    pkg_beta_path = lib_path / "pkg_beta"
    pkg_beta_path.mkdir()
    (pkg_beta_path / "package.yaml").write_text(PKG_BETA_CONFIG, encoding="utf-8")
    (pkg_beta_path / "d1").mkdir()
    (pkg_beta_path / "d1/atom_beta.md").write_text(ATOM_BETA, encoding="utf-8")

    config_dir = tmp_path / "config"
    config_dir.mkdir()
    config_file = config_dir / "config.yaml"

    config_data = {
        "default_workspace": "lint_ws",
        "workspaces": {
            "lint_ws": {
                "name": "Lint Workspace",
                "root": str(ws_root),
            }
        },
    }
    config_file.write_text(yaml.dump(config_data), encoding="utf-8")

    monkeypatch.setattr("aca_builder.config.CONFIG_PATH", config_file)
    monkeypatch.setenv("ACA_CACHE_DB_PATH", str(tmp_path / "cache.db"))

    return lib_path, manifests_path


@pytest.fixture
def mock_deps(monkeypatch):
    mock_bus = MagicMock()
    ws_id, ws_cfg = config.resolve_workspace()
    real_lib = FSLibraryRepository()
    real_man = FSManifestRepository()
    monkeypatch.setattr(
        "aca_builder.commands._bootstrap",
        lambda ws=None: (real_lib, real_man, mock_bus, ws_id, ws_cfg),
    )
    return mock_bus


def test_lint_success(setup_lint_environment, mock_deps):
    _, manifests_path = setup_lint_environment

    (manifests_path / "valid_agent.yaml").write_text("""
name: Valid Agent
imports:
  - lookup: d3l-core-safety
  - lookup: alpha::d1l-public-alpha
""")

    result = runner.invoke(app, ["lint"])

    assert result.exit_code == 0
    mock_deps.warn.assert_any_call("linter.atom.legacy", atom_id="legacy-atom")
    mock_deps.lint_error.assert_not_called()
    mock_deps.success.assert_called_with("linter.success")


def test_lint_broken_dependency(setup_lint_environment, mock_deps):
    lib_path, _ = setup_lint_environment
    (lib_path / "d2" / "broken_dep.md").write_text("""---
id: d2-broken-dep
type: d2
uses: ["d1l-non-existent"]
---
Content
""")
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0

    mock_deps.lint_error.assert_any_call(
        "linter.atom.broken_dep",
        atom_id="d2-broken-dep",
        pkg=None,
        key="d1l-non-existent",
    )


def test_lint_d4_naming_violation_wrong_prefix(setup_lint_environment, mock_deps):
    lib_path, _ = setup_lint_environment
    (lib_path / "d4" / "bad_name.yaml").write_text(
        """
type: d4
lookups:
  wrong-prefix-lookup:
    pillar: d1
    selectors:
      - query: { id: "d1-valid" }
""",
        encoding="utf-8",
    )
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0
    mock_deps.lint_error.assert_any_call(
        "linter.lookup.invalid_prefix", key="wrong-prefix-lookup", prefix="d1l-"
    )


def test_lint_d4_empty_selectors_error(setup_lint_environment, mock_deps):
    """测试当 Lookup 未配置任何选择器规则时，Linter 触发报错。"""
    lib_path, _ = setup_lint_environment
    (lib_path / "d4" / "empty_sel.yaml").write_text(
        """
type: d4
lookups:
  d1l-empty:
    pillar: d1
    selectors: []
""",
        encoding="utf-8",
    )
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0
    mock_deps.lint_error.assert_any_call(
        "linter.lookup.empty_selectors", key="d1l-empty"
    )


def test_lint_d4_explicit_atom_id_not_found_error(setup_lint_environment, mock_deps):
    """测试当选择器显式指定的原子 ID 不存在时，Linter 触发报错。"""
    lib_path, _ = setup_lint_environment
    (lib_path / "d4" / "ghost_atom.yaml").write_text(
        """
type: d4
lookups:
  d1l-ghost:
    pillar: d1
    selectors:
      - query: { id: "ghost-atom-does-not-exist" }
""",
        encoding="utf-8",
    )
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0
    mock_deps.lint_error.assert_any_call(
        "linter.lookup.atom_not_found",
        key="d1l-ghost",
        atom_id="ghost-atom-does-not-exist",
    )


def test_lint_d4_predicate_no_match_warning(setup_lint_environment, mock_deps):
    """测试当选择器通过 domain 谓词过滤但命中 0 个原子时，Linter 给出空载告警。"""
    _, manifests_path = setup_lint_environment
    lib_path = setup_lint_environment[0]

    (manifests_path / "valid_agent.yaml").write_text("""
name: Valid Agent
imports:
  - lookup: d3l-core-safety
  - lookup: alpha::d1l-public-alpha
""")

    (lib_path / "d4" / "unmatched.yaml").write_text(
        """
type: d4
lookups:
  d1l-unmatched:
    pillar: d1
    selectors:
      - query: { domain: ["non_existent_domain_xyz"] }
""",
        encoding="utf-8",
    )
    result = runner.invoke(app, ["lint"])
    assert result.exit_code == 0
    mock_deps.warn.assert_any_call(
        "linter.lookup.no_atoms_matched", key="d1l-unmatched"
    )


def test_lint_d4_naming_violation_mismatch_pillar(setup_lint_environment, mock_deps):
    lib_path, _ = setup_lint_environment
    (lib_path / "d4" / "mismatch.yaml").write_text(
        """
type: d4
lookups:
  d1l-mismatch:
    pillar: d3
    selectors: []
""",
        encoding="utf-8",
    )
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0
    mock_deps.lint_error.assert_any_call(
        "linter.lookup.invalid_prefix", key="d1l-mismatch", prefix="d3l-"
    )


def test_lint_missing_required_metadata(setup_lint_environment, mock_deps):
    lib_path, _ = setup_lint_environment
    (lib_path / "d1" / "missing_id.md").write_text(
        "---\ntype: d1\n---\nContent", encoding="utf-8"
    )
    result = runner.invoke(app, ["lint"])

    assert result.exit_code != 0
    mock_deps.lint_error.assert_any_call("linter.atom.parse_error", path=ANY, error=ANY)

    found = False
    for call in mock_deps.lint_error.call_args_list:
        if call.args[
            0
        ] == "linter.atom.parse_error" and "missing required metadata 'id'" in str(
            call.kwargs.get("error", "")
        ):
            found = True
            break
    assert found, (
        "Did not find expected 'missing required metadata' error in mock calls"
    )


def test_lint_manifest_nonexistent_lookup(setup_lint_environment, mock_deps):
    _, manifests_path = setup_lint_environment
    (manifests_path / "bad_manifest.yaml").write_text(
        """
name: Bad Manifest
imports:
  - lookup: d1l-totally-fake
""",
        encoding="utf-8",
    )
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0
    mock_deps.lint_error.assert_any_call(
        "linter.manifest.lookup_missing",
        manifest="bad_manifest",
        file="bad_manifest.yaml",
        key="d1l-totally-fake",
        index=0,
    )


def test_lint_manifest_private_lookup_violation(setup_lint_environment, mock_deps):
    _, manifests_path = setup_lint_environment
    (manifests_path / "private_violator.yaml").write_text(
        """
name: Private Violator
imports:
  - lookup: alpha::d1l-private-alpha
""",
        encoding="utf-8",
    )
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0

    mock_deps.lint_error.assert_any_call(
        "linter.manifest.access_denied_internal",
        manifest="private_violator",
        file="private_violator.yaml",
        error=ANY,
    )
    found_error = False
    for call in mock_deps.lint_error.call_args_list:
        if call.args[0] == "linter.manifest.access_denied_internal":
            err_str = str(call.kwargs.get("error", ""))
            if (
                "Access denied" in err_str
                and "'d1l-private-alpha' in package 'alpha' is private" in err_str
            ):
                found_error = True
    assert found_error


def test_lint_manifest_invalid_yaml(setup_lint_environment, mock_deps):
    _, manifests_path = setup_lint_environment
    (manifests_path / "malformed_manifest.yaml").write_text(
        """
name: Malformed Manifest
imports: [unclosed_list
""",
        encoding="utf-8",
    )
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0
    mock_deps.lint_error.assert_any_call(
        "linter.manifest.load_error",
        manifest="malformed_manifest",
        file="malformed_manifest.yaml",
        error=ANY,
    )


def test_lint_manifest_valid_cross_package_public_lookup(
    setup_lint_environment, mock_deps
):
    _, manifests_path = setup_lint_environment
    (manifests_path / "cross_package_public.yaml").write_text(
        """
name: Cross Package Public
imports:
  - lookup: alpha::d1l-public-alpha
  - lookup: beta::d1l-public-beta
""",
        encoding="utf-8",
    )
    result = runner.invoke(app, ["lint"])
    assert result.exit_code == 0
    mock_deps.lint_error.assert_not_called()
    mock_deps.success.assert_called_with("linter.success")


def test_lint_manifest_no_manifests_configured(setup_lint_environment, mock_deps):
    _, manifests_path = setup_lint_environment
    # 彻底清理 manifests 目录下的文件，模拟零清单场景
    for f in manifests_path.glob("*.yaml"):
        f.unlink()

    result = runner.invoke(app, ["lint"])
    assert result.exit_code == 0

    mock_deps.info.assert_any_call("linter.manifest.no_files")
    mock_deps.success.assert_called_with("linter.success")
