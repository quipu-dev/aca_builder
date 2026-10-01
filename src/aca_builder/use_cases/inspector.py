from __future__ import annotations

from pathlib import Path

from aca_builder.domain.ports import LibraryRepository, MessageBus


class InspectorService:
    def __init__(self, bus: MessageBus, lib_repo: LibraryRepository):
        self.bus = bus
        self.lib_repo = lib_repo

    def inspect(
        self,
        library_paths: list[Path],
        package: str | None = None,
        list_legacy: bool = False,
    ) -> bool:
        """Inspect packages or display global library stats. Returns True on success, False if package not found."""
        if package:
            interfaces = self.lib_repo.load_interfaces(library_paths)
            found_lookups = []
            for key, l_def in interfaces.get("lookups", {}).items():
                if (
                    l_def.get("package") == package
                    and l_def.get("visibility") == "public"
                ):
                    found_lookups.append((key, l_def))

            if not found_lookups:
                self.bus.warn("info.pkg.not_found", name=package)
                return False

            self.bus.success("info.pkg.header", name=package)
            for key, l_def in sorted(found_lookups):
                description = l_def.get(
                    "description", self.bus._format("info.pkg.no_desc")
                )
                self.bus.info("info.pkg.item", key=key, desc=description)
            return True

        library = self.lib_repo.load_library(library_paths, fail_fast=False)
        packages = set()
        legacy_atoms = []

        for atom in library.values():
            if pkg_name := atom.get("package"):
                packages.add(pkg_name)
            else:
                if atom["meta"]["type"] != "kernel":
                    legacy_atoms.append(atom["id"])

        self.bus.info("system.stats.header")
        self.bus.info("system.stats.pkg_count", count=len(packages))
        if packages:
            for p in sorted(packages):
                self.bus.info("system.stats.pkg_item", name=p)

        self.bus.warn("system.stats.legacy_count", count=len(legacy_atoms))
        if list_legacy and legacy_atoms:
            for aid in sorted(legacy_atoms):
                self.bus.info("system.stats.legacy_item", atom_id=aid)
        return True
