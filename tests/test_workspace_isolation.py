from pathlib import Path

import yaml
from typer.testing import CliRunner

from aca_builder.main import app

runner = CliRunner()

KERNEL_ZH = """---
type: kernel
---
# ACA 中文运行时规范
"""

KERNEL_EN = """---
type: kernel
---
# ACA English Runtime Protocol
"""

ATOM_ZH = """---
id: d1-intro
type: d1
---
中文介绍内容
"""

ATOM_EN = """---
id: d1-intro
type: d1
---
English Intro Content
"""


def test_two_workspaces_with_different_kernels_isolated(tmp_path: Path, monkeypatch):
    """验证两个工作区分别拥有不同的 Kernel 与同名原子，互不产生多 Kernel 报错，且独立求解。"""
    ws1_root = tmp_path / "ws_zh"
    ws2_root = tmp_path / "ws_en"

    (ws1_root / "packages" / "pkg").mkdir(parents=True)
    (ws2_root / "packages" / "pkg").mkdir(parents=True)
    (ws1_root / "manifests").mkdir(parents=True)
    (ws2_root / "manifests").mkdir(parents=True)

    # 两个工作区各自拥有一个 kernel.md
    (ws1_root / "packages" / "kernel.md").write_text(KERNEL_ZH, encoding="utf-8")
    (ws2_root / "packages" / "kernel.md").write_text(KERNEL_EN, encoding="utf-8")

    # 两个工作区拥有同名原子 d1-intro
    (ws1_root / "packages" / "pkg" / "intro.md").write_text(ATOM_ZH, encoding="utf-8")
    (ws2_root / "packages" / "pkg" / "intro.md").write_text(ATOM_EN, encoding="utf-8")

    (ws1_root / "manifests" / "main.yaml").write_text(
        "name: agent\nimports:\n  - query: {id: 'd1-intro'}\n", encoding="utf-8"
    )
    (ws2_root / "manifests" / "main.yaml").write_text(
        "name: agent\nimports:\n  - query: {id: 'd1-intro'}\n", encoding="utf-8"
    )

    config_file = tmp_path / "config.yaml"
    config_data = {
        "default_workspace": "ws_zh",
        "workspaces": {
            "ws_zh": {
                "name": "中文工作区",
                "root": str(ws1_root),
            },
            "ws_en": {
                "name": "English Workspace",
                "root": str(ws2_root),
            },
        },
    }
    config_file.write_text(yaml.dump(config_data), encoding="utf-8")
    monkeypatch.setattr("aca_builder.config.CONFIG_PATH", config_file)

    # 1. 默认执行中文工作区 build
    res_zh = runner.invoke(app, ["build", "main"])
    assert res_zh.exit_code == 0, res_zh.stdout
    assert "ACA 中文运行时规范" in res_zh.stdout
    assert "中文介绍内容" in res_zh.stdout
    assert "English" not in res_zh.stdout

    # 2. 显式指定 -w ws_en 执行英文工作区 build
    res_en = runner.invoke(app, ["build", "main", "-w", "ws_en"])
    assert res_en.exit_code == 0, res_en.stdout
    assert "ACA English Runtime Protocol" in res_en.stdout
    assert "English Intro Content" in res_en.stdout
    assert "中文" not in res_en.stdout

    # 3. 运行工作区列举与切换
    res_list = runner.invoke(app, ["workspace", "list"])
    assert res_list.exit_code == 0
    assert "* ws_zh" in res_list.stdout
    assert "ws_en" in res_list.stdout

    # 4. 验证进入非默认工作区子目录时，不会触发智能 PWD 推断，依然使用默认工作区
    monkeypatch.chdir(ws2_root)
    res_pwd = runner.invoke(app, ["build", "main"])
    assert res_pwd.exit_code == 0, res_pwd.stdout
    assert "ACA 中文运行时规范" in res_pwd.stdout
    assert "English" not in res_pwd.stdout
