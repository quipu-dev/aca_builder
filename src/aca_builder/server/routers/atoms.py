from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from aca_builder.commands import _bootstrap
from aca_builder.server.common import (
    broadcast_change,
    find_package_dir_and_yaml,
    get_current_workspace_id,
)

router = APIRouter()


class CreateAtomRequest(BaseModel):
    package: str | None = None
    id: str | None = None
    type: str  # d1, d2, d3, kernel
    priority: int | None = None
    description: str | None = None
    domain: list[str] = []
    uses: list[str] = []
    content: str


class UpdateAtomRequest(BaseModel):
    raw_content: str | None = None
    content: str | None = None
    meta: dict[str, Any] | None = None


@router.post("/atoms")
def create_atom(
    req: CreateAtomRequest,
    x_aca_workspace: str | None = Header(None),
):
    ws_id = get_current_workspace_id(x_aca_workspace)
    _, _, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    if not library_paths:
        raise HTTPException(status_code=400, detail="当前工作区未配置知识库路径")

    if req.type == "kernel":
        target_dir = library_paths[0]
        if req.package:
            pkg_dir, _ = find_package_dir_and_yaml(library_paths, req.package)
            if pkg_dir:
                target_dir = pkg_dir
        target_file = target_dir / "kernel.md"
        full_content = f"---\ntype: kernel\n---\n\n{req.content.strip()}\n"
        try:
            target_file.write_text(full_content, encoding="utf-8")
            broadcast_change("LIBRARY_DIRTY")
            return {"status": "ok", "file": str(target_file), "id": "kernel"}
        except OSError as e:
            raise HTTPException(status_code=500, detail=f"保存 Kernel 失败: {e}")

    target_pkg_dir, _ = find_package_dir_and_yaml(library_paths, req.package or "")
    if not target_pkg_dir:
        raise HTTPException(
            status_code=404, detail=f"未找到组件包 '{req.package}' 的存放目录"
        )

    atom_id = req.id or f"{req.type}-atom"
    type_dir = target_pkg_dir / req.type
    type_dir.mkdir(parents=True, exist_ok=True)
    target_file = type_dir / f"{atom_id}.md"

    meta: dict[str, Any] = {
        "id": atom_id,
        "type": req.type,
    }
    if req.type == "d3":
        meta["priority"] = req.priority if req.priority is not None else 1
    if req.description:
        meta["description"] = req.description.strip()
    if req.domain:
        meta["domain"] = req.domain
    if req.type == "d2" and req.uses:
        meta["uses"] = req.uses

    meta["status"] = "stable"
    meta_yaml = yaml.safe_dump(meta, sort_keys=False, allow_unicode=True).strip()
    full_content = f"---\n{meta_yaml}\n---\n\n{req.content.strip()}\n"

    try:
        target_file.write_text(full_content, encoding="utf-8")
        broadcast_change("LIBRARY_DIRTY")
        return {"status": "ok", "file": str(target_file), "id": atom_id}
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"保存原子失败: {e}")


@router.get("/atoms/{atom_id}")
def get_atom_detail(
    atom_id: str,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, Any]:
    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, _, _, _, ws_cfg = _bootstrap(ws_id)
    library = lib_repo.load_library(ws_cfg.library_paths, fail_fast=False)

    atom = library.get(atom_id)
    if not atom:
        raise HTTPException(status_code=404, detail=f"Atom '{atom_id}' not found")

    source_path = Path(atom["source_file"])
    try:
        raw_text = source_path.read_text(encoding="utf-8")
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"读取原子失败: {e}")

    return {
        "id": atom_id,
        "package": atom.get("package"),
        "meta": atom["meta"],
        "content": atom["content"],
        "raw": raw_text,
        "source_file": str(source_path),
    }


@router.put("/atoms/{atom_id}")
def update_atom(
    atom_id: str,
    req: UpdateAtomRequest,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, str]:
    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, _, _, _, ws_cfg = _bootstrap(ws_id)
    library = lib_repo.load_library(ws_cfg.library_paths, fail_fast=False)

    atom = library.get(atom_id)
    if not atom:
        raise HTTPException(status_code=404, detail=f"Atom '{atom_id}' not found")

    source_path = Path(atom["source_file"])
    try:
        if req.raw_content is not None:
            source_path.write_text(req.raw_content, encoding="utf-8")
        elif req.content is not None or req.meta is not None:
            current_raw = source_path.read_text(encoding="utf-8")
            parts = current_raw.split("---", 2)
            existing_meta: dict[str, Any] = {}
            existing_content = ""
            if len(parts) >= 3 and parts[0].strip() == "":
                try:
                    existing_meta = yaml.safe_load(parts[1]) or {}
                except Exception:
                    existing_meta = atom.get("meta", {})
                existing_content = parts[2].strip()
            else:
                existing_meta = atom.get("meta", {})
                existing_content = atom.get("content", "")

            new_meta = req.meta if req.meta is not None else existing_meta
            new_content = req.content if req.content is not None else existing_content

            if atom_id == "kernel" or new_meta.get("type") == "kernel":
                new_meta = {"type": "kernel"}
            else:
                if "id" not in new_meta:
                    new_meta["id"] = atom_id
                if "type" not in new_meta and "type" in existing_meta:
                    new_meta["type"] = existing_meta["type"]

            meta_yaml = yaml.safe_dump(
                new_meta, sort_keys=False, allow_unicode=True
            ).strip()
            new_full = f"---\n{meta_yaml}\n---\n\n{new_content.strip()}\n"
            source_path.write_text(new_full, encoding="utf-8")
        else:
            raise HTTPException(
                status_code=400,
                detail="Either raw_content, content, or meta must be provided",
            )

        broadcast_change("LIBRARY_DIRTY")
        return {"status": "ok", "id": atom_id}
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"写入原子失败: {e}")


@router.delete("/atoms/{atom_id}")
def delete_atom(
    atom_id: str,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, str]:
    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, _, _, _, ws_cfg = _bootstrap(ws_id)
    library = lib_repo.load_library(ws_cfg.library_paths, fail_fast=False)

    atom = library.get(atom_id)
    if not atom:
        raise HTTPException(status_code=404, detail=f"Atom '{atom_id}' not found")

    source_path = Path(atom["source_file"])
    try:
        if source_path.exists():
            source_path.unlink()
        broadcast_change("LIBRARY_DIRTY")
        return {"status": "ok", "deleted": atom_id}
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"删除原子失败: {e}")
