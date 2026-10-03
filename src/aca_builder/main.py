# aca_builder/main.py

import typer

from .cli.commands.workspace import workspace_app
from .commands import build, debug_lookup, info, lint, list_manifests, studio

app = typer.Typer(help="ACA (Axiomatic Component Architecture) Prompt Builder")

# Register commands from the commands module
app.command(name="list")(list_manifests)
app.command()(build)
app.command()(info)
app.command()(lint)
app.command(name="debug")(debug_lookup)
app.command(name="studio")(studio)
app.add_typer(workspace_app, name="workspace")


if __name__ == "__main__":
    app()