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
    select_atoms_by_query,
    evaluate_lookup,
    resolve_dependencies,
    serialize_prompt,
    parse_atom,
    _resolve_lookup_by_key
)

def _find_manifest_by_name(manifest_name: str, manifest_paths: List[Path]) -> Optional[Path]:
    for base_path in manifest_paths:
        if not base_path.is_dir(): continue
        potential_path = base_path / f"{manifest_name}.yaml"
        if potential_path.is_file(): return potential_path
    return None

def list_manifests(ctx: typer.Context):
    app_config = config.load_config()
    manifest_paths = config.get_manifest_paths(app_config)
    if not manifest_paths:
        typer.secho("No 'manifest_paths' configured.", fg=typer.colors.YELLOW, err=True)
        return

    found_manifests = set()
    for base_path in manifest_paths:
        if not base_path.is_dir(): continue
        for yaml_file in base_path.rglob("*.yaml"):
            relative_path = yaml_file.relative_to(base_path)
            manifest_name = str(relative_path.with_suffix(''))
            found_manifests.add(manifest_name)
    
    if not found_manifests:
        typer.secho("No manifests found.", fg=typer.colors.YELLOW, err=True)
        return
        
    for name in sorted(list(found_manifests)):
        typer.echo(name)


def build(
    manifest_identifier: str = typer.Argument(..., help="Manifest path or name"),
    file: bool = typer.Option(False, "--file", "-f", help="Treat identifier as file path"),
):
    try:
        app_config = config.load_config()
        library_paths = config.get_library_paths(app_config)
        manifest_paths = config.get_manifest_paths(app_config)

        if not library_paths:
            raise BuildError("No 'library_paths' configured.")

        manifest_path = Path(manifest_identifier)
        if not file and not manifest_path.exists():
            manifest_path = _find_manifest_by_name(manifest_identifier, manifest_paths)
            if not manifest_path:
                raise BuildError(f"Manifest '{manifest_identifier}' not found.")
        elif not manifest_path.exists():
             raise BuildError(f"Manifest file not found: {manifest_identifier}")

        manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
        library = load_library(library_paths)
        interfaces = load_interfaces(library_paths)

        if not library:
            raise BuildError("No valid atoms found in libraries.")

        if "overrides" in manifest:
            apply_overrides(interfaces, manifest["overrides"])

        initial_map = {}
        imports = manifest.get("imports", [])
        
        # Determine context package for the manifest? 
        # Manifests usually reside outside the library, acting as "userland".
        # So context_pkg is None (global context).
        manifest_pkg = None 

        for item in imports:
            if "lookup" in item:
                # Handle Lookup Import (supports refs now implicitly via evaluate_lookup)
                lkey = item["lookup"]
                
                # Resolve key (handle pkg::name)
                l_def = _resolve_lookup_by_key(lkey, manifest_pkg, interfaces)
                if not l_def:
                     raise BuildError(f"Manifest Error: Lookup '{lkey}' not found.")

                # Evaluate recursively
                ids = evaluate_lookup(library, l_def, interfaces)
                for aid in ids:
                    initial_map.setdefault(aid, set()).add(lkey)
            
            elif "query" in item:
                # Direct Query
                ids = select_atoms_by_query(library, item["query"])
                for aid in ids:
                    if aid not in initial_map:
                        initial_map[aid] = set()

        final_atom_map = resolve_dependencies(initial_map, library, interfaces)

        kernel_ids = {k for k, v in library.items() if v["meta"]["type"] == "kernel"}
        if not kernel_ids:
            raise BuildError("No 'type: kernel' atom found.")
        for k_id in kernel_ids:
            if k_id not in final_atom_map:
                final_atom_map[k_id] = set()

        final_prompt = serialize_prompt(final_atom_map, library)
        
        hook_command = config.get_post_process_hook(app_config)
        if hook_command:
            process = subprocess.run(
                hook_command, shell=True, input=final_prompt, text=True, capture_output=True
            )
            if process.returncode != 0:
                typer.secho(f"Hook failed: {process.stderr}", fg=typer.colors.RED)
                raise typer.Exit(code=1)
            print(process.stdout, end='')
        else:
            print(final_prompt)

    except (BuildError, FileNotFoundError, yaml.YAMLError) as e:
        typer.secho(f"Error: {e}", fg=typer.colors.RED, err=True)
        raise typer.Exit(code=1)


