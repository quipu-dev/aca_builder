from __future__ import annotations

import asyncio
import subprocess
from typing import Any

import yaml
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from aca_builder import config
from aca_builder.commands import _bootstrap
from aca_builder.domain.events import BuildError
from aca_builder.domain.services import (
    evaluate_lookup,
    generate_prompt_chunks,
    generate_prompt_profile,
    resolve_dependencies,
    resolve_lookup_by_key,
    select_atoms_by_query,
    serialize_prompt,
)

router = APIRouter()

# 运行时全局活动工作区 ID
_active_workspace_id: str | None = None


def get_current_workspace_id(x_workspace: str | None = None) -> str:
    global _active_workspace_id
    if x_workspace:
        return x_workspace
    if _active_workspace_id:
        return _active_workspace_id
    ws_id, _ = config.resolve_workspace()
    _active_workspace_id = ws_id
    return ws_id


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
    libraries: list[str] = []
    manifests: list[str] = []
    post_process_hook: str | None = None
    set_default: bool = False


class SetDefaultWorkspaceRequest(BaseModel):
    id: str


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
    global _active_workspace_id
    workspaces = config.get_workspaces()
    if req.id not in workspaces:
        raise HTTPException(status_code=404, detail=f"工作区 '{req.id}' 不存在")
    _active_workspace_id = req.id
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
    if req.libraries:
        ws_data["libraries"] = req.libraries
    if req.manifests:
        ws_data["manifests"] = req.manifests
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
    global _active_workspace_id
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
    if _active_workspace_id == workspace_id:
        _active_workspace_id = app_cfg.get("default_workspace")

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


