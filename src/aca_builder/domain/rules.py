from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from aca_builder.domain.events import BuildError
from aca_builder.domain.models import Diagnostic
from aca_builder.domain.services import evaluate_lookup, resolve_lookup_by_key
from aca_builder.messages import MESSAGES


def format_diagnostic_msg(code: str, **kwargs: Any) -> str:
    template = MESSAGES.get(code, f"[{code}]")
    try:
        return template.format(**kwargs)
    except (KeyError, ValueError, IndexError):
        return template


def extract_diagnostic_target(
    code: str, kwargs: dict[str, Any]
) -> dict[str, str] | None:
    if "target" in kwargs and isinstance(kwargs["target"], dict):
        return kwargs["target"]
    if kwargs.get("atom_id"):
        return {"type": "atom", "id": str(kwargs["atom_id"])}
    if kwargs.get("key"):
        return {"type": "lookup", "id": str(kwargs["key"])}
    if kwargs.get("manifest"):
        return {"type": "manifest", "id": str(kwargs["manifest"])}
    return None


def make_diagnostic(level: str, code: str, **kwargs: Any) -> Diagnostic:
    msg = format_diagnostic_msg(code, **kwargs)
    tgt = extract_diagnostic_target(code, kwargs)
    return Diagnostic(
        level=level,
        code=code,
        message=msg,
        context=kwargs,
        target=tgt,
    )


