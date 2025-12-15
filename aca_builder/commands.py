import typer
import subprocess
from typing import Optional

from . import config
from .domain.events import BuildError
from .domain.services import resolve_lookup_by_key, evaluate_lookup
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


def debug_lookup(
    lookup_key: str = typer.Argument(..., help="The lookup key to debug, e.g., 'pkg::d1l-name'")
):
    """Debug a lookup key to see which atoms it resolves to."""
    lib_repo, _, bus = _bootstrap()
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)

    try:
        library = lib_repo.load_library(library_paths, fail_fast=True)
        interfaces = lib_repo.load_interfaces(library_paths)
    except BuildError as e:
        # Catch errors during library loading itself
        bus.error("system.unexpected_error", error=str(e))
        raise typer.Exit(code=1)

    bus.info("debug.start", key=lookup_key)
    lookup_def = resolve_lookup_by_key(lookup_key, None, interfaces)
    if not lookup_def:
        bus.error("debug.lookup_not_found", key=lookup_key)
        raise typer.Exit(code=1)

    try:
        atom_ids = evaluate_lookup(library, lookup_def, interfaces)
    except BuildError as e:
        # Catch errors during lookup evaluation
        bus.error("system.unexpected_error", error=str(e))
        raise typer.Exit(code=1)

    if not atom_ids:
        bus.warn("debug.no_results")
        return

    bus.success("debug.result_header", count=len(atom_ids))
    for atom_id in sorted(list(atom_ids)):
        atom = library.get(atom_id)
        if atom:
            bus.info(
                "debug.result_item",
                atom_id=atom["id"],
                type=atom["meta"]["type"],
                pkg=atom.get("package") or "global",
                src=atom["source_file"],
            )


def info(
    list_legacy: bool = typer.Option(False, "--list-legacy", help="List all legacy (non-packaged) atoms."),
    package: Optional[str] = typer.Option(None, "--package", "-p", help="Display public interface for a specific package.")
):
    """Display statistics about the ACA library, packages, or a specific package's interface."""
    lib_repo, _, bus = _bootstrap()
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)

    if package:
        try:
            interfaces = lib_repo.load_interfaces(library_paths)
            found_lookups = []
            for key, l_def in interfaces.get("lookups", {}).items():
                if l_def.get("package") == package and l_def.get("visibility") == "public":
                    found_lookups.append((key, l_def))

            if not found_lookups:
                bus.warn("info.pkg.not_found", name=package)
                raise typer.Exit()

            bus.success("info.pkg.header", name=package)
            for key, l_def in sorted(found_lookups):
                description = l_def.get("description", bus._format("info.pkg.no_desc"))
                bus.info("info.pkg.item", key=key, desc=description)
            return
        except Exception as e:
            bus.error("system.unexpected_error", error=str(e))
            raise typer.Exit(code=1)

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
