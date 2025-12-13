# aca_builder/main.py

import typer

from .commands import build, lint

app = typer.Typer(help="ACA (Axiomatic Component Architecture) Prompt Builder")

# Register commands from the commands module
app.command()(build)
app.command()(lint)

if __name__ == "__main__":
    app()