from pathlib import Path

import typer

from aca_builder import config

workspace_app = typer.Typer(help="Manage ACA isolated workspaces (vaults)")


@workspace_app.command("list")
def list_workspaces():
    """List all registered workspaces and the default one."""
    cfg = config.load_config()
    default_ws = cfg.get("default_workspace")
    workspaces = config.get_workspaces(cfg)

    if not workspaces:
        typer.secho("No workspaces configured.", fg=typer.colors.YELLOW)
        return

    typer.secho("Registered Workspaces:", fg=typer.colors.CYAN, bold=True)
    for ws_id, ws in workspaces.items():
        is_default = (ws_id == default_ws)
        star = "* " if is_default else "  "
        suffix = " (default)" if is_default else ""
        root_str = f" [root: {ws.root}]" if ws.root else ""
        typer.secho(
            f"{star}{ws_id}: {ws.name}{root_str}{suffix}",
            fg=typer.colors.GREEN if is_default else typer.colors.WHITE,
        )


@workspace_app.command("set-default")
def set_default_workspace(
    name: str = typer.Argument(..., help="Workspace identifier to set as default")
):
    """Set the default workspace."""
    cfg = config.load_config()
    workspaces = config.get_workspaces(cfg)
    if name not in workspaces:
        typer.secho(f"Error: Workspace '{name}' not found.", fg=typer.colors.RED)
        raise typer.Exit(code=1)

    cfg["default_workspace"] = name
    config.save_config(cfg)
    typer.secho(f"Default workspace updated to '{name}'.", fg=typer.colors.GREEN)


@workspace_app.command("add")
def add_workspace(
    name: str = typer.Argument(..., help="Unique workspace identifier"),
    root: Path = typer.Argument(..., help="Root path of the workspace"),
    display_name: str | None = typer.Option(None, "--name", "-n", help="Display name"),
    hook: str | None = typer.Option(None, "--hook", help="Post process hook command"),
):
    """Register a new workspace."""
    cfg = config.load_config()
    workspaces = cfg.setdefault("workspaces", {})
    if name in workspaces:
        typer.secho(f"Error: Workspace '{name}' already exists.", fg=typer.colors.RED)
        raise typer.Exit(code=1)

    abs_root = str(root.expanduser().resolve())
    workspaces[name] = {
        "name": display_name or name,
        "root": abs_root,
    }
    if hook:
        workspaces[name]["post_process_hook"] = hook

    if "default_workspace" not in cfg or not cfg["default_workspace"]:
        cfg["default_workspace"] = name

    config.save_config(cfg)
    typer.secho(f"Workspace '{name}' added successfully ({abs_root}).", fg=typer.colors.GREEN)


@workspace_app.command("remove")
def remove_workspace(
    name: str = typer.Argument(..., help="Workspace identifier to remove")
):
    """Remove a workspace from configuration."""
    cfg = config.load_config()
    workspaces = cfg.get("workspaces", {})
    if name not in workspaces:
        typer.secho(f"Error: Workspace '{name}' not found.", fg=typer.colors.RED)
        raise typer.Exit(code=1)

    del workspaces[name]
    if cfg.get("default_workspace") == name:
        cfg["default_workspace"] = next(iter(workspaces.keys())) if workspaces else None

    config.save_config(cfg)
    typer.secho(f"Workspace '{name}' removed.", fg=typer.colors.GREEN)