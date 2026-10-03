from __future__ import annotations

import typer

from aca_builder.use_cases.inspector import InspectorService


def info(
    list_legacy: bool = typer.Option(
        False, "--list-legacy", help="List all legacy (non-packaged) atoms."
    ),
    package: str | None = typer.Option(
        None, "--package", "-p", help="Display public interface for a specific package."
    ),
    workspace: str | None = typer.Option(
        None, "--workspace", "-w", help="Target workspace identifier"
    ),
):
    """Display statistics about the ACA library, packages, or a specific package's interface."""
    from aca_builder.commands import _bootstrap

    lib_repo, _, bus, _ws_id, ws_cfg = _bootstrap(workspace)
    library_paths = ws_cfg.library_paths

    inspector = InspectorService(bus, lib_repo)
    try:
        success = inspector.inspect(
            library_paths, package=package, list_legacy=list_legacy
        )
        if not success:
            raise typer.Exit(code=1 if package else 0)
    except typer.Exit:
        raise
    except Exception as e:  # noqa: BLE001
        bus.error("system.unexpected_error", error=str(e))
        raise typer.Exit(code=1)