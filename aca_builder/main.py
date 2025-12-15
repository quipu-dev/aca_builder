# aca_builder/main.py

import typer

from .commands import build, info, lint, list_manifests

app = typer.Typer(help="ACA (Axiomatic Component Architecture) Prompt Builder")

# Register commands from the commands module
app.command(name="list")(list_manifests)
app.command()(build)
app.command()(info)
app.command()(lint)


if __name__ == "__main__":
    app()
