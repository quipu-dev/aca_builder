from __future__ import annotations

from fastapi import APIRouter

from aca_builder.server.common import (
    broadcast_change,
    get_current_workspace_id,
)
from aca_builder.server.routers.assets import router as assets_router
from aca_builder.server.routers.atoms import router as atoms_router
from aca_builder.server.routers.build import router as build_router
from aca_builder.server.routers.graph import router as graph_router
from aca_builder.server.routers.lookups import router as lookups_router
from aca_builder.server.routers.manifests import router as manifests_router
from aca_builder.server.routers.workspaces import router as workspaces_router

router = APIRouter()

# 聚合所有业务领域子路由
router.include_router(workspaces_router)
router.include_router(assets_router)
router.include_router(manifests_router)
router.include_router(atoms_router)
router.include_router(lookups_router)
router.include_router(build_router)
router.include_router(graph_router)

__all__ = ["broadcast_change", "get_current_workspace_id", "router"]