class UpdateWorkspaceConfigRequest(BaseModel):
    name: str | None = None
    root: str | None = None
    library_paths: list[str] | None = None
    manifest_paths: list[str] | None = None
    post_process_hook: str | None = None


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
    if req.library_paths is not None:
        ws_entry["libraries"] = req.library_paths
    if req.manifest_paths is not None:
        ws_entry["manifests"] = req.manifest_paths
    if req.post_process_hook is not None:
        ws_entry["post_process_hook"] = req.post_process_hook

    config.save_config(app_cfg)
    broadcast_change("LIBRARY_DIRTY")
    return {"status": "ok", "workspace": ws_id}


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
                            "workspace": ws_id,
                            "workspace_path": str(pkg_file.parent.resolve()),
                            "exports": {},
                            "internal_lookups": {},
                            "atoms": [],
                        }
            except (yaml.YAMLError, OSError):
                continue

    # 清单收集
    manifest_items: list[dict[str, Any]] = []
    for base_path in manifest_paths:
        if not base_path.is_dir():
            continue
        for yaml_file in base_path.rglob("*.yaml"):
            try:
                relative = yaml_file.relative_to(base_path)
                m_name = str(relative.with_suffix(""))
                manifest_items.append(
                    {
                        "name": m_name,
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
        meta = atom["meta"]
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
        "packages": list(packages_map.values()),
        "manifests": manifest_items,
    }


def _build_topology_graph(
    manifest_label: str,
    manifest_data: dict[str, Any],
    library: dict[str, Any],
    interfaces: dict[str, Any],
) -> dict[str, Any]:
    import copy
    import time

    t_start = time.perf_counter()

    if "overrides" in manifest_data and isinstance(manifest_data["overrides"], dict):
        interfaces = copy.deepcopy(interfaces)
        for lkey, override in manifest_data["overrides"].items():
            if lkey in interfaces.get("lookups", {}):
                interfaces["lookups"][lkey]["selectors"] = override.get("selectors", [])

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    visited_nodes: set[str] = set()
    visited_edges: set[tuple[str, str]] = set()

    manifest_node_id = f"manifest::{manifest_label}"
    nodes.append(
        {
            "id": manifest_node_id,
            "type": "manifestNode",
            "data": {
                "label": manifest_label,
                "version": manifest_data.get("version", "1.0"),
                "description": manifest_data.get("description", ""),
            },
        }
    )
    visited_nodes.add(manifest_node_id)

    def add_edge(source: str, target: str, label: str = ""):
        if (source, target) not in visited_edges:
            edges.append(
                {
                    "id": f"e_{source}->{target}",
                    "source": source,
                    "target": target,
                    "label": label,
                    "animated": True,
                }
            )
            visited_edges.add((source, target))

    def process_lookup(lkey: str, parent_id: str, context_pkg: str | None = None):
        lookup_node_id = f"lookup::{lkey}"

        if lookup_node_id in visited_nodes:
            add_edge(parent_id, lookup_node_id)
            return

        target_def = resolve_lookup_by_key(lkey, context_pkg, interfaces)

        is_broken = target_def is None
        is_private_access = False
        pillar = "unknown"
        desc = ""

        if target_def:
            pillar = target_def.get("pillar", "unknown")
            desc = target_def.get("description", "")
            target_pkg = target_def.get("package")
            if (
                target_pkg
                and target_pkg != context_pkg
                and target_def.get("visibility") == "private"
            ):
                is_private_access = True

        nodes.append(
            {
                "id": lookup_node_id,
                "type": "lookupNode",
                "data": {
                    "key": lkey,
                    "pillar": pillar,
                    "description": desc,
                    "isBroken": is_broken,
                    "isPrivate": is_private_access,
                },
            }
        )
        visited_nodes.add(lookup_node_id)
        add_edge(parent_id, lookup_node_id)

        if not target_def:
            return

        try:
            matched_atom_ids = evaluate_lookup(library, target_def, interfaces)
        except (BuildError, KeyError, ValueError):
            matched_atom_ids = set()

        for atom_id in matched_atom_ids:
            process_atom(atom_id, lookup_node_id)

    def process_atom(atom_id: str, parent_id: str):
        atom_node_id = f"atom::{atom_id}"

        if atom_node_id in visited_nodes:
            add_edge(parent_id, atom_node_id)
            return

        atom = library.get(atom_id)
        if not atom:
            return

        meta = atom["meta"]
        atom_type = meta.get("type", "unknown")
        priority = meta.get("priority")
        pkg = atom.get("package")
        content = atom.get("content", "")

        nodes.append(
            {
                "id": atom_node_id,
                "type": "atomNode",
                "data": {
                    "id": atom_id,
                    "type": atom_type,
                    "priority": priority,
                    "package": pkg,
                    "content": content,
                    "source_file": atom.get("source_file"),
                },
            }
        )
        visited_nodes.add(atom_node_id)
        add_edge(parent_id, atom_node_id)

        if atom_type == "d2":
            uses = meta.get("uses", [])
            for use_ref in uses:
                process_lookup(use_ref, atom_node_id, context_pkg=pkg)

    imports = manifest_data.get("imports", [])
    for item in imports:
        if isinstance(item, dict) and "lookup" in item:
            process_lookup(item["lookup"], manifest_node_id, context_pkg=None)

    for atom_id, atom in library.items():
        if atom["meta"].get("type") == "kernel":
            process_atom(atom_id, manifest_node_id)

    elapsed_ms = (time.perf_counter() - t_start) * 1000
    print(
        f"[ACA Graph] 清单 '{manifest_label}' 拓扑生成成功: {len(nodes)} 节点, "
        f"{len(edges)} 条关系边, 耗时: {elapsed_ms:.2f}ms"
    )

    return {"nodes": nodes, "edges": edges}


class AdhocGraphRequest(BaseModel):
    name: str = "draft"
    imports: list[dict[str, Any]]
    overrides: dict[str, Any] | None = None


@router.post("/graph/adhoc")
def get_adhoc_dependency_graph(
    req: AdhocGraphRequest,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, Any]:
    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, _, _, _, ws_cfg = _bootstrap(ws_id)
    library = lib_repo.load_library(ws_cfg.library_paths, fail_fast=False)
    interfaces = lib_repo.load_interfaces(ws_cfg.library_paths)

    manifest_data = {
        "name": req.name,
        "imports": req.imports,
    }
    if req.overrides:
        manifest_data["overrides"] = req.overrides

    return _build_topology_graph(req.name, manifest_data, library, interfaces)


@router.get("/graph")
def get_dependency_graph(
    manifest: str,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, Any]:
    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, man_repo, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    manifest_paths = ws_cfg.manifest_paths

    manifest_path = man_repo.find_manifest(manifest, manifest_paths)
    if not manifest_path:
        raise HTTPException(status_code=404, detail=f"Manifest '{manifest}' not found")

    manifest_data = man_repo.load_manifest(manifest_path)
    library = lib_repo.load_library(library_paths, fail_fast=False)
    interfaces = lib_repo.load_interfaces(library_paths)

    return _build_topology_graph(manifest, manifest_data, library, interfaces)


class BuildRequest(BaseModel):
    manifest: str
    is_file: bool = False
    apply_hook: bool = False


class AtomTokenProfile(BaseModel):
    id: str
    type: str
    priority: int | None = None
    package: str | None = None
    source_file: str | None = None
    char_count: int
    estimated_tokens: int
    via_lookups: list[str] = []


class ProfileSummary(BaseModel):
    total_tokens: int
    by_pillar: dict[str, int]
    atoms: list[AtomTokenProfile]


class PromptChunk(BaseModel):
    id: str
    type: str
    priority: int | None = None
    package: str | None = None
    source_file: str | None = None
    meta: dict[str, Any] = {}
    content: str
    via_lookups: list[str] = []


class BuildResponse(BaseModel):
    prompt: str
    hooked_prompt: str | None = None
    chunks: list[PromptChunk] = []
    profile: ProfileSummary | None = None


def _execute_hook(hook_command: str | None, prompt_text: str) -> str | None:
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


@router.post("/build", response_model=BuildResponse)
def build_prompt(
    req: BuildRequest,
    x_aca_workspace: str | None = Header(None),
):
    from pathlib import Path

    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, man_repo, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    manifest_paths = ws_cfg.manifest_paths

    if req.is_file:
        manifest_path = Path(req.manifest)
        if not manifest_path.exists():
            raise HTTPException(status_code=404, detail="Manifest file not found")
    else:
        manifest_path = man_repo.find_manifest(req.manifest, manifest_paths)
        if not manifest_path:
            raise HTTPException(
                status_code=404,
                detail=f"Manifest '{req.manifest}' not found in workspace '{ws_id}'",
            )

    manifest = man_repo.load_manifest(manifest_path)
    library = lib_repo.load_library(library_paths, fail_fast=False)
    interfaces = lib_repo.load_interfaces(library_paths)

    if not library:
        raise HTTPException(status_code=400, detail="Library is empty")

    if "overrides" in manifest:
        for lkey, override in manifest["overrides"].items():
            if lkey in interfaces["lookups"]:
                interfaces["lookups"][lkey]["selectors"] = override.get("selectors", [])

    initial_map: dict[str, set[str]] = {}
    for item in manifest.get("imports", []):
        if "lookup" in item:
            lkey = item["lookup"]
            l_def = resolve_lookup_by_key(lkey, None, interfaces)
            if not l_def:
                continue
            matched_ids = evaluate_lookup(library, l_def, interfaces)
            for aid in matched_ids:
                initial_map.setdefault(aid, set()).add(lkey)
        elif "query" in item:
            matched_ids = select_atoms_by_query(library, item["query"])
            for aid in matched_ids:
                initial_map.setdefault(aid, set())

    final_atom_map = resolve_dependencies(initial_map, library, interfaces)
    kernel_ids = {k for k, v in library.items() if v["meta"].get("type") == "kernel"}
    for k_id in kernel_ids:
        if k_id not in final_atom_map:
            final_atom_map[k_id] = set()

    prompt_text = serialize_prompt(final_atom_map, library)
    chunks_data = generate_prompt_chunks(final_atom_map, library)
    profile_data = generate_prompt_profile(final_atom_map, library)

    hooked_output = None
    if req.apply_hook:
        hooked_output = _execute_hook(ws_cfg.post_process_hook, prompt_text)

    return BuildResponse(
        prompt=prompt_text,
        hooked_prompt=hooked_output,
        chunks=[PromptChunk(**c) for c in chunks_data],
        profile=profile_data,
    )


class AdhocCompileRequest(BaseModel):
    imports: list[dict[str, Any]]
    overrides: dict[str, Any] | None = None
    apply_hook: bool = False


@router.post("/compile-adhoc", response_model=BuildResponse)
def compile_adhoc(
    req: AdhocCompileRequest,
    x_aca_workspace: str | None = Header(None),
):
    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, _, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths

    library = lib_repo.load_library(library_paths, fail_fast=False)
    interfaces = lib_repo.load_interfaces(library_paths)

    if not library:
        raise HTTPException(status_code=400, detail="Library is empty")

    if req.overrides:
        for lkey, override in req.overrides.items():
            if lkey in interfaces["lookups"]:
                interfaces["lookups"][lkey]["selectors"] = override.get("selectors", [])

    initial_map: dict[str, set[str]] = {}
    for item in req.imports:
        if "lookup" in item:
            lkey = item["lookup"]
            l_def = resolve_lookup_by_key(lkey, None, interfaces)
            if not l_def:
                continue
            matched_ids = evaluate_lookup(library, l_def, interfaces)
            for aid in matched_ids:
                initial_map.setdefault(aid, set()).add(lkey)
        elif "query" in item:
            matched_ids = select_atoms_by_query(library, item["query"])
            for aid in matched_ids:
                initial_map.setdefault(aid, set())

    final_atom_map = resolve_dependencies(initial_map, library, interfaces)
    kernel_ids = {k for k, v in library.items() if v["meta"].get("type") == "kernel"}
    for k_id in kernel_ids:
        if k_id not in final_atom_map:
            final_atom_map[k_id] = set()

    prompt_text = serialize_prompt(final_atom_map, library)
    chunks_data = generate_prompt_chunks(final_atom_map, library)
    profile_data = generate_prompt_profile(final_atom_map, library)

    hooked_output = None
    if req.apply_hook:
        hooked_output = _execute_hook(ws_cfg.post_process_hook, prompt_text)

    return BuildResponse(
        prompt=prompt_text,
        hooked_prompt=hooked_output,
        chunks=[PromptChunk(**c) for c in chunks_data],
        profile=profile_data,
    )


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
    from pathlib import Path

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


class CollectingMessageBus:
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

    def error(self, msg_id: str, **kwargs: Any) -> None:
        self.error_count += 1
        self.issues.append(
            {
                "level": "错误",
                "code": msg_id,
                "message": self._format(msg_id, **kwargs),
            }
        )

    def lint_error(self, msg_id: str, **kwargs: Any) -> None:
        self.error_count += 1
        self.issues.append(
            {
                "level": "错误",
                "code": msg_id,
                "message": self._format(msg_id, **kwargs),
            }
        )

    def warn(self, msg_id: str, **kwargs: Any) -> None:
        self.warn_count += 1
        self.issues.append(
            {
                "level": "警告",
                "code": msg_id,
                "message": self._format(msg_id, **kwargs),
            }
        )

    def info(self, msg_id: str, **kwargs: Any) -> None:
        pass

    def success(self, msg_id: str, **kwargs: Any) -> None:
        pass


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


class EvaluateLookupRequest(BaseModel):
    selectors: list[dict[str, Any]]
    package: str | None = None
    pillar: str = "d1"


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


class AdhocLookupCompileRequest(BaseModel):
    key: str = "adhoc-lookup"
    selectors: list[dict[str, Any]]
    package: str | None = None
    pillar: str = "d1"
    apply_hook: bool = False


@router.post("/lookups/compile-adhoc", response_model=BuildResponse)
def compile_lookup_adhoc(
    req: AdhocLookupCompileRequest,
    x_aca_workspace: str | None = Header(None),
):
    """根据 Lookup 选择器及其传递闭包依赖，生成局部切片 Prompt 与结构化 Chunks"""
    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, _, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths

    library = lib_repo.load_library(library_paths, fail_fast=False)
    interfaces = lib_repo.load_interfaces(library_paths)

    if not library:
        raise HTTPException(status_code=400, detail="Library is empty")

    lookup_def = {
        "selectors": req.selectors,
        "package": req.package,
        "pillar": req.pillar,
    }

    try:
        matched_ids = evaluate_lookup(library, lookup_def, interfaces)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"选择器演算异常: {e}")

    initial_map: dict[str, set[str]] = {}
    for aid in matched_ids:
        initial_map.setdefault(aid, set()).add(req.key)

    try:
        final_atom_map = resolve_dependencies(initial_map, library, interfaces)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"依赖解析异常: {e}")

    prompt_text = serialize_prompt(final_atom_map, library)
    chunks_data = generate_prompt_chunks(final_atom_map, library)
    profile_data = generate_prompt_profile(final_atom_map, library)

    hooked_output = None
    if req.apply_hook:
        hooked_output = _execute_hook(ws_cfg.post_process_hook, prompt_text)

    return BuildResponse(
        prompt=prompt_text,
        hooked_prompt=hooked_output,
        chunks=[PromptChunk(**c) for c in chunks_data],
        profile=profile_data,
    )


