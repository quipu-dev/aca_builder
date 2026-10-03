from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from aca_builder.commands import _bootstrap
from aca_builder.server.common import get_current_workspace_id
from aca_builder.server.graph_service import build_topology_graph

router = APIRouter()


class AdhocGraphRequest(BaseModel):
    name: str = "draft"
    imports: list[dict[str, Any]]
    overrides: dict[str, Any] | None = None


class AdhocLookupGraphRequest(BaseModel):
    key: str = "adhoc-lookup"
    selectors: list[dict[str, Any]]
    package: str | None = None
    pillar: str = "d1"


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

    return build_topology_graph(manifest, manifest_data, library, interfaces)


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

    return build_topology_graph(req.name, manifest_data, library, interfaces)


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

    lookup_def = {
        "key": req.key,
        "selectors": req.selectors,
        "package": req.package,
        "pillar": req.pillar,
    }

    return build_topology_graph(
        manifest_label=req.key,
        manifest_data=None,
        library=library,
        interfaces=interfaces,
        root_lookup=lookup_def,
    )
