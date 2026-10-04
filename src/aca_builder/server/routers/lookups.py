from __future__ import annotations

from pathlib import Path
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
    old_key: str | None = None


def _perform_delete_lookup(
    library_paths: list[Path],
    interfaces: dict[str, Any],
    lookup_key: str,
) -> bool:
    """内部通用清理指定 Lookup 定义的执行器：支持全限定名及唯一定义短名的安全解析，杜绝跨包误删"""
    lookup_def = interfaces.get("lookups", {}).get(lookup_key)
    is_internal_pattern = "::internal::" in lookup_key

    if not lookup_def:
        if is_internal_pattern:
            pkg_part, name_part = lookup_key.split("::internal::", 1)
            lookup_def = (
                interfaces.get("internals", {}).get(pkg_part, {}).get(name_part)
            )
        elif "::" in lookup_key:
            lookup_def = interfaces.get("exports", {}).get(lookup_key)
        else:
            # 短名称局部寻址：在唯一匹配无歧义的情况下予以定位
            candidates = []
            if lookup_key in interfaces.get("legacy", {}):
                candidates.append((interfaces["legacy"][lookup_key], lookup_key))
            for pkg, pkg_lookups in interfaces.get("internals", {}).items():
                if lookup_key in pkg_lookups:
                    candidates.append(
                        (pkg_lookups[lookup_key], f"{pkg}::internal::{lookup_key}")
                    )
            for exp_key, exp_def in interfaces.get("exports", {}).items():
                if exp_key.endswith(f"::{lookup_key}"):
                    candidates.append((exp_def, exp_key))

            if len(candidates) == 1:
                lookup_def, lookup_key = candidates[0]

    if not lookup_def:
        return False

    pkg_name = lookup_def.get("package")
    raw_key = lookup_key.split("::")[-1]
    is_public = lookup_def.get("visibility") == "public"

    target_pkg_dir, target_pkg_yaml = find_package_dir_and_yaml(
        library_paths, pkg_name or ""
    )
    if not target_pkg_dir or not target_pkg_yaml:
        return False

    if is_public:
        pkg_content = yaml.safe_load(target_pkg_yaml.read_text(encoding="utf-8")) or {}
        exports = pkg_content.get("exports", {})
        if raw_key in exports:
            del exports[raw_key]
            target_pkg_yaml.write_text(
                yaml.safe_dump(pkg_content, sort_keys=False, allow_unicode=True),
                encoding="utf-8",
            )
            return True
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
                        return True
                except (yaml.YAMLError, OSError):
                    continue
    return False


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
            # 1. 写入 package.yaml 的 exports
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

            # 2. 互斥清理：若之前存在内部私有查找，物理清理 d4/*.yaml 中的旧定义
            d4_dir = target_pkg_dir / "d4"
            if d4_dir.exists():
                for d4_file in d4_dir.glob("*.yaml"):
                    try:
                        d4_c = yaml.safe_load(d4_file.read_text(encoding="utf-8")) or {}
                        if (
                            isinstance(d4_c, dict)
                            and d4_c.get("type") == "d4"
                            and "lookups" in d4_c
                            and lookup_name in d4_c["lookups"]
                        ):
                            del d4_c["lookups"][lookup_name]
                            d4_file.write_text(
                                yaml.safe_dump(
                                    d4_c, sort_keys=False, allow_unicode=True
                                ),
                                encoding="utf-8",
                            )
                    except (yaml.YAMLError, OSError):
                        continue
        else:
            # 1. 写入 d4/lookups.yaml
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

            # 2. 互斥清理：若之前存在公开导出，物理清理 package.yaml 的 exports
            if target_pkg_yaml.exists():
                pkg_content = (
                    yaml.safe_load(target_pkg_yaml.read_text(encoding="utf-8")) or {}
                )
                exports = pkg_content.get("exports", {})
                if lookup_name in exports:
                    del exports[lookup_name]
                    target_pkg_yaml.write_text(
                        yaml.safe_dump(
                            pkg_content, sort_keys=False, allow_unicode=True
                        ),
                        encoding="utf-8",
                    )

        # 3. 若上报了 old_key 且发生重命名，清理旧 key 物理定义并级联更新 Manifest 引用
        if req.old_key and req.old_key != full_return_key:
            old_raw = req.old_key.split("::")[-1]
            if old_raw != lookup_name or req.old_key != full_return_key:
                _bootstrap_repo, _, _, _, _ws_cfg = _bootstrap(ws_id)
                current_interfaces = _bootstrap_repo.load_interfaces(library_paths)
                _perform_delete_lookup(library_paths, current_interfaces, req.old_key)

                # 级联更新 Manifests imports 中的引用
                manifest_paths = _ws_cfg.manifest_paths
                for base_path in manifest_paths:
                    if not base_path.is_dir():
                        continue
                    for m_file in base_path.rglob("*.yaml"):
                        try:
                            m_data = yaml.safe_load(m_file.read_text(encoding="utf-8"))
                            if not isinstance(m_data, dict):
                                continue
                            imports = m_data.get("imports", [])
                            m_modified = False
                            for imp in imports:
                                if (
                                    isinstance(imp, dict)
                                    and "lookup" in imp
                                    and (
                                        imp["lookup"] == req.old_key
                                        or imp["lookup"] == old_raw
                                    )
                                ):
                                    imp["lookup"] = full_return_key
                                    m_modified = True
                            if m_modified:
                                m_file.write_text(
                                    yaml.safe_dump(
                                        m_data, sort_keys=False, allow_unicode=True
                                    ),
                                    encoding="utf-8",
                                )
                        except (yaml.YAMLError, OSError, KeyError):
                            pass

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

    success = _perform_delete_lookup(library_paths, interfaces, lookup_key)
    if not success:
        raise HTTPException(status_code=404, detail=f"Lookup '{lookup_key}' not found")

    broadcast_change("LIBRARY_DIRTY")
    return {"status": "ok", "deleted": lookup_key}


