from __future__ import annotations

import typer


def list_manifests(
    ctx: typer.Context,
    workspace: str | None = typer.Option(
        None, "--workspace", "-w", help="Target workspace identifier"
    ),
):
    """List all available manifests across configured search paths."""
    from aca_builder.commands import _bootstrap

    _lib_repo, man_repo, bus, _ws_id, ws_cfg = _bootstrap(workspace)
    manifest_paths = ws_cfg.manifest_paths

    if not manifest_paths:
        bus.warn("system.config.no_manifest")
        return

    manifests = man_repo.list_manifests(manifest_paths)
    if not manifests:
        bus.warn("system.list.no_manifests")
        return

    for name in manifests:
        typer.echo(name)
