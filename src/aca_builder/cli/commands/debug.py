import typer

from aca_builder import config
from aca_builder.domain.events import BuildError
from aca_builder.use_cases.debugger import DebuggerService


def debug_lookup(
    lookup_key: str = typer.Argument(
        ..., help="The lookup key to debug, e.g., 'pkg::d1l-name'"
    ),
):
    """Debug a lookup key to see which atoms it resolves to."""
    from aca_builder.commands import _bootstrap

    lib_repo, _, bus = _bootstrap()
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)

    debugger = DebuggerService(bus, lib_repo)
    try:
        success = debugger.debug_lookup(lookup_key, library_paths)
        if not success:
            raise typer.Exit(code=1)
    except BuildError as e:
        bus.error("system.unexpected_error", error=str(e))
        raise typer.Exit(code=1)
    except typer.Exit:
        raise
    except Exception as e:  # noqa: BLE001
        bus.error("system.unexpected_error", error=str(e))
        raise typer.Exit(code=1)
