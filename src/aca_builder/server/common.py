from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path
from typing import Any

import yaml

from aca_builder import config

# 运行时全局活动工作区 ID
_active_workspace_id: str | None = None

# SSE 活动订阅队列池
active_subscribers: set[asyncio.Queue] = set()


def get_current_workspace_id(x_workspace: str | None = None) -> str:
    """获取当前请求对应的工作区 ID（优先 Header，其次内存活动态，最后配置默认）"""
    global _active_workspace_id
    if x_workspace:
        return x_workspace
    if _active_workspace_id:
        return _active_workspace_id
    ws_id, _ = config.resolve_workspace()
    _active_workspace_id = ws_id
    return ws_id


def set_active_workspace_id(ws_id: str | None) -> None:
    global _active_workspace_id
    _active_workspace_id = ws_id


def broadcast_change(change_type: str = "LIBRARY_DIRTY") -> None:
    """向所有打开 IDE 的 SSE 客户端广播工作区或文件变更通知"""
    for q in list(active_subscribers):
        try:
            q.put_nowait(change_type)
        except asyncio.QueueFull:
            pass


def find_package_dir_and_yaml(
    library_paths: list[Path], package_name: str
) -> tuple[Path | None, Path | None]:
    """在当前已配置的知识库路径中快速定位指定包的所在目录与 package.yaml 文件"""
    for lib_root in library_paths:
        if not lib_root.exists():
            continue
        for pkg_file in lib_root.rglob("package.yaml"):
            try:
                pkg_data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                if pkg_data and pkg_data.get("name") == package_name:
                    return pkg_file.parent, pkg_file
            except (yaml.YAMLError, OSError):
                continue
    return None, None


def execute_hook(hook_command: str | None, prompt_text: str) -> str | None:
    """安全执行外部后处理 Pipeline 钩子命令"""
    if not hook_command:
        return None
    try:
        proc = subprocess.run(
            hook_command,
            shell=True,
            input=prompt_text,
            text=True,
            capture_output=True,
            check=False,
        )
        if proc.returncode == 0:
            return proc.stdout
        return f"[Hook Execution Error: exit code {proc.returncode}]\n{proc.stderr}"
    except Exception as e:
        return f"[Hook Execution Exception: {e}]"


class CollectingMessageBus:
    """用于 /lint 接口收集诊断问题与警告的内存总线"""

    def __init__(self):
        self.issues: list[dict[str, Any]] = []
        self.error_count = 0
        self.warn_count = 0

    def emit(self, event: Any) -> None:
        pass

    def _format(self, msg_id: str, **kwargs: Any) -> str:
        from aca_builder.messages import MESSAGES

        template = MESSAGES.get(msg_id, f"[{msg_id}]")
        try:
            return template.format(**kwargs)
        except (KeyError, IndexError, ValueError):
            return template

    def _extract_target(
        self, msg_id: str, kwargs: dict[str, Any]
    ) -> dict[str, str] | None:
        if "target" in kwargs and isinstance(kwargs["target"], dict):
            return kwargs["target"]
        if kwargs.get("atom_id"):
            return {"type": "atom", "id": str(kwargs["atom_id"])}
        if kwargs.get("key"):
            return {"type": "lookup", "id": str(kwargs["key"])}
        if kwargs.get("manifest"):
            return {"type": "manifest", "id": str(kwargs["manifest"])}
        return None

    def error(self, msg_id: str, **kwargs: Any) -> None:
        self.error_count += 1
        self.issues.append(
            {
                "level": "错误",
                "code": msg_id,
                "message": self._format(msg_id, **kwargs),
                "target": self._extract_target(msg_id, kwargs),
            }
        )

    def lint_error(self, msg_id: str, **kwargs: Any) -> None:
        self.error_count += 1
        self.issues.append(
            {
                "level": "错误",
                "code": msg_id,
                "message": self._format(msg_id, **kwargs),
                "target": self._extract_target(msg_id, kwargs),
            }
        )

    def warn(self, msg_id: str, **kwargs: Any) -> None:
        self.warn_count += 1
        self.issues.append(
            {
                "level": "警告",
                "code": msg_id,
                "message": self._format(msg_id, **kwargs),
                "target": self._extract_target(msg_id, kwargs),
            }
        )

    def info(self, msg_id: str, **kwargs: Any) -> None:
        pass

    def success(self, msg_id: str, **kwargs: Any) -> None:
        pass
