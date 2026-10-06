from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass, field
from pathlib import Path


def atomic_write_text(path: Path | str, content: str, encoding: str = "utf-8") -> None:
    """POSIX 标准原子写入：通过同卷临时文件写入、刷盘并原子替换目标路径，彻底杜绝数据半截损坏。"""
    target_path = Path(path).resolve()
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", dir=target_path.parent, delete=False, encoding=encoding
    ) as tf:
        tf.write(content)
        tf.flush()
        os.fsync(tf.fileno())
        temp_name = tf.name
    os.replace(temp_name, target_path)


@dataclass
class MutationPlan:
    """事务性文件变更差量计划 (Mutation Plan)。
    在 Functional Core 中计算出所有需要变动的路径与内容，并在外壳中一次性原子执行。"""

    writes: dict[Path, str] = field(default_factory=dict)
    moves: list[tuple[Path, Path]] = field(default_factory=list)
    deletions: list[Path] = field(default_factory=list)

    def execute(self) -> None:
        """应用全部计划中的文件变更副作用。"""
        # 1. 批量原子写入新增或更新的文件
        for path, content in self.writes.items():
            atomic_write_text(path, content)
        # 2. 执行原子文件移动与重命名
        for src, dest in self.moves:
            dest.parent.mkdir(parents=True, exist_ok=True)
            os.replace(src, dest)
        # 3. 执行删除操作
        for path in self.deletions:
            if path.exists():
                path.unlink()
