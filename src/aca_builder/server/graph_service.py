from __future__ import annotations

import copy
import time
from typing import Any

from aca_builder.domain.events import BuildError
from aca_builder.domain.services import evaluate_lookup, resolve_lookup_by_key


def build_topology_graph(
    manifest_label: str,
    manifest_data: dict[str, Any] | None,
    library: dict[str, Any],
    interfaces: dict[str, Any],
    root_lookup: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    通用白板拓扑图 DAG 构建引擎：
    - 支持从清单蓝图递归构建
    - 支持从即席 Lookup 根节点递归构建
    """
    t_start = time.perf_counter()

    if (
        manifest_data
        and "overrides" in manifest_data
        and isinstance(manifest_data["overrides"], dict)
    ):
        interfaces = copy.deepcopy(interfaces)
        for lkey, override in manifest_data["overrides"].items():
            if lkey in interfaces.get("lookups", {}):
                interfaces["lookups"][lkey]["selectors"] = override.get("selectors", [])

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    visited_nodes: set[str] = set()
    visited_edges: set[tuple[str, str]] = set()

    def add_edge(source: str, target: str, label: str = ""):
        if (source, target) not in visited_edges:
            edges.append(
                {
                    "id": f"e_{source}->{target}",
                    "source": source,
                    "target": target,
                    "label": label,
                    "animated": True,
                }
            )
            visited_edges.add((source, target))

    def process_lookup(
        lkey: str,
        parent_id: str,
        context_pkg: str | None = None,
        target_override: dict[str, Any] | None = None,
    ):
        lookup_node_id = f"lookup::{lkey}"

        if lookup_node_id in visited_nodes:
            add_edge(parent_id, lookup_node_id)
            return

        target_def = target_override or resolve_lookup_by_key(
            lkey, context_pkg, interfaces
        )

        is_broken = target_def is None
        is_private_access = False
        pillar = "unknown"
        desc = ""

        if target_def:
            pillar = target_def.get("pillar", "unknown")
            desc = target_def.get("description", "")
            target_pkg = target_def.get("package")
            if (
                target_pkg
                and target_pkg != context_pkg
                and target_def.get("visibility") == "private"
            ):
                is_private_access = True

        nodes.append(
            {
                "id": lookup_node_id,
                "type": "lookupNode",
                "data": {
                    "key": lkey,
                    "pillar": pillar,
                    "description": desc,
                    "isBroken": is_broken,
                    "isPrivate": is_private_access,
                },
            }
        )
        visited_nodes.add(lookup_node_id)
        add_edge(parent_id, lookup_node_id)

        if not target_def:
            return

        try:
            matched_atom_ids = evaluate_lookup(library, target_def, interfaces)
        except (BuildError, KeyError, ValueError):
            matched_atom_ids = set()

        for atom_id in matched_atom_ids:
            process_atom(atom_id, lookup_node_id)

    def process_atom(atom_id: str, parent_id: str):
        atom_node_id = f"atom::{atom_id}"

        if atom_node_id in visited_nodes:
            add_edge(parent_id, atom_node_id)
            return

        atom = library.get(atom_id)
        if not atom:
            return

        meta = atom.get("meta", {})
        atom_type = meta.get("type", "unknown")
        priority = meta.get("priority")
        pkg = atom.get("package")
        content = atom.get("content", "")

        # 提取业务描述：优先取元数据，无则回退取 Markdown 首行一级标题
        description = meta.get("description", "")
        if not description and content:
            for line in content.splitlines():
                stripped = line.strip()
                if stripped.startswith("# "):
                    description = stripped[2:].strip()
                    break

        nodes.append(
            {
                "id": atom_node_id,
                "type": "atomNode",
                "data": {
                    "id": atom_id,
                    "type": atom_type,
                    "priority": priority,
                    "package": pkg,
                    "content": content,
                    "description": description,
                    "source_file": atom.get("source_file"),
                },
            }
        )
        visited_nodes.add(atom_node_id)
        add_edge(parent_id, atom_node_id)

        if atom_type == "d2":
            uses = meta.get("uses", [])
            for use_ref in uses:
                process_lookup(use_ref, atom_node_id, context_pkg=pkg)

    if root_lookup:
        root_key = root_lookup["key"]
        root_lookup_id = f"lookup::{root_key}"
        nodes.append(
            {
                "id": root_lookup_id,
                "type": "lookupNode",
                "data": {
                    "key": root_key,
                    "pillar": root_lookup.get("pillar", "d1"),
                    "description": root_lookup.get("description", "即席编辑中接口"),
                    "isBroken": False,
                    "isPrivate": False,
                },
            }
        )
        visited_nodes.add(root_lookup_id)

        try:
            direct_atom_ids = evaluate_lookup(library, root_lookup, interfaces)
        except Exception:
            direct_atom_ids = set()

        for aid in direct_atom_ids:
            process_atom(aid, root_lookup_id)
    else:
        manifest_node_id = f"manifest::{manifest_label}"
        nodes.append(
            {
                "id": manifest_node_id,
                "type": "manifestNode",
                "data": {
                    "label": manifest_label,
                    "version": (manifest_data or {}).get("version", "1.0"),
                    "description": (manifest_data or {}).get("description", ""),
                },
            }
        )
        visited_nodes.add(manifest_node_id)

        imports = (manifest_data or {}).get("imports", [])
        for item in imports:
            if isinstance(item, dict) and "lookup" in item:
                process_lookup(item["lookup"], manifest_node_id, context_pkg=None)

        for atom_id, atom in library.items():
            if atom.get("meta", {}).get("type") == "kernel":
                process_atom(atom_id, manifest_node_id)

    elapsed_ms = (time.perf_counter() - t_start) * 1000
    print(
        f"[ACA Graph] '{manifest_label}' 拓扑生成: {len(nodes)} 节点, "
        f"{len(edges)} 条关系边, 耗时: {elapsed_ms:.2f}ms"
    )

    return {"nodes": nodes, "edges": edges}
