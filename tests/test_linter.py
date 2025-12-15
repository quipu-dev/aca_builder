# tests/test_linter.py

import pytest
from unittest.mock import MagicMock, ANY
from pathlib import Path
from typer.testing import CliRunner
import yaml

from aca_builder.main import app
from aca_builder.infra.filesystem import FSLibraryRepository, FSManifestRepository

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

VALID_D4_GLOBAL = """
type: d4
lookups:
  d3l-core-safety:
    pillar: d3
    selectors:
      - query: { id: "d3-valid-p0" }
"""

# --- Package-specific Atoms and Lookups ---
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
    lib_path = tmp_path / "lint_test_lib"
    lib_path.mkdir()

    manifests_path = tmp_path / "lint_test_manifests"
    manifests_path.mkdir()

    # --- Create Global/Legacy Components ---
    (lib_path / "d1").mkdir()
    (lib_path / "d2").mkdir()
    (lib_path / "d3").mkdir()
    (lib_path / "d4").mkdir()

    (lib_path / "d1/valid.md").write_text(VALID_D1)
    (lib_path / "d2/valid.md").write_text(VALID_D2)
    (lib_path / "d3/valid.md").write_text(VALID_D3_P0)
    (lib_path / "kernel.md").write_text(VALID_KERNEL)
    (lib_path / "d4/lookups_global.yaml").write_text(VALID_D4_GLOBAL)

    # Legacy atom (no package.yaml, not kernel)
    (lib_path / "d1/legacy_atom.md").write_text(
        "---id: legacy-atom\ntype: d1\n---\nLegacy content."
    )

    # --- Create Package Alpha ---
    pkg_alpha_path = lib_path / "pkg_alpha"
    pkg_alpha_path.mkdir()
    (pkg_alpha_path / "package.yaml").write_text(PKG_ALPHA_CONFIG)
    (pkg_alpha_path / "d4").mkdir()
    (pkg_alpha_path / "d4/lookups.yaml").write_text(PKG_ALPHA_D4)
    (pkg_alpha_path / "d1").mkdir()
    (pkg_alpha_path / "d1/atom_alpha.md").write_text(ATOM_ALPHA)
    (pkg_alpha_path / "d1/atom_alpha_private.md").write_text(ATOM_ALPHA_PRIVATE)

    # --- Create Package Beta ---
    pkg_beta_path = lib_path / "pkg_beta"
    pkg_beta_path.mkdir()
    (pkg_beta_path / "package.yaml").write_text(PKG_BETA_CONFIG)
    (pkg_beta_path / "d1").mkdir()
    (pkg_beta_path / "d1/atom_beta.md").write_text(ATOM_BETA)

    # --- Config File Setup ---
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    config_file = config_dir / "config.yaml"

    config_data = {
        "library_paths": [str(lib_path)],
        "manifest_paths": [str(manifests_path)],
    }
    config_file.write_text(yaml.dump(config_data))

    # --- Monkeypatching ---
    monkeypatch.setattr("aca_builder.config.CONFIG_PATH", config_file)

    return lib_path, manifests_path