class AdhocLookupGraphRequest(BaseModel):
    key: str = "adhoc-lookup"
    selectors: list[dict[str, Any]]
    package: str | None = None
    pillar: str = "d1"


@router.post("/lookups/graph-adhoc")
def get_adhoc_lookup_graph(
    req: AdhocLookupGraphRequest,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, Any]:
    """以当前 Lookup 为根节点，生成包含一阶命中及 D2 级联依赖的有向拓扑图"""
    ws_id = get_current_workspace_id(x_aca_workspace)
    lib_repo, _, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths

    library = lib_repo.load_library(library_paths, fail_fast=False)
    interfaces = lib_repo.load_interfaces(library_paths)

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    visited_nodes: set[str] = set()
    visited_edges: set[tuple[str, str]] = set()

    root_lookup_id = f"lookup::{req.key}"
    nodes.append(
        {
            "id": root_lookup_id,
            "type": "lookupNode",
            "data": {
                "key": req.key,
                "pillar": req.pillar,
                "description": "即席编辑中接口",
                "isBroken": False,
                "isPrivate": False,
            },
        }
    )
    visited_nodes.add(root_lookup_id)

    def add_edge(source: str, target: str, label: str = ""):
        if (source, target) not in visited_edges:
            edges.append(
                {
                    "id": f"e_{source}->{target}",
                    "source": source,
                    "target": target,
                    "label": label,
                    "animated": True,
                }
            )
            visited_edges.add((source, target))

    def process_lookup(lkey: str, parent_id: str, context_pkg: str | None = None):
        lookup_node_id = f"lookup::{lkey}"
        if lookup_node_id in visited_nodes:
            add_edge(parent_id, lookup_node_id)
            return

        target_def = resolve_lookup_by_key(lkey, context_pkg, interfaces)
        is_broken = target_def is None
        is_private_access = False
        pillar = "unknown"
        desc = ""

        if target_def:
            pillar = target_def.get("pillar", "unknown")
            desc = target_def.get("description", "")
            target_pkg = target_def.get("package")
            if (
                target_pkg
                and target_pkg != context_pkg
                and target_def.get("visibility") == "private"
            ):
                is_private_access = True

        nodes.append(
            {
                "id": lookup_node_id,
                "type": "lookupNode",
                "data": {
                    "key": lkey,
                    "pillar": pillar,
                    "description": desc,
                    "isBroken": is_broken,
                    "isPrivate": is_private_access,
                },
            }
        )
        visited_nodes.add(lookup_node_id)
        add_edge(parent_id, lookup_node_id)

        if not target_def:
            return

        try:
            matched_atom_ids = evaluate_lookup(library, target_def, interfaces)
        except (BuildError, KeyError, ValueError):
            matched_atom_ids = set()

        for atom_id in matched_atom_ids:
            process_atom(atom_id, lookup_node_id)

    def process_atom(atom_id: str, parent_id: str):
        atom_node_id = f"atom::{atom_id}"
        if atom_node_id in visited_nodes:
            add_edge(parent_id, atom_node_id)
            return

        atom = library.get(atom_id)
        if not atom:
            return

        meta = atom["meta"]
        atom_type = meta.get("type", "unknown")
        priority = meta.get("priority")
        pkg = atom.get("package")
        content = atom.get("content", "")

        nodes.append(
            {
                "id": atom_node_id,
                "type": "atomNode",
                "data": {
                    "id": atom_id,
                    "type": atom_type,
                    "priority": priority,
                    "package": pkg,
                    "content": content,
                    "source_file": atom.get("source_file"),
                },
            }
        )
        visited_nodes.add(atom_node_id)
        add_edge(parent_id, atom_node_id)

        if atom_type == "d2":
            uses = meta.get("uses", [])
            for use_ref in uses:
                process_lookup(use_ref, atom_node_id, context_pkg=pkg)

    # 1. 求解根即席选择器
    lookup_def = {
        "selectors": req.selectors,
        "package": req.package,
        "pillar": req.pillar,
    }
    try:
        direct_atom_ids = evaluate_lookup(library, lookup_def, interfaces)
    except Exception:
        direct_atom_ids = set()

    for aid in direct_atom_ids:
        process_atom(aid, root_lookup_id)

    return {"nodes": nodes, "edges": edges}