def lint():
    """
    Validates libraries, checking for package structure and broken references.
    """
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)
    
    if not library_paths:
        typer.secho("No 'library_paths' configured.", fg=typer.colors.RED)
        raise typer.Exit(code=1)

    typer.echo(f"Linting {len(library_paths)} path(s)...")
    error_count = 0
    kernel_count = 0
    
    try:
        # Load everything first to catch load errors
        load_errors = []
        library = load_library(library_paths, errors=load_errors, fail_fast=False)

        if load_errors:
            for err in load_errors:
                typer.secho(f"  [FAIL] {err}", fg=typer.colors.RED)
                error_count += 1

        interfaces = load_interfaces(library_paths)

        # 1. Check Atoms
        for atom_id, atom in library.items():
            meta = atom["meta"]
            pkg = atom.get("package")
            
            # Validate Basic Schema
            if "id" not in atom or not atom["id"]:
                 typer.secho(f"  [FAIL] Atom missing 'id'.", fg=typer.colors.RED); error_count += 1

            if meta["type"] == "kernel":
                kernel_count += 1
            
            # Validate D3 Priority
            if meta["type"] == "d3":
                if "priority" not in meta:
                    typer.secho(f"  [FAIL] {atom_id}: Missing priority.", fg=typer.colors.RED); error_count += 1
                elif meta["priority"] not in [0, 1, 2]:
                    typer.secho(f"  [FAIL] {atom_id}: Invalid priority.", fg=typer.colors.RED); error_count += 1

            # Validate D2 Dependencies
            if meta["type"] == "d2":
                for lookup_key in meta.get("uses", []):
                    # Try to resolve
                    target = _resolve_lookup_by_key(lookup_key, pkg, interfaces)
                    if not target:
                         typer.secho(f"  [FAIL] {atom_id} (pkg={pkg}): Broken dependency '{lookup_key}'.", fg=typer.colors.RED)
                         error_count += 1
                    else:
                        # Check visibility strictly during lint
                        if pkg != target.get("package") and target.get("visibility") != "public":
                             # We allow global (no package) lookups to be accessed
                             if target.get("package") is not None:
                                 typer.secho(f"  [WARN] {atom_id}: Accessing private lookup '{lookup_key}' from package '{target.get('package')}'.", fg=typer.colors.YELLOW)

        # 2. Check Lookups (Refs)
        for key, l_def in interfaces["lookups"].items():
            pkg = l_def.get("package")
            
            # Validate Naming Convention (Legacy D4 Spec)
            pillar = l_def.get("pillar")
            if pillar not in ["d1", "d2", "d3"]:
                typer.secho(f"  [FAIL] Lookup '{key}': Invalid pillar '{pillar}'.", fg=typer.colors.RED)
                error_count += 1
            else:
                expected_prefix = f"{pillar}l-"
                # If namespace syntax is used in key (unlikely in this dict structure), we check simple prefix
                if not key.startswith(expected_prefix):
                    typer.secho(f"  [FAIL] Lookup '{key}': must start with '{expected_prefix}'.", fg=typer.colors.RED)
                    error_count += 1

            try:
                # Dry run evaluation to check for broken refs and cycles
                evaluate_lookup(library, l_def, interfaces)
            except BuildError as e:
                typer.secho(f"  [FAIL] Lookup '{key}' (pkg={pkg}): {e}", fg=typer.colors.RED)
                error_count += 1

        if kernel_count != 1:
            typer.secho(f"Global Error: Found {kernel_count} kernel atoms (expected 1).", fg=typer.colors.RED)
            error_count += 1

    except Exception as e:
        typer.secho(f"Critical Lint Error: {e}", fg=typer.colors.RED)
        raise typer.Exit(code=1)

    if error_count == 0:
        typer.secho("✅ All libraries valid.", fg=typer.colors.GREEN)
    else:
        typer.secho(f"\nLinting failed with {error_count} error(s).", fg=typer.colors.RED)
        raise typer.Exit(code=1)