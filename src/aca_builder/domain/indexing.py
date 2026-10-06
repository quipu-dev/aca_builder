from __future__ import annotations

from collections import defaultdict
from typing import Any


class InvertedIndex:
    """内存倒排索引：将属性项映射到原子 ID 集合，将线性多重扫描转化为标准的集合交集与差集运算。"""

    def __init__(self, library: dict[str, Any]):
        self.library = library
        # 字段存在性索引: field -> set(atom_ids)
        self.field_presence: dict[str, set[str]] = defaultdict(set)
        # 倒排索引: (field, term_value) -> set(atom_ids)
        self.postings: dict[tuple[str, Any], set[str]] = defaultdict(set)
        self.all_ids: set[str] = set(library.keys())
        self._build()

    def _build(self) -> None:
        for aid, atom in self.library.items():
            # 索引主键 aid 与 atom["id"]
            self.field_presence["id"].add(aid)
            self.postings[("id", aid)].add(aid)

            atom_id = (
                atom.get("id") if hasattr(atom, "get") else getattr(atom, "id", None)
            )
            if atom_id and atom_id != aid:
                self.field_presence["id"].add(aid)
                self.postings[("id", atom_id)].add(aid)

            meta = atom.get("meta", {}) if hasattr(atom, "get") else atom["meta"]
            pkg = (
                atom.get("package")
                if hasattr(atom, "get")
                else getattr(atom, "package", None)
            )

            if pkg:
                self.field_presence["package"].add(aid)
                self.postings[("package", pkg)].add(aid)

            # 遍历 meta 字段
            keys = (
                meta.keys()
                if hasattr(meta, "keys")
                else (meta.__dict__.keys() if hasattr(meta, "__dict__") else [])
            )
            for k in keys:
                val = meta.get(k) if hasattr(meta, "get") else getattr(meta, k, None)
                if val is not None:
                    self.field_presence[k].add(aid)
                    if isinstance(val, list):
                        for item in val:
                            self.postings[(k, item)].add(aid)
                    else:
                        self.postings[(k, val)].add(aid)

    def select(self, query: dict[str, Any]) -> set[str]:
        if not query:
            return set(self.all_ids)

        candidates = set(self.all_ids)

        for key, query_val in query.items():
            if isinstance(query_val, list):
                # 必须存在该字段
                candidates &= self.field_presence.get(key, set())

                required = {
                    v for v in query_val if isinstance(v, str) and not v.startswith("-")
                }
                excluded = {
                    v[1:] for v in query_val if isinstance(v, str) and v.startswith("-")
                }

                # 正向条件做交集 (AND)
                for req in required:
                    candidates &= self.postings.get((key, req), set())

                # 负向条件做差集 (NOT)
                for exc in excluded:
                    candidates -= self.postings.get((key, exc), set())
            else:
                # 标量等值匹配
                candidates &= self.postings.get((key, query_val), set())

        return candidates
