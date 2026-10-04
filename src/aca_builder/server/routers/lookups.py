from __future__ import annotations

from typing import Any

import yaml
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from aca_builder.commands import _bootstrap
from aca_builder.domain.services import evaluate_lookup
from aca_builder.server.common import (
    broadcast_change,
    find_package_dir_and_yaml,
    get_current_workspace_id,
)

router = APIRouter()


class EvaluateLookupRequest(BaseModel):
    selectors: list[dict[str, Any]]
    package: str | None = None
    pillar: str = "d1"


class CreateLookupRequest(BaseModel):
    package: str
    key: str
    pillar: str  # d1, d2, d3
    is_public: bool = True
    description: str = ""
    selectors: list[dict[str, Any]] = []


@router.post("/lookups/evaluate")
def evaluate_lookup_adhoc(
    req: EvaluateLookupRequest,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, Any]:
    """即席演算给定的选择器规则，返回当前库中实时命中的原子列表 (Live Debug)"""
    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, _, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    library = lib_repo.load_library(library_paths, fail_fast=False)
    interfaces = lib_repo.load_interfaces(library_paths)

    lookup_def = {
        "selectors": req.selectors,
        "package": req.package,
        "pillar": req.pillar,
    }

    try:
        atom_ids = evaluate_lookup(library, lookup_def, interfaces)
    except Exception as e:
        return {"error": str(e), "matched_atoms": [], "count": 0}

    matched_atoms = []
    for aid in sorted(atom_ids):
        atom = library.get(aid)
        if not atom:
            continue
        meta = atom.get("meta", {})
        matched_atoms.append(
            {
                "id": aid,
                "type": meta.get("type", "unknown"),
                "priority": meta.get("priority"),
                "package": atom.get("package"),
                "source_file": atom.get("source_file"),
                "domain": meta.get("domain", []),
                "preview": atom.get("content", "").strip()[:140],
            }
        )

    return {"matched_atoms": matched_atoms, "count": len(matched_atoms)}


@router.post("/lookups")
def create_or_update_lookup(
    req: CreateLookupRequest,
    x_aca_workspace: str | None = Header(None),
):
    if req.pillar not in ["d1", "d2", "d3"]:
        raise HTTPException(status_code=400, detail="构造类别必须为 d1, d2 或 d3")

    expected_prefix = f"{req.pillar}l-"
    raw_key = req.key.split("::")[-1]
    if not raw_key.startswith(expected_prefix):
        raise HTTPException(
            status_code=400,
            detail=f"查找接口名称必须以 '{expected_prefix}' 开头",
        )

    ws_id = get_current_workspace_id(x_aca_workspace)
    _, _, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    if not library_paths:
        raise HTTPException(status_code=400, detail="当前工作区未配置知识库路径")

    target_pkg_dir, target_pkg_yaml = find_package_dir_and_yaml(
        library_paths, req.package
    )
    if not target_pkg_dir or not target_pkg_yaml:
        raise HTTPException(
            status_code=404, detail=f"未找到组件包 '{req.package}' 的存放目录"
        )

    lookup_data = {
        "pillar": req.pillar,
        "description": req.description,
        "selectors": req.selectors,
    }

    try:
        lookup_name = raw_key
        if req.is_public:
            pkg_content = (
                yaml.safe_load(target_pkg_yaml.read_text(encoding="utf-8")) or {}
            )
            exports = pkg_content.setdefault("exports", {})
            exports[lookup_name] = lookup_data
            target_pkg_yaml.write_text(
                yaml.safe_dump(pkg_content, sort_keys=False, allow_unicode=True),
                encoding="utf-8",
            )
            full_return_key = f"{req.package}::{lookup_name}"
        else:
            d4_dir = target_pkg_dir / "d4"
            d4_dir.mkdir(parents=True, exist_ok=True)
            d4_file = d4_dir / "lookups.yaml"

            d4_content = {}
            if d4_file.exists():
                try:
                    d4_content = (
                        yaml.safe_load(d4_file.read_text(encoding="utf-8")) or {}
                    )
                except (yaml.YAMLError, OSError):
                    d4_content = {}

            d4_content["type"] = "d4"
            lookups = d4_content.setdefault("lookups", {})
            lookups[lookup_name] = lookup_data
            d4_file.write_text(
                yaml.safe_dump(d4_content, sort_keys=False, allow_unicode=True),
                encoding="utf-8",
            )
            full_return_key = f"{req.package}::internal::{lookup_name}"

        broadcast_change("LIBRARY_DIRTY")
        return {"status": "ok", "key": full_return_key, "package": req.package}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存 Lookup 失败: {e}")


@router.delete("/lookups/{lookup_key:path}")
def delete_lookup(
    lookup_key: str,
    x_aca_workspace: str | None = Header(None),
):
    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, _, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    interfaces = lib_repo.load_interfaces(library_paths)

    lookup_def = interfaces.get("lookups", {}).get(lookup_key)
    is_internal_pattern = "::internal::" in lookup_key

    if not lookup_def:
        # 回退在 exports 或 internals 中精准匹配
        if is_internal_pattern:
            pkg_part, name_part = lookup_key.split("::internal::", 1)
            lookup_def = (
                interfaces.get("internals", {}).get(pkg_part, {}).get(name_part)
            )
        elif "::" in lookup_key:
            lookup_def = interfaces.get("exports", {}).get(lookup_key)

    if not lookup_def:
        # 兼容旧短名称请求：遍历所有注册条目匹配后缀
        for k, item in interfaces.get("lookups", {}).items():
            if k == lookup_key or k.endswith(f"::{lookup_key}"):
                lookup_def = item
                lookup_key = k
                break

    if not lookup_def:
        raise HTTPException(status_code=404, detail=f"Lookup '{lookup_key}' not found")

    pkg_name = lookup_def.get("package")
    raw_key = lookup_key.split("::")[-1]
    is_public = lookup_def.get("visibility") == "public"

    target_pkg_dir, target_pkg_yaml = find_package_dir_and_yaml(
        library_paths, pkg_name or ""
    )
    if not target_pkg_dir or not target_pkg_yaml:
        raise HTTPException(
            status_code=404, detail=f"未找到组件包 '{pkg_name}' 的存放目录"
        )

    try:
        if is_public:
            pkg_content = (
                yaml.safe_load(target_pkg_yaml.read_text(encoding="utf-8")) or {}
            )
            exports = pkg_content.get("exports", {})
            if raw_key in exports:
                del exports[raw_key]
                target_pkg_yaml.write_text(
                    yaml.safe_dump(pkg_content, sort_keys=False, allow_unicode=True),
                    encoding="utf-8",
                )
        else:
            d4_dir = target_pkg_dir / "d4"
            if d4_dir.exists():
                for d4_file in d4_dir.glob("*.yaml"):
                    try:
                        d4_content = (
                            yaml.safe_load(d4_file.read_text(encoding="utf-8")) or {}
                        )
                        if (
                            isinstance(d4_content, dict)
                            and d4_content.get("type") == "d4"
                            and "lookups" in d4_content
                            and raw_key in d4_content["lookups"]
                        ):
                            del d4_content["lookups"][raw_key]
                            d4_file.write_text(
                                yaml.safe_dump(
                                    d4_content, sort_keys=False, allow_unicode=True
                                ),
                                encoding="utf-8",
                            )
                            break
                    except (yaml.YAMLError, OSError):
                        continue

        broadcast_change("LIBRARY_DIRTY")
        return {"status": "ok", "deleted": lookup_key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除 Lookup 失败: {e}")
