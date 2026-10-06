from __future__ import annotations

from pathlib import Path
from typing import Any

from aca_builder.domain.events import BuildError
from aca_builder.domain.ports import LibraryRepository, ManifestRepository, MessageBus
from aca_builder.domain.services import evaluate_lookup, resolve_lookup_by_key


class LinterService:
    def __init__(
        self,
        bus: MessageBus,
        library_repo: LibraryRepository,
        manifest_repo: ManifestRepository,
    ):
        self.bus = bus
        self.lib_repo = library_repo
        self.man_repo = manifest_repo

    def lint(self, library_paths: list[Path], manifest_paths: list[Path]):
        self.bus.info("linter.start", count=len(library_paths))  # Using msg_id
        error_count = 0

        found_packages = {}
        for lib_path in library_paths:
            if not lib_path.exists():
                continue
            for pkg_file in lib_path.rglob("package.yaml"):
                try:
                    import yaml

                    data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                    name = data.get("name")
                    if name:
                        if name in found_packages:
                            self.bus.lint_error(
                                "linter.manifest.unexpected_error",
                                manifest="N/A",
                                file=str(pkg_file),
                                error=f"Duplicate package name '{name}' conflicts with {found_packages[name]}",
                            )
                            error_count += 1
                        else:
                            found_packages[name] = pkg_file
                except (yaml.YAMLError, OSError):
                    pass

        # 0. Load Libraries
        load_errors = []
        library = self.lib_repo.load_library(
            library_paths, fail_fast=False, errors=load_errors
        )
        if load_errors:
            for idx, err in enumerate(load_errors):
                # The errors from load_library now are BuildError which contain specific formatted message and path.
                # We need to refine this to capture the original path if possible,
                # but for now, we'll re-format through a generic error ID.
                self.bus.lint_error(
                    "linter.atom.parse_error", path=f"file{idx}", error=err
                )  # Using msg_id
                error_count += 1

        interfaces = self.lib_repo.load_interfaces(library_paths)
        kernel_count = 0

        # 1. Validate Atoms
        for atom_id, atom in library.items():
            meta = atom["meta"]
            pkg = atom.get("package")

            if meta["type"] == "kernel":
                kernel_count += 1

            if meta["type"] == "d3" and (
                "priority" not in meta or meta["priority"] not in [0, 1, 2]
            ):
                self.bus.lint_error(
                    "linter.atom.invalid_priority", atom_id=atom_id
                )  # Using msg_id
                error_count += 1

            # Legacy atom check is a warning
            if not pkg and meta["type"] != "kernel":
                self.bus.warn("linter.atom.legacy", atom_id=atom_id)  # Using msg_id

            if meta["type"] == "d2":
                for lookup_key in meta.get("uses", []):
                    target = resolve_lookup_by_key(lookup_key, pkg, interfaces)
                    if not target:
                        self.bus.lint_error(
                            "linter.atom.broken_dep",
                            atom_id=atom_id,
                            pkg=pkg,
                            key=lookup_key,
                        )  # Using msg_id
                        error_count += 1
                    else:
                        if (
                            pkg != target.get("package")
                            and target.get("visibility") != "public"
                        ) and target.get("package") is not None:
                            self.bus.warn(
                                "linter.lookup.private_access",
                                atom_id=atom_id,
                                key=lookup_key,
                                target_pkg=target.get("package"),
                            )  # Using msg_id

        # 2. Validate Lookups (规范收集公开、内部私有与遗留全局定义)
        all_lookups: list[tuple[str, dict[str, Any]]] = []
        for k, v in interfaces.get("exports", {}).items():
            all_lookups.append((k, v))
        for pkg_name, pkg_lookups in interfaces.get("internals", {}).items():
            for k, v in pkg_lookups.items():
                all_lookups.append((f"{pkg_name}::{k}", v))
        for k, v in interfaces.get("legacy", {}).items():
            all_lookups.append((k, v))

        for key, l_def in all_lookups:
            pkg = l_def.get("package")
            pillar = l_def.get("pillar")

            if pillar not in ["d1", "d2", "d3"]:
                self.bus.lint_error(
                    "linter.lookup.invalid_pillar", key=key, pillar=pillar
                )
                error_count += 1

            lookup_name = key.split("::")[-1]
            expected_prefix = f"{pillar}l-"
            if not lookup_name.startswith(expected_prefix):
                self.bus.lint_error(
                    "linter.lookup.invalid_prefix", key=key, prefix=expected_prefix
                )
                error_count += 1

            selectors = l_def.get("selectors", [])
            if not selectors:
                self.bus.lint_error(
                    "linter.lookup.empty_selectors", key=key
                )  # Using msg_id
                error_count += 1
                continue

            # 校验显式指定的原子 ID 是否存在于当前知识库
            for sel in selectors:
                if isinstance(sel, dict) and "query" in sel:
                    target_id = sel["query"].get("id")
                    if target_id and target_id not in library:
                        self.bus.lint_error(
                            "linter.lookup.atom_not_found",
                            key=key,
                            atom_id=target_id,
                        )  # Using msg_id
                        error_count += 1

            try:
                matched_ids = evaluate_lookup(library, l_def, interfaces)
                if not matched_ids:
                    self.bus.warn(
                        "linter.lookup.no_atoms_matched", key=key
                    )  # Using msg_id
            except BuildError as e:
                self.bus.lint_error(
                    "linter.lookup.eval_error", key=key, pkg=pkg, error=str(e)
                )  # Using msg_id
                error_count += 1

        # 3. Validate Manifests
        manifest_files = []
        for base in manifest_paths:
            if base.is_dir():
                manifest_files.extend(base.rglob("*.yaml"))

        if not manifest_files:
            self.bus.info("linter.manifest.no_files")  # Using msg_id

        for m_path in manifest_files:
            try:
                manifest_name = m_path.stem

                manifest = self.man_repo.load_manifest(m_path)
                if not isinstance(manifest, dict):
                    continue

                imports = manifest.get("imports") or []
                context_pkg = None

                for idx, item in enumerate(imports):
                    if not isinstance(item, dict) or "lookup" not in item:
                        continue
                    lkey = item["lookup"]

                    try:
                        target = resolve_lookup_by_key(lkey, context_pkg, interfaces)
                        if not target:
                            self.bus.lint_error(
                                "linter.manifest.lookup_missing",
                                manifest=manifest_name,
                                file=m_path.name,
                                key=lkey,
                                index=idx,
                            )  # Using msg_id
                            error_count += 1
                            continue

                        if (
                            target.get("package") is not None
                            and target.get("visibility") == "private"
                        ):
                            self.bus.lint_error(
                                "linter.manifest.access_denied",
                                manifest=manifest_name,
                                file=m_path.name,
                                key=lkey,
                                pkg=target.get("package"),
                            )  # Using msg_id
                            error_count += 1

                    except BuildError as e:
                        # Original code had hybrid message logic inside lint_error call.
                        # Now, BuildError directly formats the message.
                        # We pass it as 'error' kwarg to a generic message ID.
                        self.bus.lint_error(
                            "linter.manifest.access_denied_internal",
                            manifest=manifest_name,
                            file=m_path.name,
                            error=str(e),
                        )  # Using msg_id
                        error_count += 1

            except BuildError as e:
                self.bus.lint_error(
                    "linter.manifest.load_error",
                    manifest=m_path.stem,
                    file=m_path.name,
                    error=str(e),
                )  # Using msg_id
                error_count += 1
            except Exception as e:
                self.bus.lint_error(
                    "linter.manifest.unexpected_error",
                    manifest=m_path.stem,
                    file=m_path.name,
                    error=str(e),
                )  # Using msg_id
                error_count += 1

        if kernel_count != 1:
            self.bus.lint_error(
                "linter.kernel.count_error", count=kernel_count
            )  # Using msg_id
            error_count += 1

        if error_count == 0:
            self.bus.success("linter.success")  # Using msg_id
        else:
            raise BuildError("LINT_FAILED_SILENTLY")
