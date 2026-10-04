from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Callable

CACHE_SCHEMA_VERSION = 1


class SQLiteAtomCache:
    """SQLite 增量物化缓存引擎，负责原子组件文件缓存管理与秒级重放。"""

    def __init__(self, db_path: Path | str, schema_version: int = CACHE_SCHEMA_VERSION):
        self.db_path = Path(db_path) if isinstance(db_path, str) else db_path
        self.schema_version = schema_version
        self._ensure_dir()
        self._init_db()

    def _ensure_dir(self) -> None:
        if str(self.db_path) != ":memory:":
            self.db_path.parent.mkdir(parents=True, exist_ok=True)

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            cursor = conn.execute("PRAGMA user_version;")
            current_version = cursor.fetchone()[0]

            if current_version != self.schema_version:
                # 版本不一致或首次创建，执行自动重构
                self._rebuild_schema(conn)

    def _rebuild_schema(self, conn: sqlite3.Connection) -> None:
        conn.executescript(
            """
            DROP TABLE IF EXISTS atom_dependencies;
            DROP TABLE IF EXISTS materialized_atoms;
            DROP TABLE IF EXISTS file_cache;

            CREATE TABLE file_cache (
                file_path TEXT PRIMARY KEY,
                mtime_ns INTEGER NOT NULL,
                size INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'valid'
            );

            CREATE TABLE materialized_atoms (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                priority INTEGER,
                package TEXT,
                source_file TEXT NOT NULL,
                content TEXT NOT NULL,
                meta_json TEXT NOT NULL,
                FOREIGN KEY(source_file) REFERENCES file_cache(file_path) ON DELETE CASCADE
            );

            CREATE TABLE atom_dependencies (
                atom_id TEXT NOT NULL,
                lookup_key TEXT NOT NULL,
                PRIMARY KEY (atom_id, lookup_key),
                FOREIGN KEY(atom_id) REFERENCES materialized_atoms(id) ON DELETE CASCADE
            );

            CREATE INDEX idx_atoms_type ON materialized_atoms(type);
            CREATE INDEX idx_atoms_package ON materialized_atoms(package);
            CREATE INDEX idx_atoms_source ON materialized_atoms(source_file);
            """
        )
        conn.execute(f"PRAGMA user_version = {self.schema_version};")

    def sync_and_load(
        self,
        library_paths: list[Path],
        parse_fn: Callable[[Path, str | None], dict[str, Any]],
        find_pkg_fn: Callable[[Path, Path], dict[str, Any] | None],
        fail_fast: bool = True,
        errors: list[str] | None = None,
    ) -> dict[str, dict[str, Any]]:
        """
        对比磁盘变更并进行增量同步，随后直接从 SQLite 物化表读取所有原子返回。
        """
        with self._get_connection() as conn:
            # 1. 扫描当前所有配置路径下的实际 md 文件
            disk_files: dict[str, tuple[Path, int, int, str | None]] = {}
            pkg_cache: dict[Path, str | None] = {}

            for lib_root in library_paths:
                if not lib_root.exists():
                    continue

                for file_path in lib_root.glob("**/*.md"):
                    abs_path_str = str(file_path.resolve())
                    try:
                        stat = file_path.stat()
                    except OSError:
                        continue

                    parent_dir = file_path.parent
                    if parent_dir in pkg_cache:
                        pkg_name = pkg_cache[parent_dir]
                    else:
                        pkg_info = find_pkg_fn(parent_dir, lib_root)
                        pkg_name = (
                            pkg_info.get("name")
                            if pkg_info and "name" in pkg_info
                            else None
                        )
                        pkg_cache[parent_dir] = pkg_name

                    disk_files[abs_path_str] = (
                        file_path,
                        stat.st_mtime_ns,
                        stat.st_size,
                        pkg_name,
                    )

            # 2. 查询缓存中的已有记录
            cached_rows = conn.execute(
                "SELECT file_path, mtime_ns, size FROM file_cache"
            ).fetchall()
            cached_files = {
                row["file_path"]: (row["mtime_ns"], row["size"]) for row in cached_rows
            }

            # 3. 计算已删除的文件并批量清除
            deleted_files = [f for f in cached_files if f not in disk_files]
            if deleted_files:
                conn.executemany(
                    "DELETE FROM file_cache WHERE file_path = ?",
                    [(f,) for f in deleted_files],
                )

            # 4. 计算新增与发生变动的文件
            to_update = []
            for path_str, (f_path, mtime_ns, size, pkg_name) in disk_files.items():
                if path_str not in cached_files:
                    to_update.append((path_str, f_path, mtime_ns, size, pkg_name))
                else:
                    cached_mtime, cached_size = cached_files[path_str]
                    if cached_mtime != mtime_ns or cached_size != size:
                        to_update.append((path_str, f_path, mtime_ns, size, pkg_name))

            # 5. 增量解析并更新数据库
            for path_str, f_path, mtime_ns, size, pkg_name in to_update:
                try:
                    atom = parse_fn(f_path, pkg_name)

                    # 开启保存点或单文件更新
                    conn.execute(
                        "INSERT OR REPLACE INTO file_cache (file_path, mtime_ns, size, status) VALUES (?, ?, ?, 'valid')",
                        (path_str, mtime_ns, size),
                    )

                    meta = atom["meta"]
                    atom_id = atom["id"]
                    atom_type = meta.get("type", "unknown")
                    priority = meta.get("priority")
                    content = atom.get("content", "")
                    meta_json = json.dumps(meta, ensure_ascii=False)

                    # 如果存在旧原子先替换
                    conn.execute(
                        "DELETE FROM materialized_atoms WHERE source_file = ?",
                        (path_str,),
                    )
                    conn.execute(
                        """
                        INSERT INTO materialized_atoms (id, type, priority, package, source_file, content, meta_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            atom_id,
                            atom_type,
                            priority,
                            pkg_name,
                            path_str,
                            content,
                            meta_json,
                        ),
                    )

                    # 记录依赖关系 (针对 d2 的 uses)
                    if (
                        atom_type == "d2"
                        and "uses" in meta
                        and isinstance(meta["uses"], list)
                    ):
                        conn.executemany(
                            "INSERT OR IGNORE INTO atom_dependencies (atom_id, lookup_key) VALUES (?, ?)",
                            [
                                (atom_id, key)
                                for key in meta["uses"]
                                if isinstance(key, str)
                            ],
                        )

                except Exception as e:
                    # 标记文件状态异常
                    conn.execute(
                        "INSERT OR REPLACE INTO file_cache (file_path, mtime_ns, size, status) VALUES (?, ?, ?, 'corrupt')",
                        (path_str, mtime_ns, size),
                    )
                    if fail_fast:
                        raise
                    if errors is not None:
                        errors.append(str(e))
                    continue

            conn.commit()

            # 6. 从物化表中读取有效原子组装返回
            rows = conn.execute(
                """
                SELECT id, type, priority, package, source_file, content, meta_json
                FROM materialized_atoms
                """
            ).fetchall()

            library: dict[str, dict[str, Any]] = {}
            for row in rows:
                meta = json.loads(row["meta_json"])
                aid = row["id"]
                if aid in library:
                    from aca_builder.domain.events import BuildError
                    from aca_builder.messages import MESSAGES

                    err_msg = MESSAGES["linter.atom.duplicate_id"].format(atom_id=aid)
                    if fail_fast:
                        raise BuildError(err_msg)
                    if errors is not None:
                        errors.append(err_msg)
                    continue

                library[aid] = {
                    "id": aid,
                    "meta": meta,
                    "content": row["content"],
                    "package": row["package"],
                    "source_file": row["source_file"],
                }

            return library
