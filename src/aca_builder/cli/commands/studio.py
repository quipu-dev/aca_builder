import webbrowser
from pathlib import Path

import typer
import uvicorn


def studio(
    host: str = typer.Option("127.0.0.1", "--host", "-h", help="绑定主机地址"),
    port: int = typer.Option(43699, "--port", "-p", help="后端端口"),
    open_browser: bool = typer.Option(
        True, "--open/--no-open", help="启动时是否自动打开浏览器"
    ),
    dev: bool = typer.Option(False, "--dev", help="开发模式（热重载与 Vite 端口代理）"),
):
    """启动 ACA 工作台可视化控制台"""
    static_dir = Path(__file__).parent.parent.parent / "server" / "static"
    has_static = static_dir.exists() and (static_dir / "index.html").exists()

    if dev or not has_static:
        target_url = "http://localhost:43700"
        typer.secho(
            "🚀 启动 ACA 开发工作台模式",
            fg=typer.colors.CYAN,
        )
        typer.secho(
            f"🖥️  请确保前端服务运行在: {target_url}",
            fg=typer.colors.YELLOW,
        )
    else:
        target_url = f"http://{host}:{port}"
        typer.secho(
            f"🚀 启动 ACA 独立自包含工作台: {target_url}",
            fg=typer.colors.GREEN,
        )

    if open_browser:
        webbrowser.open(target_url)

    uvicorn.run(
        "aca_builder.server.app:create_app",
        host=host,
        port=port,
        factory=True,
        reload=dev,
    )
