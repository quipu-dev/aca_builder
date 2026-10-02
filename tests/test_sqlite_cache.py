import time
from pathlib import Path

from aca_builder.infra.cache_db import SQLiteAtomCache
from aca_builder.infra.filesystem import FSLibraryRepository

ATOM_1 = """---
id: d1-test-alpha
type: d1
---
Alpha Content
"""

ATOM_2 = """---
id: d2-test-beta
type: d2
uses:
  - d1l-test-alpha
---
Beta Content
"""


def test_sqlite_cache_initial_and_incremental(tmp_path: Path):
    """测试首次加载建立缓存，以及增量修改文件后自动感知识别并刷新。"""
    db_file = tmp_path / "cache.db"
    cache = SQLiteAtomCache(db_file)
    repo = FSLibraryRepository(cache_db=cache)

    lib_dir = tmp_path / "lib"
    lib_dir.mkdir()
    f1 = lib_dir / "atom1.md"
    f1.write_text(ATOM_1, encoding="utf-8")

    # 1. 首次加载
    lib = repo.load_library([lib_dir])
    assert "d1-test-alpha" in lib
    assert lib["d1-test-alpha"]["content"] == "Alpha Content"

    # 2. 增加第二个文件
    f2 = lib_dir / "atom2.md"
    f2.write_text(ATOM_2, encoding="utf-8")
    lib2 = repo.load_library([lib_dir])
    assert len(lib2) == 2
    assert "d2-test-beta" in lib2

    # 3. 修改第一个文件
    # 休眠微量时间以确保文件系统 mtime 发生变化
    time.sleep(0.01)
    f1.write_text(
        """---
id: d1-test-alpha
type: d1
---
Alpha Updated Content
""",
        encoding="utf-8",
    )

    lib3 = repo.load_library([lib_dir])
    assert lib3["d1-test-alpha"]["content"] == "Alpha Updated Content"

    # 4. 删除文件后缓存自动剔除
    f2.unlink()
    lib4 = repo.load_library([lib_dir])
    assert len(lib4) == 1
    assert "d2-test-beta" not in lib4


def test_sqlite_cache_auto_rebuild_on_version_mismatch(tmp_path: Path):
    """测试当 Schema 版本升级时，数据库自动重置并重建。"""
    db_file = tmp_path / "cache_version.db"

    # 模拟以旧版本 1 初始化数据库
    cache_v1 = SQLiteAtomCache(db_file, schema_version=1)
    repo_v1 = FSLibraryRepository(cache_db=cache_v1)

    lib_dir = tmp_path / "lib"
    lib_dir.mkdir()
    (lib_dir / "atom.md").write_text(ATOM_1, encoding="utf-8")
    lib_v1 = repo_v1.load_library([lib_dir])
    assert "d1-test-alpha" in lib_v1

    # 模拟系统升级，Schema 版本递增为 2
    cache_v2 = SQLiteAtomCache(db_file, schema_version=2)
    repo_v2 = FSLibraryRepository(cache_db=cache_v2)

    # 重新加载应平稳重构并不报错
    lib_v2 = repo_v2.load_library([lib_dir])
    assert "d1-test-alpha" in lib_v2