class CreateLookupRequest(BaseModel):
    package: str
    key: str
    pillar: str  # d1, d2, d3
    is_public: bool = True
    description: str = ""
    selectors: list[dict[str, Any]] = []


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

    target_pkg_dir = None
    target_pkg_yaml = None
    for lib_root in library_paths:
        if not lib_root.exists():
            continue
        for pkg_file in lib_root.rglob("package.yaml"):
            try:
                pkg_data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                if pkg_data and pkg_data.get("name") == req.package:
                    target_pkg_dir = pkg_file.parent
                    target_pkg_yaml = pkg_file
                    break
            except (yaml.YAMLError, OSError):
                continue
        if target_pkg_dir:
            break

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

        broadcast_change("LIBRARY_DIRTY")
        return {"status": "ok", "key": lookup_name, "package": req.package}
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
    if not lookup_def:
        raise HTTPException(status_code=404, detail=f"Lookup '{lookup_key}' not found")

    pkg_name = lookup_def.get("package")
    raw_key = lookup_key.split("::")[-1]
    is_public = lookup_def.get("visibility") == "public"

    target_pkg_dir = None
    target_pkg_yaml = None
    for lib_root in library_paths:
        if not lib_root.exists():
            continue
        for pkg_file in lib_root.rglob("package.yaml"):
            try:
                pkg_data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                if pkg_data and pkg_data.get("name") == pkg_name:
                    target_pkg_dir = pkg_file.parent
                    target_pkg_yaml = pkg_file
                    break
            except (yaml.YAMLError, OSError):
                continue
        if target_pkg_dir:
            break

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


