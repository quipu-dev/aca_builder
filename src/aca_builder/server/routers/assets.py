from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from aca_builder.commands import _bootstrap
from aca_builder.domain.events import BuildError
from aca_builder.server.common import (
    CollectingMessageBus,
    broadcast_change,
    find_package_dir_and_yaml,
    get_current_workspace_id,
)

router = APIRouter()


class CreatePackageRequest(BaseModel):
    name: str
    description: str = ""
    version: str = "1.0.0"
    workspace_path: str | None = None


class UpdatePackageRequest(BaseModel):
    version: str | None = None
    description: str | None = None


@router.get("/packages")
def get_packages(x_aca_workspace: str | None = Header(None)) -> dict[str, Any]:
    """获取当前工作区所有已加载的 package 与 lookup 接口定义"""
    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, _, _, _, ws_cfg = _bootstrap(ws_id)
    return lib_repo.load_interfaces(ws_cfg.library_paths)


@router.get("/manifests")
def list_manifests_endpoint(x_aca_workspace: str | None = Header(None)) -> list[str]:
    """获取当前工作区配置的所有 manifest 清单名称"""
    ws_id = get_current_workspace_id(x_aca_workspace)
    _, man_repo, _, _, ws_cfg = _bootstrap(ws_id)
    return man_repo.list_manifests(ws_cfg.manifest_paths)


@router.get("/assets")
def get_assets_overview(x_aca_workspace: str | None = Header(None)) -> dict[str, Any]:
    """获取当前活动工作区的独立资产结构：包、公开接口、内部查找与原子"""
    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, _man_repo, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    manifest_paths = ws_cfg.manifest_paths

    library = lib_repo.load_library(library_paths, fail_fast=False)
    interfaces = lib_repo.load_interfaces(library_paths)

    packages_map: dict[str, dict[str, Any]] = {}

    for lib_root in library_paths:
        if not lib_root.exists():
            continue
        for pkg_file in lib_root.rglob("package.yaml"):
            try:
                pkg_data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                if pkg_data and "name" in pkg_data:
                    p_name = pkg_data["name"]
                    if p_name not in packages_map:
                        packages_map[p_name] = {
                            "name": p_name,
                            "version": str(pkg_data.get("version", "1.0.0")),
                            "description": str(pkg_data.get("description", "")),
                            "workspace": ws_id,
                            "workspace_path": str(pkg_file.parent.resolve()),
                            "exports": {},
                            "internal_lookups": {},
                            "atoms": [],
                        }
            except (yaml.YAMLError, OSError):
                continue

    manifest_items: list[dict[str, Any]] = []
    for base_path in manifest_paths:
        if not base_path.is_dir():
            continue

        # 扫描目录与空文件夹
        for item in base_path.rglob("*"):
            try:
                if item.is_dir():
                    # 避免纳入隐藏目录（如 .git 等）
                    if any(
                        part.startswith(".")
                        for part in item.relative_to(base_path).parts
                    ):
                        continue
                    manifest_items.append(
                        {
                            "name": str(item.relative_to(base_path)),
                            "type": "directory",
                            "workspace": ws_id,
                            "workspace_path": str(base_path.resolve()),
                        }
                    )
                elif item.is_file() and item.suffix in [".yaml", ".yml"]:
                    manifest_items.append(
                        {
                            "name": str(item.relative_to(base_path).with_suffix("")),
                            "type": "file",
                            "workspace": ws_id,
                            "workspace_path": str(base_path.resolve()),
                        }
                    )
            except (yaml.YAMLError, OSError, ValueError):
                continue

    for atom_id, atom in library.items():
        pkg = atom.get("package")
        if not pkg:
            continue
        meta = atom.get("meta", {})
        atom_summary = {
            "id": atom_id,
            "type": meta.get("type"),
            "priority": meta.get("priority"),
            "domain": meta.get("domain", []),
            "source_file": atom.get("source_file"),
            "uses": meta.get("uses", []),
        }

        if pkg not in packages_map:
            packages_map[pkg] = {
                "name": pkg,
                "workspace": ws_id,
                "workspace_path": "",
                "exports": {},
                "internal_lookups": {},
                "atoms": [],
            }
        packages_map[pkg]["atoms"].append(atom_summary)

    for key, l_def in interfaces.get("lookups", {}).items():
        pkg = l_def.get("package")
        is_public = l_def.get("visibility") == "public"
        lookup_item = {
            "key": key,
            "pillar": l_def.get("pillar"),
            "description": l_def.get("description", ""),
            "visibility": l_def.get("visibility"),
            "selectors": l_def.get("selectors", []),
        }
        if pkg:
            if pkg not in packages_map:
                packages_map[pkg] = {
                    "name": pkg,
                    "workspace": ws_id,
                    "workspace_path": "",
                    "exports": {},
                    "internal_lookups": {},
                    "atoms": [],
                }
            if is_public:
                packages_map[pkg]["exports"][key] = lookup_item
            else:
                packages_map[pkg]["internal_lookups"][key] = lookup_item

    kernel_info = None
    for atom_id, atom in library.items():
        if atom.get("meta", {}).get("type") == "kernel":
            kernel_info = {
                "id": atom_id,
                "type": "kernel",
                "source_file": atom.get("source_file"),
                "content": atom.get("content", ""),
                "meta": atom.get("meta", {}),
            }
            break

    return {
        "workspace": ws_id,
        "kernel": kernel_info,
        "packages": sorted(packages_map.values(), key=lambda p: p["name"]),
        "manifests": manifest_items,
    }


