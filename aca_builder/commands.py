# aca_builder/commands.py

import typer
from pathlib import Path
import yaml
from typing import Dict, Any

from .exceptions import BuildError, LintError
from .core import (
    load_library,
    load_interfaces,
    apply_overrides,
    select_atoms,
    resolve_dependencies,
    serialize_prompt,
    parse_atom
)

def build(
    manifest_path: Path = typer.Argument(
        ..., exists=True, dir_okay=False, help="Path to the manifest YAML file."
    ),
    library_path: Path = typer.Option(
        "./aca_library",
        exists=True,
        file_okay=False,
        help="Path to the ACA components library.",
    ),
):
    """
    Builds a single system prompt from an ACA manifest and library.
    """
    try:
        manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
        library = load_library(library_path)
        interfaces = load_interfaces(library_path)

        # Apply Manifest Overrides (Dependency Injection)
        if "overrides" in manifest:
            apply_overrides(interfaces, manifest["overrides"])

        # mapping: atom_id -> set(triggering_lookup_names)
        initial_map = {}
        
        imports = manifest.get("imports", [])
        for item in imports:
            if "lookup" in item:
                lkey = item["lookup"]
                if lkey not in interfaces["lookups"]:
                    raise BuildError(f"Manifest Error: Lookup '{lkey}' not found.")
                
                l_def = interfaces["lookups"][lkey]
                for sel in l_def["selectors"]:
                    ids = select_atoms(library, sel["query"])
                    for aid in ids:
                        initial_map.setdefault(aid, set()).add(lkey)

            elif "query" in item:
                # Direct queries have no lookup name source
                ids = select_atoms(library, item["query"])
                for aid in ids:
                    if aid not in initial_map:
                        initial_map[aid] = set()

        # Resolve recursively
        final_atom_map = resolve_dependencies(initial_map, library, interfaces)

        # Ensure kernel is included (it has no trigger lookup)
        kernel_ids = {k for k, v in library.items() if v["meta"]["type"] == "kernel"}
        if not kernel_ids:
            raise BuildError("No 'type: kernel' atom found in the library.")
        for k_id in kernel_ids:
            if k_id not in final_atom_map:
                final_atom_map[k_id] = set()

        final_prompt = serialize_prompt(final_atom_map, library)

        print(final_prompt)

    except (BuildError, FileNotFoundError, yaml.YAMLError) as e:
        typer.secho(f"Error: {e}", fg=typer.colors.RED)
        raise typer.Exit(code=1)


def _validate_atom(atom_path: Path, library_path: Path, interfaces: Dict[str, Any]):
    """Helper function to validate a single atom's metadata and dependencies."""
    # For linting, we parse with the base function which will raise errors.
    atom = parse_atom(atom_path, library_path)
    meta = atom["meta"]

    # D3 specific checks
    if meta["type"] == "d3":
        if "priority" not in meta:
            raise LintError(
                f"Validation Error: D3 atom '{atom_path.name}' is missing 'priority' metadata."
            )
        if meta["priority"] not in [0, 1, 2]:
            raise LintError(
                f"Validation Error: D3 atom '{atom_path.name}' has invalid priority '{meta['priority']}'. Must be 0, 1, or 2."
            )

    # D2 dependency checks
    if meta["type"] == "d2":
        for lookup_key in meta.get("uses", []):
            if lookup_key not in interfaces["lookups"]:
                raise LintError(
                    f"Dependency Error: D2 atom '{atom_path.name}' references non-existent Lookup '{lookup_key}'."
                )
    return atom


def lint(
    library_path: Path = typer.Argument(
        ..., exists=True, file_okay=False, help="Path to the ACA components library."
    ),
):
    """
    Validates an ACA library against the specification for metadata and dependencies.
    """
    typer.echo(f"Linting ACA library at: {library_path}")
    error_count = 0
    kernel_count = 0

    try:
        interfaces = load_interfaces(library_path)

        for atom_path in library_path.glob("**/*.md"):
            try:
                # Lint demands every .md file in the library to be a valid atom.
                atom = _validate_atom(atom_path, library_path, interfaces)
                if atom["meta"]["type"] == "kernel":
                    kernel_count += 1
            except (BuildError, LintError) as e:
                typer.secho(
                    f"  [FAIL] {atom_path.relative_to(library_path)}: {e}",
                    fg=typer.colors.RED,
                )
                error_count += 1

        if kernel_count != 1:
            typer.secho(
                f"Global Error: Exactly one 'type: kernel' atom is required. Found {kernel_count}.",
                fg=typer.colors.RED,
            )
            error_count += 1

    except (BuildError, FileNotFoundError, yaml.YAMLError) as e:
        typer.secho(f"A critical error occurred: {e}", fg=typer.colors.RED)
        raise typer.Exit(code=1)

    if error_count == 0:
        typer.secho("✅ ACA library is valid.", fg=typer.colors.GREEN)
    else:
        typer.secho(
            f"\nLinting failed with {error_count} error(s).", fg=typer.colors.RED
        )
        raise typer.Exit(code=1)