class CreateAtomRequest(BaseModel):
    package: str | None = None
    id: str | None = None
    type: str  # d1, d2, d3, kernel
    priority: int | None = None
    domain: list[str] = []
    uses: list[str] = []
    content: str


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
            for lib_root in library_paths:
                if not lib_root.exists():
                    continue
                for pkg_file in lib_root.rglob("package.yaml"):
                    try:
                        pkg_data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                        if pkg_data and pkg_data.get("name") == req.package:
                            target_dir = pkg_file.parent
                            break
                    except Exception:
                        continue
        target_file = target_dir / "kernel.md"
        full_content = f"---\ntype: kernel\n---\n\n{req.content.strip()}\n"
        try:
            target_file.write_text(full_content, encoding="utf-8")
            broadcast_change("LIBRARY_DIRTY")
            return {
                "status": "ok",
                "file": str(target_file),
                "id": "kernel",
            }
        except OSError as e:
            raise HTTPException(status_code=500, detail=f"保存 Kernel 失败: {e}")

    target_pkg_dir = None
    for lib_root in library_paths:
        if not lib_root.exists():
            continue
        for pkg_file in lib_root.rglob("package.yaml"):
            try:
                pkg_data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                if pkg_data and pkg_data.get("name") == req.package:
                    target_pkg_dir = pkg_file.parent
                    break
            except (yaml.YAMLError, OSError):
                continue
        if target_pkg_dir:
            break

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
        return {
            "status": "ok",
            "file": str(target_file),
            "id": atom_id,
        }
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"保存原子失败: {e}")


