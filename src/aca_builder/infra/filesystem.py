from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from aca_builder.domain.events import BuildError
from aca_builder.domain.ports import LibraryRepository, ManifestRepository


class FSLibraryRepository(LibraryRepository):
    def __init__(self, cache_db: Any | None = None):
        if cache_db is None:
            from aca_builder import config
            from aca_builder.infra.cache_db import SQLiteAtomCache

            db_path = config.get_cache_db_path()
            self.cache = SQLiteAtomCache(db_path)
        else:
            self.cache = cache_db

    def _parse_atom(
        self, file_path: Path, package_name: str | None = None
    ) -> dict[str, Any]:
        try:
            raw_content = file_path.read_text(encoding="utf-8")
            parts = raw_content.split("---", 2)
            if len(parts) < 3 or not parts[0].strip() == "":
                raise ValueError(
                    "Invalid YAML front matter format. Missing '---' separator."
                )

            meta_str = parts[1]
            content_str = parts[2]

            meta = yaml.safe_load(meta_str)
            if not isinstance(meta, dict) or "type" not in meta:
                raise ValueError("Atom missing required metadata 'type'.")

            if meta["type"] == "kernel":
                atom_id = "kernel"
            elif "id" not in meta:
                raise ValueError("Atom missing required metadata 'id'.")
            else:
                atom_id = meta["id"]

            return {
                "id": atom_id,
                "meta": meta,
                "content": content_str.strip(),
                "package": package_name,
                "source_file": str(file_path),
            }
        except (yaml.YAMLError, ValueError, OSError) as e:
            from aca_builder.messages import MESSAGES

            raise BuildError(
                MESSAGES["system.parse_error"].format(path=file_path, error=e)
            )

    def _find_package_config(self, path: Path, root: Path) -> dict[str, Any] | None:
        current = path
        while current >= root:
            pkg_file = current / "package.yaml"
            if pkg_file.is_file():
                try:
                    data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                    return data
                except (yaml.YAMLError, OSError):
                    return None
            if current == root:
                break
            current = current.parent
        return None

    def load_library(
        self,
        library_paths: list[Path],
        fail_fast: bool = True,
        errors: list[str] | None = None,
    ) -> dict[str, dict[str, Any]]:
        return self.cache.sync_and_load(
            library_paths=library_paths,
            parse_fn=self._parse_atom,
            find_pkg_fn=self._find_package_config,
            fail_fast=fail_fast,
            errors=errors,
        )

    def load_interfaces(self, library_paths: list[Path]) -> dict[str, Any]:
        """Loads d4 files and package exports."""
        interfaces = {"lookups": {}}

        for lib_root in library_paths:
            if not lib_root.exists():
                continue

            # 1. D4 Internal Lookups (MUST be loaded first)
            for d4_file in lib_root.glob("**/d4/*.yaml"):
                try:
                    pkg_info = self._find_package_config(d4_file.parent, lib_root)
                    pkg_name = pkg_info["name"] if pkg_info else None

                    data = yaml.safe_load(d4_file.read_text(encoding="utf-8"))
                    if (
                        isinstance(data, dict)
                        and data.get("type") == "d4"
                        and "lookups" in data
                    ):
                        for key, lookup_def in data["lookups"].items():
                            if key in interfaces["lookups"]:
                                # First one wins, could be a warning later
                                continue
                            lookup_def["package"] = pkg_name
                            lookup_def["visibility"] = "private"
                            interfaces["lookups"][key] = lookup_def
                except (yaml.YAMLError, OSError):
                    continue

            # 2. Package Exports (Loaded second to layer on top)
            for pkg_file in lib_root.rglob("package.yaml"):
                try:
                    pkg_data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                    pkg_name = pkg_data.get("name")
                    if not pkg_name:
                        continue

                    exports = pkg_data.get("exports", {})
                    for key, def_ in exports.items():
                        namespaced_key = f"{pkg_name}::{key}"
                        if namespaced_key in interfaces["lookups"]:
                            # With namespacing, any duplicate is a critical error.
                            raise BuildError(
                                f"Duplicate public lookup key '{key}' defined in package '{pkg_name}'."
                            )

                        def_["package"] = pkg_name
                        def_["visibility"] = "public"
                        interfaces["lookups"][namespaced_key] = def_
                except (yaml.YAMLError, OSError, ValueError) as e:
                    raise BuildError(f"Error processing package file {pkg_file}: {e}")

        return interfaces


class FSManifestRepository(ManifestRepository):
    def find_manifest(
        self, manifest_identifier: str, manifest_paths: list[Path]
    ) -> Path | None:
        path_obj = Path(manifest_identifier)
        if (path_obj.exists() or path_obj.is_absolute()) and path_obj.is_file():
            # It might be a file path, but interface expects logic name usually.
            # If caller passes file path as identifier for direct load, we support it potentially.
            return path_obj

        # 1. 直接按相对路径/逻辑标识查找: base_path / f"{manifest_identifier}.yaml"
        for base_path in manifest_paths:
            if not base_path.is_dir():
                continue
            potential_path = base_path / f"{manifest_identifier}.yaml"
            if potential_path.is_file():
                return potential_path
            potential_path_yml = base_path / f"{manifest_identifier}.yml"
            if potential_path_yml.is_file():
                return potential_path_yml

        # 2. 增强回退：如果标识符包含空格或与文件名不一致，遍历清单比对内部 name 属性
        for base_path in manifest_paths:
            if not base_path.is_dir():
                continue
            for yaml_file in base_path.rglob("*.yaml"):
                try:
                    data = yaml.safe_load(yaml_file.read_text(encoding="utf-8"))
                    if isinstance(data, dict) and (
                        data.get("name") == manifest_identifier
                        or yaml_file.stem == manifest_identifier
                    ):
                        return yaml_file
                except (yaml.YAMLError, OSError):
                    continue
        return None

    def load_manifest(self, path: Path) -> dict[str, Any]:
        try:
            return yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError as e:
            from aca_builder.messages import MESSAGES

            raise BuildError(
                MESSAGES["system.yaml_error"].format(name=path.name, error=e)
            )
        except OSError as e:
            from aca_builder.messages import MESSAGES

            raise BuildError(MESSAGES["system.load_error"].format(path=path, error=e))

    def list_manifests(self, manifest_paths: list[Path]) -> list[str]:
        found = set()
        for base_path in manifest_paths:
            if not base_path.is_dir():
                continue
            for yaml_file in base_path.rglob("*.yaml"):
                relative = yaml_file.relative_to(base_path)
                found.add(str(relative.with_suffix("")))
        return sorted(found)