@router.get("/lookups/{lookup_key:path}/references")
def get_lookup_references(
    lookup_key: str,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, Any]:
    """反向探测所有引用该 Lookup 的 Manifest 清单和 D2 原子（用于删除安全预检）"""
    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, _man_repo, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    manifest_paths = ws_cfg.manifest_paths

    library = lib_repo.load_library(library_paths, fail_fast=False)
    raw_key = lookup_key.split("::")[-1]

    # 1. 扫描 D2 原子的 uses
    referenced_atoms = []
    for atom_id, atom in library.items():
        if atom.get("meta", {}).get("type") == "d2":
            uses = atom.get("meta", {}).get("uses", [])
            for use_ref in uses:
                if (
                    use_ref == lookup_key
                    or use_ref.endswith(f"::{raw_key}")
                    or use_ref == raw_key
                ):
                    referenced_atoms.append(
                        {
                            "id": atom_id,
                            "package": atom.get("package"),
                            "source_file": atom.get("source_file"),
                        }
                    )
                    break

    # 2. 扫描 Manifests 的 imports
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
                    if isinstance(imp, dict) and "lookup" in imp:
                        l = imp["lookup"]
                        if (
                            l == lookup_key
                            or l.endswith(f"::{raw_key}")
                            or l == raw_key
                        ):
                            rel_name = str(
                                m_file.relative_to(base_path).with_suffix("")
                            )
                            referenced_manifests.append(
                                {
                                    "name": rel_name,
                                    "file": str(m_file),
                                }
                            )
                            break
            except (yaml.YAMLError, OSError, KeyError):
                pass

    return {
        "lookup_key": lookup_key,
        "referenced_by_atoms": referenced_atoms,
        "referenced_by_manifests": referenced_manifests,
        "total_references": len(referenced_atoms) + len(referenced_manifests),
    }
