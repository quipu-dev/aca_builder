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


class RenameAtomRequest(BaseModel):
    new_id: str
    cascade: bool = True


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


@router.post("/atoms/{atom_id}/rename")
def rename_atom(
    atom_id: str,
    req: RenameAtomRequest,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, Any]:
    """重命名原子组件：校验唯一性、更新 Frontmatter ID 并物理重命名 Markdown 文件"""
    if atom_id == "kernel":
        raise HTTPException(status_code=400, detail="Kernel 核心协议原子不允许重命名")

    clean_new_id = req.new_id.strip()
    if not clean_new_id:
        raise HTTPException(status_code=400, detail="新原子标识符不能为空")

    if clean_new_id == atom_id:
        return {"status": "ok", "id": atom_id}

    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, _, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    library = lib_repo.load_library(library_paths, fail_fast=False)

    atom = library.get(atom_id)
    if not atom:
        raise HTTPException(status_code=404, detail=f"Atom '{atom_id}' not found")

    if clean_new_id in library:
        raise HTTPException(
            status_code=400,
            detail=f"目标原子标识符 '{clean_new_id}' 已在当前工作区存在",
        )

    source_path = Path(atom["source_file"])
    dest_path = source_path.parent / f"{clean_new_id}.md"

    if dest_path.exists():
        raise HTTPException(
            status_code=400,
            detail=f"目标物理文件 '{dest_path.name}' 已存在",
        )

    try:
        raw_text = source_path.read_text(encoding="utf-8")
        parts = raw_text.split("---", 2)
        if len(parts) >= 3 and parts[0].strip() == "":
            try:
                meta = yaml.safe_load(parts[1]) or {}
            except Exception:
                meta = atom.get("meta", {})
            content = parts[2].strip()
        else:
            meta = atom.get("meta", {})
            content = atom.get("content", "")

        meta["id"] = clean_new_id
        meta_yaml = yaml.safe_dump(meta, sort_keys=False, allow_unicode=True).strip()
        new_full = f"---\n{meta_yaml}\n---\n\n{content}\n"

        dest_path.write_text(new_full, encoding="utf-8")
        source_path.unlink()

        # 级联更新所有 Lookups 中的原子 ID 引用
        cascaded_lookups_count = 0
        if req.cascade:
            for lib_root in library_paths:
                if not lib_root.exists():
                    continue
                # 1. 更新 package.yaml 中的 exports
                for pkg_file in lib_root.rglob("package.yaml"):
                    try:
                        pkg_content = (
                            yaml.safe_load(pkg_file.read_text(encoding="utf-8")) or {}
                        )
                        exports = pkg_content.get("exports") or {}
                        if not isinstance(exports, dict):
                            continue
                        pkg_modified = False
                        for ldef in exports.values():
                            if not isinstance(ldef, dict):
                                continue
                            for sel in ldef.get("selectors") or []:
                                if (
                                    isinstance(sel, dict)
                                    and isinstance(sel.get("query"), dict)
                                    and sel["query"].get("id") == atom_id
                                ):
                                    sel["query"]["id"] = clean_new_id
                                    pkg_modified = True
                                    cascaded_lookups_count += 1
                        if pkg_modified:
                            pkg_file.write_text(
                                yaml.safe_dump(
                                    pkg_content, sort_keys=False, allow_unicode=True
                                ),
                                encoding="utf-8",
                            )
                    except (yaml.YAMLError, OSError, KeyError):
                        pass

                # 2. 更新 d4/*.yaml 中的内部私有 lookups
                for d4_file in lib_root.glob("**/d4/*.yaml"):
                    try:
                        d4_content = (
                            yaml.safe_load(d4_file.read_text(encoding="utf-8")) or {}
                        )
                        if (
                            isinstance(d4_content, dict)
                            and d4_content.get("type") == "d4"
                        ):
                            lookups = d4_content.get("lookups") or {}
                            if not isinstance(lookups, dict):
                                continue
                            d4_modified = False
                            for ldef in lookups.values():
                                if not isinstance(ldef, dict):
                                    continue
                                for sel in ldef.get("selectors") or []:
                                    if (
                                        isinstance(sel, dict)
                                        and isinstance(sel.get("query"), dict)
                                        and sel["query"].get("id") == atom_id
                                    ):
                                        sel["query"]["id"] = clean_new_id
                                        d4_modified = True
                                        cascaded_lookups_count += 1
                            if d4_modified:
                                d4_file.write_text(
                                    yaml.safe_dump(
                                        d4_content, sort_keys=False, allow_unicode=True
                                    ),
                                    encoding="utf-8",
                                )
                    except (yaml.YAMLError, OSError, KeyError):
                        pass

        broadcast_change("LIBRARY_DIRTY")
        return {
            "status": "ok",
            "old_id": atom_id,
            "new_id": clean_new_id,
            "file": str(dest_path),
            "cascaded_lookups_count": cascaded_lookups_count,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"重命名原子失败: {e}")


@router.get("/atoms/{atom_id}/references")
def get_atom_references(
    atom_id: str,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, Any]:
    """反向探测所有通过精确 ID 引用该原子的 Lookup 列表及 Manifest 蓝图（用于安全预检）"""
    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, _man_repo, _, _, ws_cfg = _bootstrap(ws_id)
    interfaces = lib_repo.load_interfaces(ws_cfg.library_paths)
    manifest_paths = ws_cfg.manifest_paths

    referenced_lookups = []
    all_lookups: list[tuple[str, dict[str, Any]]] = []
    for k, v in interfaces.get("exports", {}).items():
        all_lookups.append((k, v))
    for pkg, pkg_lookups in interfaces.get("internals", {}).items():
        for k, v in pkg_lookups.items():
            all_lookups.append((f"{pkg}::internal::{k}", v))
    for k, v in interfaces.get("legacy", {}).items():
        all_lookups.append((k, v))

    for lkey, ldef in all_lookups:
        selectors = ldef.get("selectors", [])
        for sel in selectors:
            if (
                isinstance(sel, dict)
                and "query" in sel
                and sel["query"].get("id") == atom_id
            ):
                referenced_lookups.append(
                    {
                        "key": lkey,
                        "package": ldef.get("package"),
                        "visibility": ldef.get("visibility"),
                        "pillar": ldef.get("pillar"),
                    }
                )
                break

    referenced_manifests = []
    for base_path in manifest_paths:
        if not base_path.is_dir():
            continue
        for m_file in base_path.rglob("*.yaml"):
            try:
                m_data = yaml.safe_load(m_file.read_text(encoding="utf-8"))
                if not isinstance(m_data, dict):
                    continue
                imports = m_data.get("imports", [])
                for imp in imports:
                    if (
                        isinstance(imp, dict)
                        and "query" in imp
                        and imp["query"].get("id") == atom_id
                    ):
                        rel_name = str(m_file.relative_to(base_path).with_suffix(""))
                        referenced_manifests.append(
                            {
                                "name": rel_name,
                                "file": str(m_file),
                            }
                        )
                        break
            except (yaml.YAMLError, OSError, KeyError):
                pass

    total_ref = len(referenced_lookups) + len(referenced_manifests)
    return {
        "atom_id": atom_id,
        "reference_count": total_ref,
        "referenced_by_lookups": referenced_lookups,
        "referenced_by_manifests": referenced_manifests,
    }
