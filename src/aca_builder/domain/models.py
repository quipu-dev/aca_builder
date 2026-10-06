from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

try:
    from pydantic import ConfigDict

    PYDANTIC_V2 = True
except ImportError:
    PYDANTIC_V2 = False


class PillarType(str, Enum):
    D1 = "d1"
    D2 = "d2"
    D3 = "d3"
    KERNEL = "kernel"


class AtomMeta(BaseModel):
    """强类型原子组件元数据模型。"""

    if PYDANTIC_V2:
        model_config = ConfigDict(extra="allow")
    else:

        class Config:
            extra = "allow"

    id: str | None = None
    type: str
    priority: int | None = None
    domain: list[str] = Field(default_factory=list)
    uses: list[str] = Field(default_factory=list)
    description: str = ""
    status: str = "stable"

    def __getitem__(self, item: str) -> Any:
        if hasattr(self, item):
            return getattr(self, item)
        extra = getattr(self, "__pydantic_extra__", None)
        if extra and item in extra:
            return extra[item]
        raise KeyError(item)

    def get(self, item: str, default: Any = None) -> Any:
        try:
            return self[item]
        except KeyError:
            return default

    def __contains__(self, item: str) -> bool:
        if hasattr(self, item):
            return True
        extra = getattr(self, "__pydantic_extra__", None)
        return bool(extra and item in extra)


class Atom(BaseModel):
    """强类型原子组件实体模型。"""

    if PYDANTIC_V2:
        model_config = ConfigDict(extra="allow")
    else:

        class Config:
            extra = "allow"

    id: str
    meta: AtomMeta
    content: str
    package: str | None = None
    source_file: str = ""

    def __getitem__(self, item: str) -> Any:
        if item == "id":
            return self.id
        if item == "meta":
            return self.meta
        if item == "content":
            return self.content
        if item == "package":
            return self.package
        if item == "source_file":
            return self.source_file
        if hasattr(self, item):
            return getattr(self, item)
        extra = getattr(self, "__pydantic_extra__", None)
        if extra and item in extra:
            return extra[item]
        raise KeyError(item)

    def get(self, item: str, default: Any = None) -> Any:
        try:
            return self[item]
        except KeyError:
            return default

    def __contains__(self, item: str) -> bool:
        return item in ("id", "meta", "content", "package", "source_file") or hasattr(
            self, item
        )


class Diagnostic(BaseModel):
    """纯函数静态检查与诊断问题数据载体。"""

    level: str  # "ERROR", "WARN", "INFO"
    code: str
    message: str = ""
    context: dict[str, Any] = Field(default_factory=dict)
    target: dict[str, str] | None = None

    def to_dict(self) -> dict[str, Any]:
        level_label = (
            "错误"
            if self.level == "ERROR"
            else ("警告" if self.level == "WARN" else "信息")
        )
        return {
            "level": level_label,
            "code": self.code,
            "message": self.message,
            "target": self.target,
        }