@pytest.fixture
def mock_deps(monkeypatch):
    mock_bus = MagicMock()
    real_lib = FSLibraryRepository()
    real_man = FSManifestRepository()
    monkeypatch.setattr(
        "aca_builder.commands._bootstrap", lambda: (real_lib, real_man, mock_bus)
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
    # 验证意图
    # 注意：d1/valid.md, d2/valid.md, d3/valid.md 以及 d1/legacy_atom.md 都是 legacy 的
    # 所以会发出多个警告。我们只验证特定的一个存在即可使用 assert_any_call
    mock_deps.warn.assert_any_call("linter.atom.legacy", atom_id="legacy-atom")
    # 验证没有抛出错误
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
    (lib_path / "d4" / "bad_name.yaml").write_text("""
type: d4
lookups:
  wrong-prefix-lookup:
    pillar: d1
    selectors: []
""")
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0
    mock_deps.lint_error.assert_any_call(
        "linter.lookup.invalid_prefix", key="wrong-prefix-lookup", prefix="d1l-"
    )


def test_lint_d4_naming_violation_mismatch_pillar(setup_lint_environment, mock_deps):
    lib_path, _ = setup_lint_environment
    # Add a D4 with mismatch directly in lib
    (lib_path / "d4" / "mismatch.yaml").write_text("""
type: d4
lookups:
  d1l-mismatch:
    pillar: d3 # Mismatch with 'd1l-'
    selectors: []
""")
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0
    # 修改断言：Linter 先检查前缀是否匹配 pillar。这里 pillar 是 d3，前缀应为 d3l-，但 key 是 d1l-mismatch，所以是无效前缀错误。
    mock_deps.lint_error.assert_any_call(
        "linter.lookup.invalid_prefix", key="d1l-mismatch", prefix="d3l-"
    )


def test_lint_missing_required_metadata(setup_lint_environment, mock_deps):
    lib_path, _ = setup_lint_environment
    (lib_path / "d1" / "missing_id.md").write_text("---\ntype: d1\n---\nContent")
    result = runner.invoke(app, ["lint"])

    assert result.exit_code != 0
    # 验证意图：是否捕捉到了解析错误
    mock_deps.lint_error.assert_any_call("linter.atom.parse_error", path=ANY, error=ANY)

    # 查找特定的调用来验证 error 参数内容
    found = False
    for call in mock_deps.lint_error.call_args_list:
        if call.args[0] == "linter.atom.parse_error":
            if "missing required metadata 'id'" in str(call.kwargs.get("error", "")):
                found = True
                break
    assert found, (
        "Did not find expected 'missing required metadata' error in mock calls"
    )


def test_lint_manifest_nonexistent_lookup(setup_lint_environment, mock_deps):
    _, manifests_path = setup_lint_environment
    (manifests_path / "bad_manifest.yaml").write_text("""
name: Bad Manifest
imports:
  - lookup: d1l-totally-fake
""")
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0
    # 修正断言：Linter 使用文件名 stem 作为 manifest 标识
    mock_deps.lint_error.assert_any_call(
        "linter.manifest.lookup_missing",
        manifest="bad_manifest",  # stem of bad_manifest.yaml
        file="bad_manifest.yaml",
        key="d1l-totally-fake",
        index=0,
    )


def test_lint_manifest_private_lookup_violation(setup_lint_environment, mock_deps):
    _, manifests_path = setup_lint_environment
    (manifests_path / "private_violator.yaml").write_text("""
name: Private Violator
imports:
  - lookup: alpha::d1l-private-alpha # This is private to pkg_alpha
""")
    result = runner.invoke(app, ["lint"])
    assert result.exit_code != 0

    # 修改断言：当 _resolve_lookup_by_key 主动抛出 BuildError 时，linter 会捕获并使用 access_denied_internal
    mock_deps.lint_error.assert_any_call(
        "linter.manifest.access_denied_internal",
        manifest="private_violator",  # stem
        file="private_violator.yaml",
        error=ANY,
    )
    # 验证错误消息内容
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
    (manifests_path / "malformed_manifest.yaml").write_text("""
name: Malformed Manifest
imports: [unclosed_list
""")
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
    (manifests_path / "cross_package_public.yaml").write_text("""
name: Cross Package Public
imports:
  - lookup: alpha::d1l-public-alpha
  - lookup: beta::d1l-public-beta
""")
    result = runner.invoke(app, ["lint"])
    assert result.exit_code == 0
    mock_deps.lint_error.assert_not_called()
    mock_deps.success.assert_called_with("linter.success")


def test_lint_manifest_no_manifests_configured(setup_lint_environment, mock_deps):
    lib_path, _ = setup_lint_environment
    config_dir = lib_path.parent / "config"
    config_file = config_dir / "config.yaml"
    config_data = {
        "library_paths": [str(lib_path)],
        "manifest_paths": [],  # Empty manifest paths
    }
    config_file.write_text(yaml.dump(config_data))

    result = runner.invoke(app, ["lint"])
    assert result.exit_code == 0

    mock_deps.info.assert_any_call("linter.manifest.no_files")
    mock_deps.success.assert_called_with("linter.success")