def diagnose_knowledge_base(
    library_repo: Any,
    manifest_repo: Any,
    library_paths: list[Path],
    manifest_paths: list[Path],
) -> list[Diagnostic]:
    """纯函数静态检查管线：接收领域仓库与路径，返回全部 Diagnostic 对象，零总线副作用与零假异常。"""
    diagnostics: list[Diagnostic] = []

    # 1. 包唯一性检查
    found_packages: dict[str, Path] = {}
    for lib_path in library_paths:
        if not lib_path.exists():
            continue
        for pkg_file in lib_path.rglob("package.yaml"):
            try:
                data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                name = data.get("name") if isinstance(data, dict) else None
                if name:
                    if name in found_packages:
                        diagnostics.append(
                            make_diagnostic(
                                "ERROR",
                                "linter.manifest.unexpected_error",
                                manifest="N/A",
                                file=str(pkg_file),
                                error=f"Duplicate package name '{name}' conflicts with {found_packages[name]}",
                            )
                        )
                    else:
                        found_packages[name] = pkg_file
            except (yaml.YAMLError, OSError):
                pass

    # 2. 加载原子并收集文件解析错误
    load_errors: list[str] = []
    library = library_repo.load_library(
        library_paths, fail_fast=False, errors=load_errors
    )
    for idx, err in enumerate(load_errors):
        diagnostics.append(
            make_diagnostic(
                "ERROR",
                "linter.atom.parse_error",
                path=f"file{idx}",
                error=err,
            )
        )

    interfaces = library_repo.load_interfaces(library_paths)
    kernel_count = 0

    # 3. 校验原子合规性
    for atom_id, atom in library.items():
        meta = atom["meta"]
        pkg = atom.get("package")
        atom_type = (
            meta.get("type") if hasattr(meta, "get") else getattr(meta, "type", None)
        )

        if atom_type == "kernel":
            kernel_count += 1

        priority = (
            meta.get("priority")
            if hasattr(meta, "get")
            else getattr(meta, "priority", None)
        )
        if atom_type == "d3" and (priority is None or priority not in [0, 1, 2]):
            diagnostics.append(
                make_diagnostic(
                    "ERROR", "linter.atom.invalid_priority", atom_id=atom_id
                )
            )

        if not pkg and atom_type != "kernel":
            diagnostics.append(
                make_diagnostic("WARN", "linter.atom.legacy", atom_id=atom_id)
            )

        if atom_type == "d2":
            uses = (
                meta.get("uses", [])
                if hasattr(meta, "get")
                else getattr(meta, "uses", [])
            )
            for lookup_key in uses:
                target = resolve_lookup_by_key(lookup_key, pkg, interfaces)
                if not target:
                    diagnostics.append(
                        make_diagnostic(
                            "ERROR",
                            "linter.atom.broken_dep",
                            atom_id=atom_id,
                            pkg=pkg,
                            key=lookup_key,
                        )
                    )
                else:
                    target_pkg = target.get("package")
                    target_vis = target.get("visibility")
                    if (
                        pkg != target_pkg
                        and target_vis != "public"
                        and target_pkg is not None
                    ):
                        diagnostics.append(
                            make_diagnostic(
                                "WARN",
                                "linter.lookup.private_access",
                                atom_id=atom_id,
                                key=lookup_key,
                                target_pkg=target_pkg,
                            )
                        )

    # 4. 校验 Lookup 接口规范
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
            diagnostics.append(
                make_diagnostic(
                    "ERROR", "linter.lookup.invalid_pillar", key=key, pillar=pillar
                )
            )

        lookup_name = key.split("::")[-1]
        expected_prefix = f"{pillar}l-"
        if not lookup_name.startswith(expected_prefix):
            diagnostics.append(
                make_diagnostic(
                    "ERROR",
                    "linter.lookup.invalid_prefix",
                    key=key,
                    prefix=expected_prefix,
                )
            )

        selectors = l_def.get("selectors", [])
        if not selectors:
            diagnostics.append(
                make_diagnostic("ERROR", "linter.lookup.empty_selectors", key=key)
            )
            continue

        for sel in selectors:
            if isinstance(sel, dict) and "query" in sel:
                target_id = sel["query"].get("id")
                if target_id and target_id not in library:
                    diagnostics.append(
                        make_diagnostic(
                            "ERROR",
                            "linter.lookup.atom_not_found",
                            key=key,
                            atom_id=target_id,
                        )
                    )

        try:
            matched_ids = evaluate_lookup(library, l_def, interfaces)
            if not matched_ids:
                diagnostics.append(
                    make_diagnostic("WARN", "linter.lookup.no_atoms_matched", key=key)
                )
            else:
                # 校验结构化契约 (Structural Contract Conformance)
                contract = l_def.get("contract")
                if isinstance(contract, dict):
                    req_domains = contract.get("required_domains", [])
                    req_meta = contract.get("required_metadata", [])
                    for aid in matched_ids:
                        target_atom = library.get(aid)
                        if not target_atom:
                            continue
                        a_meta = target_atom.get("meta", {})
                        a_domains = (
                            a_meta.get("domain", [])
                            if hasattr(a_meta, "get")
                            else getattr(a_meta, "domain", [])
                        )

                        missing_domains = [d for d in req_domains if d not in a_domains]
                        if missing_domains:
                            diagnostics.append(
                                make_diagnostic(
                                    "ERROR",
                                    "linter.lookup.contract_violation",
                                    key=key,
                                    atom_id=aid,
                                    reason=f"Missing required domain(s): {missing_domains}",
                                )
                            )

                        missing_meta = [
                            m
                            for m in req_meta
                            if (
                                m not in a_meta
                                if hasattr(a_meta, "__contains__")
                                else not hasattr(a_meta, m)
                            )
                        ]
                        if missing_meta:
                            diagnostics.append(
                                make_diagnostic(
                                    "ERROR",
                                    "linter.lookup.contract_violation",
                                    key=key,
                                    atom_id=aid,
                                    reason=f"Missing required metadata key(s): {missing_meta}",
                                )
                            )
        except BuildError as e:
            diagnostics.append(
                make_diagnostic(
                    "ERROR",
                    "linter.lookup.eval_error",
                    key=key,
                    pkg=pkg,
                    error=str(e),
                )
            )

    # 5. 校验 Manifest 清单
    manifest_files: list[Path] = []
    for base in manifest_paths:
        if base.is_dir():
            manifest_files.extend(base.rglob("*.yaml"))

    if not manifest_files:
        diagnostics.append(make_diagnostic("INFO", "linter.manifest.no_files"))

    for m_path in manifest_files:
        try:
            manifest_name = m_path.stem
            manifest = manifest_repo.load_manifest(m_path)
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
                        diagnostics.append(
                            make_diagnostic(
                                "ERROR",
                                "linter.manifest.lookup_missing",
                                manifest=manifest_name,
                                file=m_path.name,
                                key=lkey,
                                index=idx,
                            )
                        )
                        continue

                    if (
                        target.get("package") is not None
                        and target.get("visibility") == "private"
                    ):
                        diagnostics.append(
                            make_diagnostic(
                                "ERROR",
                                "linter.manifest.access_denied",
                                manifest=manifest_name,
                                file=m_path.name,
                                key=lkey,
                                pkg=target.get("package"),
                            )
                        )
                except BuildError as e:
                    diagnostics.append(
                        make_diagnostic(
                            "ERROR",
                            "linter.manifest.access_denied_internal",
                            manifest=manifest_name,
                            file=m_path.name,
                            error=str(e),
                        )
                    )
        except BuildError as e:
            diagnostics.append(
                make_diagnostic(
                    "ERROR",
                    "linter.manifest.load_error",
                    manifest=m_path.stem,
                    file=m_path.name,
                    error=str(e),
                )
            )
        except Exception as e:
            diagnostics.append(
                make_diagnostic(
                    "ERROR",
                    "linter.manifest.unexpected_error",
                    manifest=m_path.stem,
                    file=m_path.name,
                    error=str(e),
                )
            )

    # 6. 单例 Kernel 核心原子检查
    if kernel_count != 1:
        diagnostics.append(
            make_diagnostic("ERROR", "linter.kernel.count_error", count=kernel_count)
        )

    return diagnostics
