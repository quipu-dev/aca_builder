from __future__ import annotations

from pathlib import Path
from typing import Any

from aca_builder.domain.compiler import compile_prompt
from aca_builder.domain.events import BuildError
from aca_builder.domain.ports import LibraryRepository, ManifestRepository
from aca_builder.messages import MESSAGES


class BuilderService:
    def __init__(self, lib_repo: LibraryRepository, man_repo: ManifestRepository):
        self.lib_repo = lib_repo
        self.man_repo = man_repo

    def _load_manifest_and_resources(
        self,
        manifest_identifier: str,
        library_paths: list[Path],
        manifest_paths: list[Path],
        is_file_path: bool = False,
    ) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
        manifest_path = None
        if is_file_path:
            manifest_path = Path(manifest_identifier)
            if not manifest_path.exists():
                raise BuildError(
                    MESSAGES["builder.manifest.file_not_found"].format(
                        path=manifest_identifier
                    )
                )
        else:
            manifest_path = self.man_repo.find_manifest(
                manifest_identifier, manifest_paths
            )
            if not manifest_path:
                raise BuildError(
                    MESSAGES["builder.manifest.not_found"].format(
                        identifier=manifest_identifier
                    )
                )

        manifest = self.man_repo.load_manifest(manifest_path)
        library = self.lib_repo.load_library(library_paths)
        interfaces = self.lib_repo.load_interfaces(library_paths)
        return manifest, library, interfaces

    def build_prompt(
        self,
        manifest_identifier: str,
        library_paths: list[Path],
        manifest_paths: list[Path],
        is_file_path: bool = False,
    ) -> str:
        manifest, library, interfaces = self._load_manifest_and_resources(
            manifest_identifier, library_paths, manifest_paths, is_file_path
        )
        res = compile_prompt(
            library=library,
            interfaces=interfaces,
            imports=manifest.get("imports", []),
            include_kernel=True,
        )
        return res.prompt

    def build_with_profile(
        self,
        manifest_identifier: str,
        library_paths: list[Path],
        manifest_paths: list[Path],
        is_file_path: bool = False,
    ) -> tuple[str, dict[str, Any]]:
        manifest, library, interfaces = self._load_manifest_and_resources(
            manifest_identifier, library_paths, manifest_paths, is_file_path
        )
        res = compile_prompt(
            library=library,
            interfaces=interfaces,
            imports=manifest.get("imports", []),
            include_kernel=True,
        )
        return res.prompt, res.profile.model_dump()
