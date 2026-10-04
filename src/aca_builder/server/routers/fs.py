from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from aca_builder.commands import _bootstrap
from aca_builder.server.common import broadcast_change, get_current_workspace_id

router = APIRouter(prefix="/fs", tags=["filesystem"])


class MkdirRequest(BaseModel):
    path: str
    scope: str = "manifests"  # "manifests" 或 "libraries"


class MoveRequest(BaseModel):
    src: str
    dest: str
    scope: str = "manifests"


class DeleteFsRequest(BaseModel):
    path: str
    scope: str = "manifests"


def _resolve_base_and_target(
    ws_cfg: Any, scope: str, relative_path: str
) -> tuple[Path, Path]:
    search_paths = (
        ws_cfg.manifest_paths if scope == "manifests" else ws_cfg.library_paths
    )
    if not search_paths:
        raise HTTPException(
            status_code=400, detail=f"当前工作区未配置 {scope} 目录路径"
        )

    base_dir = search_paths[0].resolve()
    target_path = (base_dir / relative_path).resolve()

    # 安全检查：禁止跨越配置目录边界
    try:
        target_path.relative_to(base_dir)
    except ValueError:
        raise HTTPException(status_code=403, detail="非法路径：禁止越界访问工作区外部")

    return base_dir, target_path


@router.post("/mkdir")
def make_directory(
    req: MkdirRequest,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, str]:
    """在当前工作区的 manifests 或 libraries 目录下创建物理文件夹"""
    ws_id = get_current_workspace_id(x_aca_workspace)
    _, _, _, _, ws_cfg = _bootstrap(ws_id)

    clean_path = req.path.strip().strip("/\\")
    if not clean_path:
        raise HTTPException(status_code=400, detail="目录路径不能为空")

    _, target_dir = _resolve_base_and_target(ws_cfg, req.scope, clean_path)

    try:
        target_dir.mkdir(parents=True, exist_ok=True)
        broadcast_change("LIBRARY_DIRTY")
        return {"status": "ok", "created": clean_path}
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"创建物理目录失败: {e}")


@router.post("/move")
def move_or_rename(
    req: MoveRequest,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, str]:
    """移动或重命名文件/文件夹"""
    ws_id = get_current_workspace_id(x_aca_workspace)
    _, _, _, _, ws_cfg = _bootstrap(ws_id)

    src_rel = req.src.strip().strip("/\\")
    dest_rel = req.dest.strip().strip("/\\")
    if not src_rel or not dest_rel:
        raise HTTPException(status_code=400, detail="源路径与目标路径均不能为空")

    base_dir, src_path = _resolve_base_and_target(ws_cfg, req.scope, src_rel)
    _, dest_path = _resolve_base_and_target(ws_cfg, req.scope, dest_rel)

    # 针对 yaml 清单后缀兼容补全
    if req.scope == "manifests" and not src_path.exists():
        if src_path.with_suffix(".yaml").exists():
            src_path = src_path.with_suffix(".yaml")
        elif src_path.with_suffix(".yml").exists():
            src_path = src_path.with_suffix(".yml")

    if not src_path.exists():
        raise HTTPException(status_code=404, detail=f"源路径不存在: {src_rel}")

    if (
        src_path.is_file()
        and dest_path.suffix not in [".yaml", ".yml"]
        and req.scope == "manifests"
    ):
        dest_path = dest_path.with_suffix(".yaml")

    try:
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src_path), str(dest_path))
        broadcast_change("LIBRARY_DIRTY")
        return {
            "status": "ok",
            "src": str(src_path.relative_to(base_dir)),
            "dest": str(dest_path.relative_to(base_dir)),
        }
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"移动失败: {e}")


@router.delete("/delete")
def delete_path(
    req: DeleteFsRequest,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, str]:
    """删除文件或文件夹（物理递归清理）"""
    ws_id = get_current_workspace_id(x_aca_workspace)
    _, _, _, _, ws_cfg = _bootstrap(ws_id)

    clean_path = req.path.strip().strip("/\\")
    if not clean_path:
        raise HTTPException(status_code=400, detail="删除路径不能为空")

    _, target_path = _resolve_base_and_target(ws_cfg, req.scope, clean_path)

    if not target_path.exists() and req.scope == "manifests":
        if target_path.with_suffix(".yaml").exists():
            target_path = target_path.with_suffix(".yaml")
        elif target_path.with_suffix(".yml").exists():
            target_path = target_path.with_suffix(".yml")

    if not target_path.exists():
        raise HTTPException(status_code=404, detail=f"目标不存在: {clean_path}")

    try:
        if target_path.is_dir():
            shutil.rmtree(target_path)
        else:
            target_path.unlink()

        broadcast_change("LIBRARY_DIRTY")
        return {"status": "ok", "deleted": clean_path}
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"删除文件/目录失败: {e}")
