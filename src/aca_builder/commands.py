# CLI commands facade and bootstrap helper
from aca_builder.cli.commands.build import build
from aca_builder.cli.commands.debug import debug_lookup
from aca_builder.cli.commands.info import info
from aca_builder.cli.commands.lint import lint
from aca_builder.cli.commands.manifests import list_manifests
from aca_builder.cli.commands.studio import studio
from aca_builder.infra.bus import ConsoleMessageBus
from aca_builder.infra.filesystem import FSLibraryRepository, FSManifestRepository


def _bootstrap():
    """Bootstraps dependency injection for CLI commands."""
    lib_repo = FSLibraryRepository()
    man_repo = FSManifestRepository()
    bus = ConsoleMessageBus()
    return lib_repo, man_repo, bus


__all__ = [
    "_bootstrap",
    "build",
    "debug_lookup",
    "info",
    "lint",
    "list_manifests",
    "studio",
]
