from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from aca_builder.commands import _bootstrap
from aca_builder.server.common import get_current_workspace_id
from aca_builder.server.compile_service import BuildResponse, run_compilation_pipeline

router = APIRouter()


class BuildRequest(BaseModel):
    manifest: str
    is_file: bool = False
    apply_hook: bool = False


class AdhocCompileRequest(BaseModel):
    imports: list[dict[str, Any]]
    apply_hook: bool = False


class AdhocLookupCompileRequest(BaseModel):
    key: str = "adhoc-lookup"
    selectors: list[dict[str, Any]]
    package: str | None = None
    pillar: str = "d1"
    apply_hook: bool = False


@router.post("/build", response_model=BuildResponse)
def build_prompt(
    req: BuildRequest,
    x_aca_workspace: str | None = Header(None),
):
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

    return run_compilation_pipeline(
        library=library,
        interfaces=interfaces,
        imports=manifest.get("imports", []),
        apply_hook=req.apply_hook,
        hook_command=ws_cfg.post_process_hook,
    )


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

    return run_compilation_pipeline(
        library=library,
        interfaces=interfaces,
        imports=req.imports,
        apply_hook=req.apply_hook,
        hook_command=ws_cfg.post_process_hook,
    )


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

    lookup_def = {
        "selectors": req.selectors,
        "package": req.package,
        "pillar": req.pillar,
    }

    return run_compilation_pipeline(
        library=library,
        interfaces=interfaces,
        direct_lookup=(req.key, lookup_def),
        apply_hook=req.apply_hook,
        hook_command=ws_cfg.post_process_hook,
        include_kernel=False,
    )
