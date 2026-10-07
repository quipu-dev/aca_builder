from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationError

try:
    from pydantic import ConfigDict

    PYDANTIC_V2 = True
except ImportError:
    PYDANTIC_V2 = False

from aca_builder.domain.events import BuildError


class StrictAtomMetaSchema(BaseModel):
    """严格原子组件 Frontmatter 静态模式：禁止任何未知冗余字段，阻断拼写错误逃逸。"""

    if PYDANTIC_V2:
        model_config = ConfigDict(extra="forbid")
    else:

        class Config:
            extra = "forbid"

    id: str | None = None
    type: Literal["kernel", "d1", "d2", "d3"]
    priority: int | None = None
    domain: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    status: str = "stable"
    description: str = ""
    version: str | None = None
    uses: list[str] = Field(default_factory=list)
    after: list[str] = Field(default_factory=list)
    requires: dict[str, str] = Field(default_factory=dict)


def validate_atom_meta_dict(
    meta_dict: dict[str, Any], path_hint: str = ""
) -> dict[str, Any]:
    """验证原始字典是否严格符合原子元数据规范，给出明确的拼写错误拦截提示。"""
    if not isinstance(meta_dict, dict):
        raise BuildError(f"Atom metadata in '{path_hint}' must be a YAML dictionary.")

    atom_type = meta_dict.get("type")
    if not atom_type:
        raise BuildError(f"Atom missing required metadata 'type' in '{path_hint}'.")

    if atom_type != "kernel" and "id" not in meta_dict:
        raise BuildError(f"Atom missing required metadata 'id' in '{path_hint}'.")

    if atom_type == "d3":
        priority = meta_dict.get("priority")
        if priority is None or priority not in [0, 1, 2]:
            raise BuildError(
                f"Invalid priority '{priority}' for d3 atom in '{path_hint}'. Expected 0, 1, or 2."
            )

    try:
        validated = StrictAtomMetaSchema(**meta_dict)
        return validated.model_dump(exclude_unset=False)
    except ValidationError as e:
        error_msgs = []
        for err in e.errors():
            loc = ".".join(str(p) for p in err["loc"])
            msg = err["msg"]
            error_msgs.append(f"Field '{loc}': {msg}")
        joined = "; ".join(error_msgs)
        raise BuildError(
            f"Metadata Schema Validation Failed in '{path_hint}': {joined}"
        )
