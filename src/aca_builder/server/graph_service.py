from __future__ import annotations

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

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    visited_nodes: set[str] = set()
    visited_edges: set[tuple[str, str]] = set()

    def add_edge(
        source: str,
        target: str,
        label: str = "",
        is_injected: bool = False,
        is_causal: bool = False,
    ):
        if (source, target) not in visited_edges:
            edge_obj: dict[str, Any] = {
                "id": f"e_{source}->{target}",
                "source": source,
                "target": target,
                "label": label,
                "animated": not is_causal,
            }
            if is_injected:
                edge_obj["style"] = {"stroke": "#a855f7", "strokeWidth": 2}
                edge_obj["label"] = label or "with (注入)"
                edge_obj["data"] = {"injected": True}
            elif is_causal:
                edge_obj["style"] = {"stroke": "#64748b", "strokeDasharray": "4 4", "strokeWidth": 1.5}
                edge_obj["label"] = label or "after (前置)"
                edge_obj["data"] = {"causal": True}
            edges.append(edge_obj)
            visited_edges.add((source, target))

    def process_lookup(
        lkey: str,
        parent_id: str,
        context_pkg: str | None = None,
        target_override: dict[str, Any] | None = None,
        env: dict[str, str] | None = None,
        is_injected: bool = False,
    ):
        lookup_node_id = f"lookup::{lkey}"

        if lookup_node_id in visited_nodes:
            add_edge(parent_id, lookup_node_id, is_injected=is_injected)
            return

        target_def = target_override or resolve_lookup_by_key(
            lkey, context_pkg, interfaces
        )

        is_broken = target_def is None
        is_private_access = False
        pillar = "unknown"
        desc = ""
        has_contract = False

        if target_def:
            pillar = target_def.get("pillar", "unknown")
            desc = target_def.get("description", "")
            has_contract = bool(target_def.get("contract"))
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
                    "hasContract": has_contract,
                },
            }
        )
        visited_nodes.add(lookup_node_id)
        add_edge(parent_id, lookup_node_id, is_injected=is_injected)

        if not target_def:
            return

        try:
            matched_atom_ids = evaluate_lookup(library, target_def, interfaces)
        except (BuildError, KeyError, ValueError):
            matched_atom_ids = set()

        for atom_id in matched_atom_ids:
            process_atom(atom_id, lookup_node_id, env=env)

    def process_atom(
        atom_id: str,
        parent_id: str,
        env: dict[str, str] | None = None,
        is_injected: bool = False,
    ):
        atom_node_id = f"atom::{atom_id}"

        if atom_node_id in visited_nodes:
            add_edge(parent_id, atom_node_id, is_injected=is_injected)
            return

        atom = library.get(atom_id)
        if not atom:
            return

        meta = atom.get("meta", {})
        atom_type = (
            meta.get("type")
            if hasattr(meta, "get")
            else getattr(meta, "type", "unknown")
        )
        priority = (
            meta.get("priority")
            if hasattr(meta, "get")
            else getattr(meta, "priority", None)
        )
        pkg = atom.get("package")
        content = atom.get("content", "")

        description = (
            meta.get("description", "")
            if hasattr(meta, "get")
            else getattr(meta, "description", "")
        )
        if not description and content:
            for line in content.splitlines():
                stripped = line.strip()
                if stripped.startswith("# "):
                    description = stripped[2:].strip()
                    break

        after_refs = (
            meta.get("after", [])
            if hasattr(meta, "get")
            else getattr(meta, "after", [])
        )
        if not isinstance(after_refs, list):
            after_refs = []

        tags = (
            meta.get("tags", [])
            if hasattr(meta, "get")
            else getattr(meta, "tags", [])
        )
        if not isinstance(tags, list):
            tags = [tags]

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
                    "after": after_refs,
                    "tags": tags,
                },
            }
        )
        visited_nodes.add(atom_node_id)
        add_edge(parent_id, atom_node_id, is_injected=is_injected)

        if atom_type == "d2":
            uses = list(
                meta.get("uses", [])
                if hasattr(meta, "get")
                else getattr(meta, "uses", [])
            )
            requires = (
                meta.get("requires", {})
                if hasattr(meta, "get")
                else getattr(meta, "requires", {})
            )
            if isinstance(requires, dict):
                uses.extend(requires.values())

            for use_ref in uses:
                target_ref = use_ref
                injected = False
                short_ref = use_ref.split("::")[-1]
                if env and use_ref in env:
                    target_ref = env[use_ref]
                    injected = True
                elif env and short_ref in env:
                    target_ref = env[short_ref]
                    injected = True

                if target_ref in library:
                    process_atom(
                        target_ref,
                        atom_node_id,
                        env=env,
                        is_injected=injected,
                    )
                else:
                    process_lookup(
                        target_ref,
                        atom_node_id,
                        context_pkg=pkg,
                        env=env,
                        is_injected=injected,
                    )

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
                item_env = (
                    item.get("with", {}) if isinstance(item.get("with"), dict) else {}
                )
                process_lookup(
                    item["lookup"],
                    manifest_node_id,
                    context_pkg=None,
                    env=item_env,
                )

        for atom_id, atom in library.items():
            if atom.get("meta", {}).get("type") == "kernel":
                process_atom(atom_id, manifest_node_id)

    # 建立闭包内原子之间的 after 因果前置偏序边 (pred -> curr)
    for node in list(nodes):
        if node.get("type") == "atomNode":
            curr_id = node.get("data", {}).get("id")
            after_list = node.get("data", {}).get("after", [])
            curr_node_id = f"atom::{curr_id}"
            for pred_id in after_list:
                pred_node_id = f"atom::{pred_id}"
                if pred_node_id in visited_nodes:
                    add_edge(pred_node_id, curr_node_id, label="after", is_causal=True)

    elapsed_ms = (time.perf_counter() - t_start) * 1000
    print(
        f"[ACA Graph] '{manifest_label}' 拓扑生成: {len(nodes)} 节点, "
        f"{len(edges)} 条关系边, 耗时: {elapsed_ms:.2f}ms"
    )

    return {"nodes": nodes, "edges": edges}
