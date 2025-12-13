# tests/test_builder.py

import pytest
from pathlib import Path
from typer.testing import CliRunner

from aca_builder.main import app

runner = CliRunner()

# --- Test Data: ACA v1.1 Library ---

D1_PROFILE = """---
id: d1-profile-fhrsk
type: d1
domain: ["system", "fhrsk"]
status: stable
---
# 系统档案: Fhrsk
- **名称**: Fhrsk
- **版本**: 1.1
"""

D2_CORE_SKILL = """---
id: d2-core-task
type: d2
domain: ["general"]
status: stable
uses:
  - d1l-system-profile
  - d3l-core-safety
---
# D2 流程: 核心任务执行

1.  **初始化**: 应用 `d3l-core-safety`。
2.  **上下文查询**: 查询 `d1l-system-profile`。
3.  **执行**: 根据用户指令执行任务。
"""

D3_AXIOM = """---
id: d3-axiom-safety
type: d3
priority: 0
aspect: safety
---
**公理**: 严禁伪造信息。
"""

D3_PRINCIPLE_IDENTITY = """---
id: d3-principle-identity-fhrsk
type: d3
priority: 1
aspect: identity
---
**原则**: 身份标识为 "Fhrsk"。
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
      - query: { id: "d3-principle-identity-fhrsk" }

  d2l-entry-point:
    pillar: d2
    selectors:
      - query: { id: "d2-core-task" }
"""

# Manifest v1.1
MANIFEST_YAML = """
name: "Fhrsk Test Agent"
version: "1.1"
imports:
  - lookup: d2l-entry-point # We will define this lookup via a test fixture injection or just use a query for simplicity in some tests
  - query: { id: "d2-core-task" } # Loading the skill directly for this test
"""


@pytest.fixture
def setup_test_fs(tmp_path: Path):
    """
    Creates a temporary file system with a library, includes, and manifests.
    """
    lib_path = tmp_path / "aca_library"
    manifest_path = tmp_path / "manifests"
    includes_path = tmp_path / "includes"

    # Create directories
    (lib_path / "d1").mkdir(parents=True)
    (lib_path / "d2/skills").mkdir(parents=True)
    (lib_path / "d3").mkdir()
    (lib_path / "d4").mkdir()
    manifest_path.mkdir()
    includes_path.mkdir()

    # Create files
    (lib_path / "d1/profile.md").write_text(D1_PROFILE)
    (lib_path / "d2/skills/core_task.md").write_text(D2_CORE_SKILL)
    (lib_path / "d3/axiom.md").write_text(D3_AXIOM)
    (lib_path / "d3/identity.md").write_text(D3_PRINCIPLE_IDENTITY)
    (lib_path / "kernel.md").write_text(KERNEL_CONTENT)
    (lib_path / "d4/system_lookups.yaml").write_text(D4_LOOKUPS)
    
    (manifest_path / "test_agent.yaml").write_text(MANIFEST_YAML)

    return tmp_path


def test_aca_builder_end_to_end(setup_test_fs):
    """End-to-end test: build a correct prompt from a manifest and library."""
    project_path = setup_test_fs
    manifest_file = project_path / "manifests/test_agent.yaml"
    library_folder = project_path / "aca_library"

    result = runner.invoke(
        app, ["build", str(manifest_file), "--library-path", str(library_folder)]
    )

    assert result.exit_code == 0, result.stdout
    # Check kernel is present and at the top
    assert "ACA Runtime Protocol" in result.stdout
    # Check dependencies resolved via lookups
    assert "严禁伪造信息" in result.stdout # from d3l-core-safety
    assert "身份标识为" in result.stdout # from d3l-core-safety -> identity
    assert "系统档案: Fhrsk" in result.stdout # from d1l-system-profile


def test_build_ignores_file_without_fm(setup_test_fs):
    """Test that `build` command silently ignores .md files without front matter."""
    project_path = setup_test_fs
    (project_path / "aca_library/d1/readme.md").write_text(
        "# Just a readme\nNo front matter."
    )

    manifest_file = project_path / "manifests/test_agent.yaml"
    library_folder = project_path / "aca_library"

    result = runner.invoke(
        app, ["build", str(manifest_file), "--library-path", str(library_folder)]
    )

    assert result.exit_code == 0
    assert "Just a readme" not in result.stdout


def test_recursive_d2_lookup(setup_test_fs):
    """Test that a D2 can use another D2 via d2l lookup."""
    project_path = setup_test_fs
    lib_path = project_path / "aca_library"
    manifest_path = project_path / "manifests/test_agent.yaml"

    # 1. Define a sub-skill
    D2_SUB_SKILL = """---
id: d2-sub-skill
type: d2
---
I am a sub skill.
"""
    (lib_path / "d2/skills/sub.md").write_text(D2_SUB_SKILL)

    # 2. Update D4 to include a d2l lookup
    D4_UPDATE = """
type: d4
lookups:
  d2l-sub-skill:
    pillar: d2
    selectors:
      - query: { id: "d2-sub-skill" }
"""
    (lib_path / "d4/extra.yaml").write_text(D4_UPDATE)

    # 3. Update main skill to use d2l-sub-skill
    # Note: D2_CORE_SKILL already has `uses` list, we append to it by rewriting.
    D2_UPDATED = """---
id: d2-core-task
type: d2
uses:
  - d2l-sub-skill
---
Main skill content.
"""
    (lib_path / "d2/skills/core_task.md").write_text(D2_UPDATED)

    # 4. Build
    result = runner.invoke(
        app, ["build", str(manifest_path), "--library-path", str(lib_path)]
    )

    assert result.exit_code == 0, result.stdout
    assert "I am a sub skill" in result.stdout


