# CLI commands facade and bootstrap helper
from __future__ import annotations

from aca_builder import config
from aca_builder.cli.commands.build import build
from aca_builder.cli.commands.debug import debug_lookup
from aca_builder.cli.commands.info import info
from aca_builder.cli.commands.lint import lint
from aca_builder.cli.commands.manifests import list_manifests
from aca_builder.cli.commands.studio import studio
from aca_builder.infra.bus import ConsoleMessageBus
from aca_builder.infra.cache_db import SQLiteAtomCache
from aca_builder.infra.filesystem import FSLibraryRepository, FSManifestRepository


def _bootstrap(workspace_name: str | None = None):
    """Bootstraps dependency injection for CLI commands bound to a specific workspace."""
    ws_id, ws_cfg = config.resolve_workspace(workspace_name)
    cache_path = config.get_workspace_cache_db_path(ws_id)
    cache_db = SQLiteAtomCache(cache_path)

    lib_repo = FSLibraryRepository(cache_db=cache_db)
    man_repo = FSManifestRepository()
    bus = ConsoleMessageBus()
    return lib_repo, man_repo, bus, ws_id, ws_cfg


__all__ = [
    "_bootstrap",
    "build",
    "debug_lookup",
    "info",
    "lint",
    "list_manifests",
    "studio",
]