import typer

from aca_builder import config
from aca_builder.domain.events import BuildError
from aca_builder.use_cases.linter import LinterService


def lint():
    """Lint and validate libraries, atoms, lookups, and manifests."""
    from aca_builder.commands import _bootstrap

    lib_repo, man_repo, bus = _bootstrap()
    linter = LinterService(bus, lib_repo, man_repo)
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)
    manifest_paths = config.get_manifest_paths(app_config)

    if not library_paths:
        bus.error("system.config.no_lib")
        raise typer.Exit(code=1)

    try:
        linter.lint(library_paths, manifest_paths)
    except BuildError as e:
        if str(e) != "LINT_FAILED_SILENTLY":
            bus.error("system.unexpected_error", error=str(e))
        raise typer.Exit(code=1)
    except Exception as e:  # noqa: BLE001
        bus.error("system.critical_lint_error", error=str(e))
        raise typer.Exit(code=1)