@router.get("/atoms/{atom_id}")
def get_atom_detail(
    atom_id: str,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, Any]:
    from pathlib import Path

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


class UpdateAtomRequest(BaseModel):
    raw_content: str | None = None
    content: str | None = None
    meta: dict[str, Any] | None = None


@router.put("/atoms/{atom_id}")
def update_atom(
    atom_id: str,
    req: UpdateAtomRequest,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, str]:
    from pathlib import Path

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
    from pathlib import Path

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


class CreatePackageRequest(BaseModel):
    name: str
    description: str = ""
    version: str = "1.0.0"
    workspace_path: str | None = None


@router.post("/packages")
def create_package(
    req: CreatePackageRequest,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, Any]:
    from pathlib import Path

    ws_id = get_current_workspace_id(x_aca_workspace)
    _, _, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    if not library_paths:
        raise HTTPException(status_code=400, detail="当前工作区未配置知识库路径")

    for lib_root in library_paths:
        if not lib_root.exists():
            continue
        for pkg_file in lib_root.rglob("package.yaml"):
            try:
                pkg_data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                if pkg_data and pkg_data.get("name") == req.name:
                    raise HTTPException(
                        status_code=400,
                        detail=f"当前工作区内已存在同名组件包: '{req.name}'",
                    )
            except (yaml.YAMLError, OSError):
                continue

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


