# src/aca_builder/messages.py
from __future__ import annotations

# 消息注册表：将 msg_id 映射到模板字符串
MESSAGES: dict[str, str] = {
    # Builder
    "builder.start": "Building prompt for '{manifest}'...",
    "builder.manifest.not_found": "Manifest '{identifier}' not found.",
    "builder.manifest.file_not_found": "Manifest file not found: {path}",
    "builder.library.empty": "No valid atoms found in libraries.",
    "builder.override.error": "Manifest Override Error: Lookup '{key}' does not exist.",
    "builder.lookup.not_found": "Manifest Error: Lookup '{key}' not found.",
    "builder.kernel.missing": "No 'type: kernel' atom found.",
    "builder.hook.fail": "Hook failed: {stderr}",
    # Linter
    "linter.start": "Linting {count} path(s)...",
    "linter.atom.parse_error": "Failed to parse atom {path}: {error}",
    "linter.atom.duplicate_id": "Duplicate atom ID '{atom_id}' found.",
    "linter.atom.invalid_priority": "{atom_id}: Invalid priority.",
    "linter.atom.legacy": "{atom_id}: Atom is not part of a package (legacy).",
    "linter.atom.broken_dep": "{atom_id} (pkg={pkg}): Broken dependency '{key}'.",
    "linter.lookup.private_access": "{atom_id}: Accessing private lookup '{key}' from package '{target_pkg}'.",
    "linter.lookup.invalid_pillar": "Lookup '{key}': Invalid pillar '{pillar}'.",
    "linter.lookup.invalid_prefix": "Lookup '{key}': must start with '{prefix}'.",
    "linter.lookup.eval_error": "Lookup '{key}' (pkg={pkg}): {error}",
    "linter.manifest.no_files": "No manifests found in configured 'manifest_paths' to lint.",
    "linter.manifest.lookup_missing": "Manifest '{manifest}' (via '{file}'): Lookup '{key}' in import {index} not found.",
    "linter.manifest.access_denied": "Manifest '{manifest}' (via '{file}'): Access denied. Lookup '{key}' is private to package '{pkg}'.",
    "linter.manifest.access_denied_internal": "Manifest '{manifest}' (via '{file}'): {error}",
    "linter.manifest.load_error": "Manifest '{manifest}' (via '{file}'): {error}",
    "linter.manifest.unexpected_error": "Manifest '{manifest}' (via '{file}'): Unexpected error: {error}",
    "linter.kernel.count_error": "Global Error: Found {count} kernel atoms (expected 1).",
    "linter.success": "All libraries valid.",
    "linter.fail_summary": "\nLinting failed with {count} error(s).",
    # Infra/System
    "system.parse_error": "Failed to parse atom {path}: {error}",
    "system.yaml_error": "Invalid YAML in manifest {name}: {error}",
    "system.load_error": "Error loading manifest {path}: {error}",
    "system.config.no_lib": "No 'library_paths' configured.",
    "system.config.no_manifest": "No 'manifest_paths' configured.",
    "system.list.no_manifests": "No manifests found.",
    "system.stats.header": "ACA Library Stats:",
    "system.stats.pkg_count": "  - Unique Packages Found: {count}",
    "system.stats.pkg_item": "    - {name}",
    "system.stats.legacy_count": "  - Legacy Atoms: {count}",
    "system.stats.legacy_item": "      - {atom_id}",
    # Info Command
    "info.pkg.header": "Public interface for package '{name}':",
    "info.pkg.item": "  - {key}: {desc}",
    "info.pkg.no_desc": "(No description provided)",
    "info.pkg.not_found": "Package '{name}' not found or has no public interface.",
    # Debug Command
    "debug.start": "Debugging lookup '{key}'...",
    "debug.lookup_not_found": "Lookup '{key}' could not be resolved.",
    "debug.result_header": "Resolved {count} atom(s):",
    "debug.result_item": "  - {atom_id} (type: {type}, pkg: {pkg}, src: {src})",
    "debug.no_results": "Lookup resolved to 0 atoms.",
    # System
    "system.unexpected_error": "Unexpected error: {error}",
    "system.critical_lint_error": "Critical Lint Error: {error}",
}
