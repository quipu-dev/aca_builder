import subprocess

import typer

from aca_builder.domain.events import BuildError
from aca_builder.use_cases.builder import BuilderService


def build(
    manifest_identifier: str = typer.Argument(..., help="Manifest path or name"),
    file: bool = typer.Option(
        False, "--file", "-f", help="Treat identifier as file path"
    ),
    workspace: str | None = typer.Option(
        None, "--workspace", "-w", help="Target workspace identifier"
    ),
):
    """Build a compiled prompt from an ACA manifest identifier or file path."""
    from aca_builder.commands import _bootstrap

    lib_repo, man_repo, bus, _ws_id, ws_cfg = _bootstrap(workspace)
    builder = BuilderService(lib_repo, man_repo)
    library_paths = ws_cfg.library_paths
    manifest_paths = ws_cfg.manifest_paths

    if not library_paths:
        bus.error("system.config.no_lib")
        raise typer.Exit(code=1)

    try:
        final_prompt = builder.build_prompt(
            manifest_identifier, library_paths, manifest_paths, is_file_path=file
        )

        hook_command = ws_cfg.post_process_hook
        if hook_command:
            process = subprocess.run(
                hook_command,
                shell=True,
                input=final_prompt,
                text=True,
                capture_output=True,
                check=False,
            )
            if process.returncode != 0:
                bus.error("builder.hook.fail", stderr=process.stderr)
                raise typer.Exit(code=1)
            print(process.stdout, end="")
        else:
            print(final_prompt)

    except BuildError as e:
        bus.error("system.unexpected_error", error=str(e))
        raise typer.Exit(code=1)
    except Exception as e:  # noqa: BLE001
        bus.error("system.unexpected_error", error=str(e))
        raise typer.Exit(code=1)