@router.delete("/packages/{package_name}")
def delete_package(
    package_name: str,
    x_aca_workspace: str | None = Header(None),
) -> dict[str, str]:
    import shutil

    ws_id = get_current_workspace_id(x_aca_workspace)
    _, _, _, _, ws_cfg = _bootstrap(ws_id)
    library_paths = ws_cfg.library_paths
    if not library_paths:
        raise HTTPException(status_code=400, detail="当前工作区未配置知识库路径")

    target_pkg_dir = None
    for lib_root in library_paths:
        if not lib_root.exists():
            continue
        for pkg_file in lib_root.rglob("package.yaml"):
            try:
                pkg_data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                if pkg_data and pkg_data.get("name") == package_name:
                    target_pkg_dir = pkg_file.parent
                    break
            except (yaml.YAMLError, OSError):
                continue
        if target_pkg_dir:
            break

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


class OpenObsidianRequest(BaseModel):
    file_path: str


@router.post("/system/open-obsidian")
def open_in_obsidian(req: OpenObsidianRequest):
    import sys
    import urllib.parse
    from pathlib import Path

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


active_subscribers: set[asyncio.Queue] = set()


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


def broadcast_change(change_type: str = "LIBRARY_DIRTY"):
    for q in list(active_subscribers):
        try:
            q.put_nowait(change_type)
        except asyncio.QueueFull:
            pass
