from __future__ import annotations

from pathlib import Path

from aca_builder.domain.ports import LibraryRepository, MessageBus
from aca_builder.domain.services import evaluate_lookup, resolve_lookup_by_key


class DebuggerService:
    def __init__(self, bus: MessageBus, lib_repo: LibraryRepository):
        self.bus = bus
        self.lib_repo = lib_repo

    def debug_lookup(self, lookup_key: str, library_paths: list[Path]) -> bool:
        """Debug a lookup key to see which atoms it resolves to. Returns True on success, False if not found."""
        library = self.lib_repo.load_library(library_paths, fail_fast=True)
        interfaces = self.lib_repo.load_interfaces(library_paths)

        self.bus.info("debug.start", key=lookup_key)
        lookup_def = resolve_lookup_by_key(lookup_key, None, interfaces)
        if not lookup_def:
            self.bus.error("debug.lookup_not_found", key=lookup_key)
            return False

        atom_ids = evaluate_lookup(library, lookup_def, interfaces)
        if not atom_ids:
            self.bus.warn("debug.no_results")
            return True

        self.bus.success("debug.result_header", count=len(atom_ids))
        for atom_id in sorted(atom_ids):
            atom = library.get(atom_id)
            if atom:
                self.bus.info(
                    "debug.result_item",
                    atom_id=atom["id"],
                    type=atom["meta"]["type"],
                    pkg=atom.get("package") or "global",
                    src=atom["source_file"],
                )
        return True
