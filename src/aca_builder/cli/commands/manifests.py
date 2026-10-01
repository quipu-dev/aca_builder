import typer

from aca_builder import config


def list_manifests(ctx: typer.Context):
    """List all available manifests across configured search paths."""
    from aca_builder.commands import _bootstrap

    _lib_repo, man_repo, bus = _bootstrap()
    app_config = config.load_config()
    manifest_paths = config.get_manifest_paths(app_config)

    if not manifest_paths:
        bus.warn("system.config.no_manifest")
        return

    manifests = man_repo.list_manifests(manifest_paths)
    if not manifests:
        bus.warn("system.list.no_manifests")
        return

    for name in manifests:
        typer.echo(name)
