# aca_builder/commands.py

import typer
from pathlib import Path
import yaml
from typing import Dict, Any, List, Optional
import subprocess
import sys

from . import config
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

def _find_manifest_by_name(manifest_name: str, manifest_paths: List[Path]) -> Optional[Path]:
    """Finds a manifest file by its name (e.g., 'pkg/agent' or 'root_agent')."""
    for base_path in manifest_paths:
        if not base_path.is_dir():
            continue
        
        # Construct a potential path relative to the base path
        potential_path = base_path / f"{manifest_name}.yaml"
        if potential_path.is_file():
            return potential_path
            
    return None

def list_manifests(
    ctx: typer.Context
):
    """Lists all available manifests from configured paths."""
    app_config = config.load_config()
    manifest_paths = config.get_manifest_paths(app_config)
    
    if not manifest_paths:
        typer.secho("No 'manifest_paths' configured in ~/.config/aca/config.yaml", fg=typer.colors.YELLOW, err=True)
        return

    found_manifests = set()
    for base_path in manifest_paths:
        if not base_path.is_dir():
            continue
        
        # Use rglob to find all yaml files recursively
        for yaml_file in base_path.rglob("*.yaml"):
            # Create the manifest name relative to the base_path
            relative_path = yaml_file.relative_to(base_path)
            manifest_name = str(relative_path.with_suffix(''))
            found_manifests.add(manifest_name)
    
    if not found_manifests:
        typer.secho("No manifest files found in the configured paths.", fg=typer.colors.YELLOW, err=True)
        return
        
    for name in sorted(list(found_manifests)):
        typer.echo(name)


def build(
    manifest_identifier: str = typer.Argument(
        ..., help="Path to a manifest file or a manifest name (e.g., 'my_package/agent')."
    ),
    file: bool = typer.Option(
        False, "--file", "-f", help="Force manifest identifier to be treated as a file path."
    ),
):
    """
    Builds a single system prompt from an ACA manifest and configured libraries.
    """
    try:
        app_config = config.load_config()
        library_paths = config.get_library_paths(app_config)
        manifest_paths = config.get_manifest_paths(app_config)

        if not library_paths:
            raise BuildError("No 'library_paths' configured in ~/.config/aca/config.yaml")

        manifest_path = Path(manifest_identifier)
        if not file and not manifest_path.exists():
            # Treat as name
            manifest_path = _find_manifest_by_name(manifest_identifier, manifest_paths)
            if not manifest_path:
                raise BuildError(f"Manifest name '{manifest_identifier}' not found in any configured manifest_paths.")
        elif not manifest_path.exists():
             raise BuildError(f"Manifest file not found at path: {manifest_identifier}")


        manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
        library = load_library(library_paths)
        interfaces = load_interfaces(library_paths)

        if not library:
            raise BuildError("No valid atoms found in any configured libraries.")

        if "overrides" in manifest:
            apply_overrides(interfaces, manifest["overrides"])

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
                ids = select_atoms(library, item["query"])
                for aid in ids:
                    if aid not in initial_map:
                        initial_map[aid] = set()

        final_atom_map = resolve_dependencies(initial_map, library, interfaces)

        kernel_ids = {k for k, v in library.items() if v["meta"]["type"] == "kernel"}
        if not kernel_ids:
            raise BuildError("No 'type: kernel' atom found in the library.")
        for k_id in kernel_ids:
            if k_id not in final_atom_map:
                final_atom_map[k_id] = set()

        final_prompt = serialize_prompt(final_atom_map, library)
        
        # Post-processing hook
        hook_command = config.get_post_process_hook(app_config)
        if hook_command:
            # Note: shell=True can be a security risk if the command is untrusted.
            # Here we trust the user's own config.
            process = subprocess.run(
                hook_command, 
                shell=True, 
                input=final_prompt, 
                text=True, 
                capture_output=True
            )
            if process.returncode != 0:
                typer.secho(f"Post-process hook failed with exit code {process.returncode}:", fg=typer.colors.RED)
                typer.secho(process.stderr, fg=typer.colors.RED)
                raise typer.Exit(code=1)
            # Print the output of the hook
            print(process.stdout, end='')

        else:
            print(final_prompt)


    except (BuildError, FileNotFoundError, yaml.YAMLError) as e:
        typer.secho(f"Error: {e}", fg=typer.colors.RED, err=True)
        raise typer.Exit(code=1)


def _validate_atom(atom_path: Path, library_path: Path, interfaces: Dict[str, Any]):
    """Helper function to validate a single atom's metadata and dependencies."""
    atom = parse_atom(atom_path, library_path)
    meta = atom["meta"]

    if meta["type"] == "d3":
        if "priority" not in meta:
            raise LintError(f"Validation Error: D3 atom '{atom_path.name}' is missing 'priority'.")
        if meta["priority"] not in [0, 1, 2]:
            raise LintError(f"Validation Error: D3 atom '{atom_path.name}' has invalid priority '{meta['priority']}'.")

    if meta["type"] == "d2":
        for lookup_key in meta.get("uses", []):
            if lookup_key not in interfaces["lookups"]:
                raise LintError(f"Dependency Error: D2 atom '{atom_path.name}' references non-existent Lookup '{lookup_key}'.")
    return atom


def lint():
    """Validates configured ACA libraries against the specification."""
    
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)
    
    if not library_paths:
        typer.secho("No 'library_paths' configured to lint.", fg=typer.colors.RED)
        raise typer.Exit(code=1)

    typer.echo(f"Linting ACA libraries from {len(library_paths)} configured path(s)...")
    error_count = 0
    kernel_count = 0
    all_atoms = {}
    all_interfaces = {}

    try:
        all_interfaces = load_interfaces(library_paths)
        
        for lib_path in library_paths:
            if not lib_path.exists():
                typer.secho(f"  [WARN] Library path not found, skipping: {lib_path}", fg=typer.colors.YELLOW)
                continue
                
            typer.echo(f"--> Linting {lib_path}")
            for atom_path in lib_path.glob("**/*.md"):
                try:
                    atom = _validate_atom(atom_path, lib_path, all_interfaces)
                    
                    if atom["id"] in all_atoms:
                        typer.secho(f"  [FAIL] {atom_path.relative_to(lib_path)}: Duplicate atom ID '{atom['id']}' found.", fg=typer.colors.RED)
                        error_count += 1
                        continue
                    all_atoms[atom["id"]] = atom

                    if atom["meta"]["type"] == "kernel":
                        kernel_count += 1
                except (BuildError, LintError) as e:
                    typer.secho(f"  [FAIL] {atom_path.relative_to(lib_path)}: {e}", fg=typer.colors.RED)
                    error_count += 1

        if kernel_count != 1:
            typer.secho(f"Global Error: Exactly one 'type: kernel' atom is required. Found {kernel_count}.", fg=typer.colors.RED)
            error_count += 1

    except (BuildError, FileNotFoundError, yaml.YAMLError) as e:
        typer.secho(f"A critical error occurred during linting: {e}", fg=typer.colors.RED)
        raise typer.Exit(code=1)

    if error_count == 0:
        typer.secho("✅ All configured ACA libraries are valid.", fg=typer.colors.GREEN)
    else:
        typer.secho(f"\nLinting failed with {error_count} error(s).", fg=typer.colors.RED)
        raise typer.Exit(code=1)