@router.post("/packages")
def create_package(
    req: CreatePackageRequest,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, Any]:
    ws_id = get_current_workspace_id(x_aca_workspace)
    _, _, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    if not library_paths:
        raise HTTPException(status_code=400, detail="当前工作区未配置知识库路径")

    target_pkg_dir, _ = find_package_dir_and_yaml(library_paths, req.name)
    if target_pkg_dir:
        raise HTTPException(
            status_code=400,
            detail=f"当前工作区内已存在同名组件包: '{req.name}'",
        )

    target_lib = (
        Path(req.workspace_path).expanduser().resolve()
        if req.workspace_path
        else library_paths[0]
    )
    target_lib.mkdir(parents=True, exist_ok=True)
    pkg_dir = target_lib / req.name

    if pkg_dir.exists():
        raise HTTPException(status_code=400, detail=f"组件包目录 '{req.name}' 已存在")

    try:
        pkg_dir.mkdir(parents=True, exist_ok=True)
        (pkg_dir / "d1").mkdir(exist_ok=True)
        (pkg_dir / "d2").mkdir(exist_ok=True)
        (pkg_dir / "d3").mkdir(exist_ok=True)
        (pkg_dir / "d4").mkdir(exist_ok=True)

        pkg_yaml = pkg_dir / "package.yaml"
        pkg_content = {
            "name": req.name,
            "version": req.version,
            "description": req.description,
            "exports": {},
        }
        pkg_yaml.write_text(
            yaml.safe_dump(pkg_content, sort_keys=False, allow_unicode=True),
            encoding="utf-8",
        )

        d4_lookups = pkg_dir / "d4" / "lookups.yaml"
        d4_lookups.write_text("type: d4\nlookups: {}\n", encoding="utf-8")

        broadcast_change("LIBRARY_DIRTY")
        return {"status": "ok", "package": req.name, "path": str(pkg_dir)}
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"创建组件包失败: {e}")


@router.put("/packages/{package_name}")
def update_package(
    package_name: str,
    req: UpdatePackageRequest,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, Any]:
    """更新组件包的基础元数据（版本、描述等）"""
    ws_id = get_current_workspace_id(x_aca_workspace)
    _, _, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    if not library_paths:
        raise HTTPException(status_code=400, detail="当前工作区未配置知识库路径")

    target_pkg_dir, target_pkg_yaml = find_package_dir_and_yaml(
        library_paths, package_name
    )
    if not target_pkg_dir or not target_pkg_yaml or not target_pkg_yaml.exists():
        raise HTTPException(
            status_code=404, detail=f"未找到组件包 '{package_name}' 的配置文件"
        )

    try:
        pkg_data = yaml.safe_load(target_pkg_yaml.read_text(encoding="utf-8")) or {}
        if req.version is not None:
            pkg_data["version"] = req.version.strip()
        if req.description is not None:
            pkg_data["description"] = req.description.strip()

        target_pkg_yaml.write_text(
            yaml.safe_dump(pkg_data, sort_keys=False, allow_unicode=True),
            encoding="utf-8",
        )
        broadcast_change("LIBRARY_DIRTY")
        return {
            "status": "ok",
            "package": package_name,
            "version": pkg_data.get("version"),
            "description": pkg_data.get("description"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新组件包失败: {e}")


@router.delete("/packages/{package_name}")
def delete_package(
    package_name: str,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, str]:
    ws_id = get_current_workspace_id(x_aca_workspace)
    _, _, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    if not library_paths:
        raise HTTPException(status_code=400, detail="当前工作区未配置知识库路径")

    target_pkg_dir, _ = find_package_dir_and_yaml(library_paths, package_name)
    if not target_pkg_dir:
        raise HTTPException(
            status_code=404, detail=f"未找到组件包 '{package_name}' 的存放目录"
        )

    try:
        shutil.rmtree(target_pkg_dir)
        broadcast_change("LIBRARY_DIRTY")
        return {"status": "ok", "deleted": package_name}
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"删除组件包失败: {e}")


@router.get("/lint")
def run_linter(x_aca_workspace: str | None = Header(None)) -> dict[str, Any]:
    """运行当前活动工作区的全量规范检查，返回结构化诊断报告"""
    from aca_builder.use_cases.linter import LinterService

    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, man_repo, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    manifest_paths = ws_cfg.manifest_paths

    bus = CollectingMessageBus()
    linter = LinterService(bus, lib_repo, man_repo)

    try:
        linter.lint(library_paths, manifest_paths)
    except BuildError:
        pass

    return {
        "workspace": ws_id,
        "error_count": bus.error_count,
        "warn_count": bus.warn_count,
        "issues": bus.issues,
    }
