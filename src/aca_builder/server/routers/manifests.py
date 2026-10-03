from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from aca_builder.commands import _bootstrap
from aca_builder.server.common import broadcast_change, get_current_workspace_id

router = APIRouter()


class SaveManifestRequest(BaseModel):
    name: str
    version: str = "1.0.0"
    description: str = ""
    imports: list[dict[str, Any]]
    overrides: dict[str, Any] | None = None
    identifier: str | None = None
    workspace_path: str | None = None


@router.post("/manifests")
def save_manifest(
    req: SaveManifestRequest,
    x_aca_workspace: str | None = Header(None),
):
    ws_id = get_current_workspace_id(x_aca_workspace)
    _, _, _, _, ws_cfg = _bootstrap(ws_id)
    manifest_paths = ws_cfg.manifest_paths

    if not manifest_paths:
        raise HTTPException(status_code=400, detail="当前工作区未配置 manifest_paths")

    target_dir = (
        Path(req.workspace_path).expanduser().resolve()
        if req.workspace_path
        else manifest_paths[0]
    )
    file_rel_path = req.identifier if req.identifier else req.name
    target_file = target_dir / f"{file_rel_path}.yaml"
    target_file.parent.mkdir(parents=True, exist_ok=True)

    manifest_content = {
        "name": req.name,
        "version": req.version,
        "description": req.description,
        "imports": req.imports,
    }
    if req.overrides:
        manifest_content["overrides"] = req.overrides

    try:
        target_file.write_text(
            yaml.safe_dump(manifest_content, sort_keys=False, allow_unicode=True),
            encoding="utf-8",
        )
        broadcast_change("LIBRARY_DIRTY")
        return {"status": "ok", "path": str(target_file)}
    except (OSError, yaml.YAMLError) as e:
        raise HTTPException(status_code=500, detail=f"保存清单失败: {e}")


@router.get("/manifests/{manifest_name:path}")
def get_manifest_detail(
    manifest_name: str,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, Any]:
    ws_id = get_current_workspace_id(x_aca_workspace)
    _, man_repo, _, _, ws_cfg = _bootstrap(ws_id)
    m_path = man_repo.find_manifest(manifest_name, ws_cfg.manifest_paths)
    if not m_path or not m_path.exists():
        raise HTTPException(
            status_code=404, detail=f"Manifest '{manifest_name}' 在当前工作区未找到"
        )
    try:
        return man_repo.load_manifest(m_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"加载清单失败: {e}")


@router.delete("/manifests/{manifest_name:path}")
def delete_manifest(
    manifest_name: str,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, str]:
    ws_id = get_current_workspace_id(x_aca_workspace)
    _, man_repo, _, _, ws_cfg = _bootstrap(ws_id)
    m_path = man_repo.find_manifest(manifest_name, ws_cfg.manifest_paths)
    if not m_path or not m_path.exists():
        raise HTTPException(
            status_code=404, detail=f"Manifest '{manifest_name}' 未找到"
        )
    try:
        m_path.unlink()
        broadcast_change("LIBRARY_DIRTY")
        return {"status": "ok", "deleted": manifest_name}
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"删除清单失败: {e}")
