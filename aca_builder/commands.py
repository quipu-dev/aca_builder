import typer
import subprocess

from . import config
from .domain.events import BuildError
from .infra.filesystem import FSLibraryRepository, FSManifestRepository
from .infra.bus import ConsoleMessageBus
from .use_cases.linter import LinterService
from .use_cases.builder import BuilderService


# --- Bootstrap Dependencies ---
def _bootstrap():
    lib_repo = FSLibraryRepository()
    man_repo = FSManifestRepository()
    bus = ConsoleMessageBus()
    return lib_repo, man_repo, bus


def list_manifests(ctx: typer.Context):
    lib_repo, man_repo, bus = _bootstrap()
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


def build(
    manifest_identifier: str = typer.Argument(..., help="Manifest path or name"),
    file: bool = typer.Option(
        False, "--file", "-f", help="Treat identifier as file path"
    ),
):
    lib_repo, man_repo, bus = _bootstrap()
    builder = BuilderService(lib_repo, man_repo)
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)
    manifest_paths = config.get_manifest_paths(app_config)

    if not library_paths:
        bus.error("system.config.no_lib")
        raise typer.Exit(code=1)

    try:
        final_prompt = builder.build_prompt(
            manifest_identifier, library_paths, manifest_paths, is_file_path=file
        )

        hook_command = config.get_post_process_hook(app_config)
        if hook_command:
            process = subprocess.run(
                hook_command,
                shell=True,
                input=final_prompt,
                text=True,
                capture_output=True,
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
    except Exception as e:
        bus.error("system.unexpected_error", error=str(e))
        raise typer.Exit(code=1)


def lint():
    lib_repo, man_repo, bus = _bootstrap()
    linter = LinterService(bus, lib_repo, man_repo)
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)
    manifest_paths = config.get_manifest_paths(app_config)

    if not library_paths:
        bus.error("system.config.no_lib")
        raise typer.Exit(code=1)

    try:
        linter.lint(library_paths, manifest_paths)
    except BuildError as e:
        if str(e) != "LINT_FAILED_SILENTLY":
            bus.error("system.unexpected_error", error=str(e))
        raise typer.Exit(code=1)
    except Exception as e:
        bus.error("system.critical_lint_error", error=str(e))
        raise typer.Exit(code=1)


def info(list_legacy: bool = typer.Option(False, "--list-legacy")):
    lib_repo, _, bus = _bootstrap()
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)

    try:
        library = lib_repo.load_library(library_paths, fail_fast=False)
        packages = set()
        legacy_atoms = []

        for atom in library.values():
            if pkg_name := atom.get("package"):
                packages.add(pkg_name)
            else:
                if atom["meta"]["type"] != "kernel":
                    legacy_atoms.append(atom["id"])

        bus.info("system.stats.header")
        bus.info("system.stats.pkg_count", count=len(packages))
        if packages:
            for p in sorted(list(packages)):
                bus.info("system.stats.pkg_item", name=p)

        bus.warn("system.stats.legacy_count", count=len(legacy_atoms))
        if list_legacy and legacy_atoms:
            for aid in sorted(legacy_atoms):
                bus.info("system.stats.legacy_item", atom_id=aid)

    except Exception as e:
        bus.error("system.unexpected_error", error=str(e))
        raise typer.Exit(code=1)
