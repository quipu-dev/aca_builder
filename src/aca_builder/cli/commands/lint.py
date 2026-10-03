from __future__ import annotations

import typer

from aca_builder.domain.events import BuildError
from aca_builder.use_cases.linter import LinterService


def lint(
    workspace: str | None = typer.Option(
        None, "--workspace", "-w", help="Target workspace identifier"
    ),
):
    """Lint and validate libraries, atoms, lookups, and manifests within a workspace."""
    from aca_builder.commands import _bootstrap

    lib_repo, man_repo, bus, _ws_id, ws_cfg = _bootstrap(workspace)
    linter = LinterService(bus, lib_repo, man_repo)
    library_paths = ws_cfg.library_paths
    manifest_paths = ws_cfg.manifest_paths

    if not library_paths:
        bus.error("system.config.no_lib")
        raise typer.Exit(code=1)

    try:
        linter.lint(library_paths, manifest_paths)
    except BuildError as e:
        if str(e) != "LINT_FAILED_SILENTLY":
            bus.error("system.unexpected_error", error=str(e))
        raise typer.Exit(code=1)
    except Exception as e:
        bus.error("system.critical_lint_error", error=str(e))
        raise typer.Exit(code=1)