def test_multi_level_d2_dependency_chain(setup_test_fs):
    """
    Validates that the resolver can handle a dependency chain: A -> B -> C.
    """
    project_path = setup_test_fs
    lib_path = project_path / "aca_library"
    manifest_path = project_path / "manifests/test_agent.yaml"

    # 1. Define the skill chain
    D2_SKILL_A = """---
id: d2-skill-a
type: d2
uses: ["d2l-skill-b"]
---
Content of Skill A.
"""
    D2_SKILL_B = """---
id: d2-skill-b
type: d2
uses: ["d2l-skill-c"]
---
Content of Skill B.
"""
    D2_SKILL_C = """---
id: d2-skill-c
type: d2
---
Content of Skill C.
"""
    (lib_path / "d2/a.md").write_text(D2_SKILL_A)
    (lib_path / "d2/b.md").write_text(D2_SKILL_B)
    (lib_path / "d2/c.md").write_text(D2_SKILL_C)

    # 2. Define the lookups for the chain in D4
    D4_CHAIN_LOOKUPS = """
type: d4
lookups:
  d2l-skill-b:
    pillar: d2
    selectors:
      - query: { id: "d2-skill-b" }
  d2l-skill-c:
    pillar: d2
    selectors:
      - query: { id: "d2-skill-c" }
"""
    (lib_path / "d4/chain.yaml").write_text(D4_CHAIN_LOOKUPS)

    # 3. Update manifest to only load the head of the chain (Skill A)
    (manifest_path).write_text("""
name: "Chain Test Agent"
version: "1.0"
imports:
  - query: { id: "d2-skill-a" }
""")

    # 4. Run the build
    result = runner.invoke(
        app, ["build", str(manifest_path), "--library-path", str(lib_path)]
    )

    # 5. Assert that all skills in the chain were resolved and included
    assert result.exit_code == 0, result.stdout
    assert "Content of Skill A" in result.stdout
    assert "Content of Skill B" in result.stdout
    assert "Content of Skill C" in result.stdout


def test_manifest_override_success(setup_test_fs):
    """
    Test that manifest overrides successfully redirect a lookup to a different atom.
    This simulates 'Parameter Injection' or 'Context Switching' via manifest.
    """
    project_path = setup_test_fs
    lib_path = project_path / "aca_library"
    manifest_path = project_path / "manifests/test_override.yaml"

    # 1. Create two potential D1 targets (Default vs Special)
    (lib_path / "d1/default.md").write_text("""---
id: d1-default
type: d1
---
I am the Default Context.
""")
    (lib_path / "d1/special.md").write_text("""---
id: d1-special
type: d1
---
I am the Special Context.
""")

    # 2. Create a D2 skill that uses a generic lookup
    (lib_path / "d2/skills/reader.md").write_text("""---
id: d2-reader
type: d2
uses: ["d1l-context"]
---
Reading context...
""")

    # 3. Create D4 defining the default wiring
    (lib_path / "d4/context.yaml").write_text("""
type: d4
lookups:
  d1l-context:
    pillar: d1
    selectors:
      - query: { id: "d1-default" }
""")

    # 4. Create Manifest WITH override
    manifest_path.write_text("""
name: "Override Test"
version: "1.0"
imports:
  - query: { id: "d2-reader" }
overrides:
  d1l-context:
    selectors:
      - query: { id: "d1-special" }
""")

    # 5. Build
    result = runner.invoke(
        app, ["build", str(manifest_path), "--library-path", str(lib_path)]
    )

    assert result.exit_code == 0, result.stdout
    # The special context should be present because of the override
    assert "I am the Special Context" in result.stdout
    # The default context should NOT be present
    assert "I am the Default Context" not in result.stdout


def test_manifest_override_non_existent_lookup(setup_test_fs):
    """
    Test that overriding a non-existent lookup raises a BuildError.
    This prevents typo bugs in manifests.
    """
    project_path = setup_test_fs
    lib_path = project_path / "aca_library"
    manifest_path = project_path / "manifests/fail_override.yaml"

    # Minimal setup to satisfy kernel check
    (lib_path / "kernel.md").write_text("---\ntype: kernel\n---\nKernel")
    
    manifest_path.write_text("""
name: "Fail Test"
imports: []
overrides:
  d1l-ghost-lookup:
    selectors: []
""")

    result = runner.invoke(
        app, ["build", str(manifest_path), "--library-path", str(lib_path)]
    )

    assert result.exit_code != 0
    assert "Manifest Override Error" in result.stdout
    assert "d1l-ghost-lookup" in result.stdout