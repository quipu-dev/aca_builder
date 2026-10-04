# aca_builder/config.py

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

CONFIG_PATH = Path.home() / ".config" / "aca" / "config.yaml"


@dataclass
class WorkspaceConfig:
    id: str
    name: str
    root: Path | None
    library_paths: list[Path]
    manifest_paths: list[Path]
    post_process_hook: str | None


def load_config() -> dict[str, Any]:
    """Loads the ACA global configuration file."""
    if not CONFIG_PATH.exists():
        return {}
    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except (OSError, yaml.YAMLError):
        return {}


def save_config(config_data: dict[str, Any]) -> None:
    """Saves the ACA global configuration file."""
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CONFIG_PATH.open("w", encoding="utf-8") as f:
        yaml.safe_dump(config_data, f, sort_keys=False, allow_unicode=True)


def _expand_path(p: str | Path, base_dir: Path) -> Path:
    p_str = str(p)
    if p_str.startswith(("~", "/")):
        return Path(p_str).expanduser().resolve()
    return (base_dir / p_str).resolve()


def get_workspaces(
    config_data: dict[str, Any] | None = None,
) -> dict[str, WorkspaceConfig]:
    """Parses and returns all configured workspaces."""
    if config_data is None:
        config_data = load_config()

    base_dir = CONFIG_PATH.parent

    # 统一预处理：若输入为平铺单工作区格式，自动规范为 workspaces 字典
    raw_workspaces = config_data.get("workspaces")
    if not raw_workspaces and (
        "libraries" in config_data
        or "library_paths" in config_data
        or "manifests" in config_data
        or "manifest_paths" in config_data
    ):
        raw_workspaces = {
            "default": {
                "name": "Default Workspace",
                "libraries": config_data.get("libraries")
                or config_data.get("library_paths")
                or [],
                "manifests": config_data.get("manifests")
                or config_data.get("manifest_paths")
                or [],
                "post_process_hook": config_data.get("post_process_hook"),
            }
        }
    elif not raw_workspaces:
        raw_workspaces = {}

    result: dict[str, WorkspaceConfig] = {}

    for ws_id, ws_data in raw_workspaces.items():
        if not isinstance(ws_data, dict):
            continue

        display_name = ws_data.get("name", ws_id)
        raw_root = ws_data.get("root")
        root_path = _expand_path(raw_root, base_dir) if raw_root else None

        # 解析 library_paths
        raw_libs = ws_data.get("libraries") or ws_data.get("library_paths")
        if raw_libs:
            lib_paths = [_expand_path(p, root_path or base_dir) for p in raw_libs]
        elif root_path and root_path.exists():
            cand_lib = root_path / "library"
            cand_pkg = root_path / "packages"
            if cand_lib.exists():
                lib_paths = [cand_lib]
            elif cand_pkg.exists():
                lib_paths = [cand_pkg]
            else:
                lib_paths = [root_path]
        else:
            lib_paths = []

        # 解析 manifest_paths
        raw_mans = ws_data.get("manifests") or ws_data.get("manifest_paths")
        if raw_mans:
            man_paths = [_expand_path(p, root_path or base_dir) for p in raw_mans]
        elif root_path and root_path.exists():
            cand_man = root_path / "manifests"
            if cand_man.exists():
                man_paths = [cand_man]
            else:
                man_paths = [root_path]
        else:
            man_paths = []

        hook = ws_data.get("post_process_hook")

        result[ws_id] = WorkspaceConfig(
            id=ws_id,
            name=display_name,
            root=root_path,
            library_paths=lib_paths,
            manifest_paths=man_paths,
            post_process_hook=hook,
        )

    return result


def resolve_workspace(
    workspace_name: str | None = None, config_data: dict[str, Any] | None = None
) -> tuple[str, WorkspaceConfig]:
    """
    Resolves the target workspace.
    Priority:
    1. Explicitly requested workspace_name
    2. default_workspace in config
    3. First workspace in list
    4. Fallback ephemeral workspace for current working directory
    """
    if config_data is None:
        config_data = load_config()

    workspaces = get_workspaces(config_data)

    # 1. 显式指定
    if workspace_name:
        if workspace_name in workspaces:
            return workspace_name, workspaces[workspace_name]
        if workspace_name == "default" and not workspaces:
            current_cwd = Path.cwd().resolve()
            fallback_ws = WorkspaceConfig(
                id="default",
                name="Default Workspace",
                root=current_cwd,
                library_paths=[current_cwd],
                manifest_paths=[current_cwd],
                post_process_hook=None,
            )
            return "default", fallback_ws
        raise ValueError(f"Workspace '{workspace_name}' is not configured.")

    # 2. 默认工作区
    default_ws = config_data.get("default_workspace")
    if default_ws and default_ws in workspaces:
        return default_ws, workspaces[default_ws]

    # 3. 首个配置的工作区
    if workspaces:
        first_key = next(iter(workspaces.keys()))
        return first_key, workspaces[first_key]

    # 4. 空保底：以当前目录自建临时默认工作区
    current_cwd = Path.cwd().resolve()
    fallback_id = "default"
    fallback_ws = WorkspaceConfig(
        id=fallback_id,
        name="Default Workspace",
        root=current_cwd,
        library_paths=[current_cwd],
        manifest_paths=[current_cwd],
        post_process_hook=None,
    )
    return fallback_id, fallback_ws


def get_cache_db_path(
    config_data: dict[str, Any] | None = None,
    workspace_id: str | None = None,
) -> Path:
    """[已废弃] 仅保留向后兼容接口。"""
    return Path("/dev/null")


def get_workspace_cache_db_path(workspace_id: str) -> Path:
    """[已废弃] 仅保留向后兼容接口。"""
    return Path("/dev/null")
