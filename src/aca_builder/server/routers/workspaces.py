from __future__ import annotations

import asyncio
import subprocess
import sys
import urllib.parse
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from aca_builder import config
from aca_builder.commands import _bootstrap
from aca_builder.server.common import (
    active_subscribers,
    broadcast_change,
    get_current_workspace_id,
    set_active_workspace_id,
)

router = APIRouter()


class WorkspaceDetail(BaseModel):
    id: str
    name: str
    root: str | None = None
    library_paths: list[str] = []
    manifest_paths: list[str] = []
    post_process_hook: str | None = None
    is_default: bool = False
    is_active: bool = False


class SwitchWorkspaceRequest(BaseModel):
    id: str


class CreateWorkspaceRequest(BaseModel):
    id: str
    name: str
    root: str | None = None
    post_process_hook: str | None = None
    set_default: bool = False


class SetDefaultWorkspaceRequest(BaseModel):
    id: str


class UpdateWorkspaceConfigRequest(BaseModel):
    name: str | None = None
    root: str | None = None
    post_process_hook: str | None = None


class OpenObsidianRequest(BaseModel):
    file_path: str


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "aca-studio"}


@router.get("/workspaces")
def list_all_workspaces(x_aca_workspace: str | None = Header(None)) -> dict[str, Any]:
    """获取所有已注册的工作区及当前激活工作区"""
    app_cfg = config.load_config()
    default_ws = app_cfg.get("default_workspace")
    workspaces = config.get_workspaces(app_cfg)
    curr_active = get_current_workspace_id(x_aca_workspace)

    items = []
    for ws_id, ws in workspaces.items():
        items.append(
            WorkspaceDetail(
                id=ws_id,
                name=ws.name,
                root=str(ws.root) if ws.root else None,
                library_paths=[str(p) for p in ws.library_paths],
                manifest_paths=[str(p) for p in ws.manifest_paths],
                post_process_hook=ws.post_process_hook,
                is_default=(ws_id == default_ws),
                is_active=(ws_id == curr_active),
            )
        )

    return {
        "active_workspace": curr_active,
        "default_workspace": default_ws,
        "workspaces": items,
    }


@router.post("/workspaces/active")
def switch_active_workspace(req: SwitchWorkspaceRequest):
    """切换当前活跃工作区"""
    workspaces = config.get_workspaces()
    if req.id not in workspaces:
        raise HTTPException(status_code=404, detail=f"工作区 '{req.id}' 不存在")
    set_active_workspace_id(req.id)
    broadcast_change("WORKSPACE_SWITCHED")
    return {"status": "ok", "active_workspace": req.id}


@router.post("/workspaces")
def create_workspace(req: CreateWorkspaceRequest):
    """注册新工作区"""
    app_cfg = config.load_config()
    workspaces = app_cfg.setdefault("workspaces", {})
    if req.id in workspaces:
        raise HTTPException(status_code=400, detail=f"工作区 '{req.id}' 已存在")

    ws_data: dict[str, Any] = {"name": req.name}
    if req.root:
        ws_data["root"] = req.root
    if req.post_process_hook:
        ws_data["post_process_hook"] = req.post_process_hook

    workspaces[req.id] = ws_data
    if req.set_default or not app_cfg.get("default_workspace"):
        app_cfg["default_workspace"] = req.id

    config.save_config(app_cfg)
    broadcast_change("WORKSPACE_DIRTY")
    return {"status": "ok", "workspace": req.id}


@router.delete("/workspaces/{workspace_id}")
def delete_workspace(workspace_id: str):
    """删除指定工作区"""
    app_cfg = config.load_config()
    workspaces = app_cfg.get("workspaces", {})
    if workspace_id not in workspaces:
        raise HTTPException(status_code=404, detail=f"工作区 '{workspace_id}' 不存在")

    del workspaces[workspace_id]
    if app_cfg.get("default_workspace") == workspace_id:
        app_cfg["default_workspace"] = (
            next(iter(workspaces.keys())) if workspaces else None
        )

    config.save_config(app_cfg)
    curr_active = get_current_workspace_id()
    if curr_active == workspace_id:
        set_active_workspace_id(app_cfg.get("default_workspace"))

    broadcast_change("WORKSPACE_DIRTY")
    return {"status": "ok", "deleted": workspace_id}


@router.put("/workspaces/default")
def set_default_workspace(req: SetDefaultWorkspaceRequest):
    """设置默认工作区"""
    app_cfg = config.load_config()
    workspaces = config.get_workspaces(app_cfg)
    if req.id not in workspaces:
        raise HTTPException(status_code=404, detail=f"工作区 '{req.id}' 不存在")

    app_cfg["default_workspace"] = req.id
    config.save_config(app_cfg)
    broadcast_change("WORKSPACE_DIRTY")
    return {"status": "ok", "default_workspace": req.id}


@router.get("/system/config")
def get_current_workspace_config(
    x_aca_workspace: str | None = Header(None),
) -> dict[str, Any]:
    """获取当前工作区的配置详情"""
    ws_id = get_current_workspace_id(x_aca_workspace)
    _, _, _, _, ws_cfg = _bootstrap(ws_id)
    return {
        "workspace": ws_id,
        "name": ws_cfg.name,
        "root": str(ws_cfg.root) if ws_cfg.root else None,
        "library_paths": [str(p) for p in ws_cfg.library_paths],
        "manifest_paths": [str(p) for p in ws_cfg.manifest_paths],
        "post_process_hook": ws_cfg.post_process_hook,
    }


@router.put("/system/config")
def update_current_workspace_config(
    req: UpdateWorkspaceConfigRequest,
    x_aca_workspace: str | None = Header(None),
):
    """更新当前工作区专属配置"""
    ws_id = get_current_workspace_id(x_aca_workspace)
    app_cfg = config.load_config()
    workspaces = app_cfg.setdefault("workspaces", {})
    ws_entry = workspaces.setdefault(ws_id, {})

    if req.name is not None:
        ws_entry["name"] = req.name
    if req.root is not None:
        ws_entry["root"] = req.root
    if req.post_process_hook is not None:
        ws_entry["post_process_hook"] = req.post_process_hook

    config.save_config(app_cfg)
    broadcast_change("LIBRARY_DIRTY")
    return {"status": "ok", "workspace": ws_id}


@router.post("/system/open-obsidian")
def open_in_obsidian(req: OpenObsidianRequest):
    p = Path(req.file_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"文件不存在: {req.file_path}")

    abs_path = str(p.resolve())
    obsidian_uri = f"obsidian://open?path={urllib.parse.quote(abs_path)}"

    try:
        if sys.platform == "darwin":
            subprocess.run(["open", obsidian_uri], check=False)
        elif sys.platform == "win32":
            subprocess.run(["start", obsidian_uri], shell=True, check=False)
        else:
            subprocess.run(["xdg-open", obsidian_uri], check=False)
        return {"status": "ok", "uri": obsidian_uri}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动 Obsidian 失败: {e}")


@router.get("/events/stream")
async def event_stream():
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    active_subscribers.add(queue)

    async def sse_generator():
        try:
            yield "event: ping\ndata: connected\n\n"
            while True:
                data = await queue.get()
                yield f"event: change\ndata: {data}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            active_subscribers.discard(queue)

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
