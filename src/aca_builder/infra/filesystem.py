from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from aca_builder.domain.events import BuildError
from aca_builder.domain.ports import LibraryRepository, ManifestRepository


class FSLibraryRepository(LibraryRepository):
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
        """直连文件系统加载原子组件，毫秒级就绪且零外部数据库依赖。"""
        library: dict[str, dict[str, Any]] = {}
        pkg_cache: dict[Path, str | None] = {}

        for lib_root in library_paths:
            if not lib_root.exists():
                continue

            for file_path in lib_root.glob("**/*.md"):
                parent_dir = file_path.parent
                if parent_dir in pkg_cache:
                    pkg_name = pkg_cache[parent_dir]
                else:
                    pkg_info = self._find_package_config(parent_dir, lib_root)
                    pkg_name = (
                        pkg_info.get("name")
                        if pkg_info and "name" in pkg_info
                        else None
                    )
                    pkg_cache[parent_dir] = pkg_name

                try:
                    atom = self._parse_atom(file_path, pkg_name)
                    aid = atom["id"]
                    if aid in library:
                        from aca_builder.messages import MESSAGES

                        err_msg = MESSAGES["linter.atom.duplicate_id"].format(
                            atom_id=aid
                        )
                        if fail_fast:
                            raise BuildError(err_msg)
                        if errors is not None:
                            errors.append(err_msg)
                        continue
                    library[aid] = atom
                except Exception as e:
                    if fail_fast:
                        raise
                    if errors is not None:
                        errors.append(str(e))
                    continue

        return library

    def load_interfaces(self, library_paths: list[Path]) -> dict[str, Any]:
        """
        加载并构建正规分层的接口符号表：
        - exports: 全局公开导出表 (pkg::name -> def)
        - internals: 包局部私有符号表 (pkg -> name -> def)
        - legacy: 遗留全局无包查找表 (name -> def)
        """
        interfaces: dict[str, Any] = {
            "exports": {},
            "internals": {},
            "legacy": {},
        }

        for lib_root in library_paths:
            if not lib_root.exists():
                continue

            # 1. 加载 D4 内部私有查找器
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
                            lookup_def["package"] = pkg_name
                            lookup_def["visibility"] = "private"

                            if pkg_name:
                                interfaces["internals"].setdefault(pkg_name, {})[
                                    key
                                ] = lookup_def
                            else:
                                interfaces["legacy"][key] = lookup_def
                except (yaml.YAMLError, OSError):
                    continue

            # 2. 加载 Package.yaml 公开导出门面
            for pkg_file in lib_root.rglob("package.yaml"):
                try:
                    pkg_data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                    pkg_name = pkg_data.get("name")
                    if not pkg_name:
                        continue

                    exports = pkg_data.get("exports", {})
                    for key, def_ in exports.items():
                        namespaced_key = f"{pkg_name}::{key}"
                        if namespaced_key in interfaces["exports"]:
                            raise BuildError(
                                f"Duplicate public lookup key '{key}' defined in package '{pkg_name}'."
                            )

                        def_["package"] = pkg_name
                        def_["visibility"] = "public"
                        interfaces["exports"][namespaced_key] = def_
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
