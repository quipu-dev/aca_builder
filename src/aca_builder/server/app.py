from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from aca_builder import config
from aca_builder.server.routes import broadcast_change


async def watch_files_task():
    """后台任务：监控知识库与清单目录的文件变更并触发广播"""
    try:
        from watchfiles import awatch
    except ImportError:
        # 如果当前环境未安装 watchfiles，平稳降级
        return

    app_config = config.load_config()
    library_paths = [p for p in config.get_library_paths(app_config) if p.exists()]
    manifest_paths = [p for p in config.get_manifest_paths(app_config) if p.exists()]
    watch_dirs = list(set(library_paths + manifest_paths))

    if not watch_dirs:
        return

    try:
        async for changes in awatch(*watch_dirs):
            # 过滤只响应 .md 与 .yaml
            relevant = any(path.endswith((".md", ".yaml")) for _, path in changes)
            if relevant:
                broadcast_change("LIBRARY_DIRTY")
    except asyncio.CancelledError:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动后台文件监听任务
    task = asyncio.create_task(watch_files_task())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


def create_app() -> FastAPI:
    app = FastAPI(
        title="ACA 工作台服务",
        description="用于 ACA 系统的本地编译与可视化开发控制台",
        version="0.4.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:43700",
            "http://127.0.0.1:43700",
            "http://localhost:43699",
            "http://127.0.0.1:43699",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from aca_builder.server.routes import router as api_router

    app.include_router(api_router, prefix="/api")

    # 静态前端资源目录挂载
    static_dir = Path(__file__).parent / "static"
    if static_dir.exists():
        app.mount(
            "/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets"
        )

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            target_file = static_dir / full_path
            if target_file.is_file():
                return FileResponse(target_file)
            return FileResponse(static_dir / "index.html")

    return app
