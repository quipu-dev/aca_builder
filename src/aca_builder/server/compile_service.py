from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel

from aca_builder.domain.services import (
    evaluate_lookup,
    generate_prompt_chunks,
    generate_prompt_profile,
    resolve_dependencies,
    resolve_lookup_by_key,
    select_atoms_by_query,
    serialize_prompt,
)
from aca_builder.server.common import execute_hook


class AtomTokenProfile(BaseModel):
    id: str
    type: str
    priority: int | None = None
    package: str | None = None
    source_file: str | None = None
    char_count: int
    estimated_tokens: int
    via_lookups: list[str] = []


class ProfileSummary(BaseModel):
    total_tokens: int
    by_pillar: dict[str, int]
    atoms: list[AtomTokenProfile]


class PromptChunk(BaseModel):
    id: str
    type: str
    priority: int | None = None
    package: str | None = None
    source_file: str | None = None
    meta: dict[str, Any] = {}
    content: str
    via_lookups: list[str] = []


class BuildResponse(BaseModel):
    prompt: str
    hooked_prompt: str | None = None
    chunks: list[PromptChunk] = []
    profile: ProfileSummary | None = None


def run_compilation_pipeline(
    library: dict[str, Any],
    interfaces: dict[str, Any],
    imports: list[dict[str, Any]] | None = None,
    direct_lookup: tuple[str, dict[str, Any]] | None = None,
    overrides: dict[str, Any] | None = None,
    apply_hook: bool = False,
    hook_command: str | None = None,
) -> BuildResponse:
    """
    通用 Prompt 编译流水线：
    1. 应用 overrides
    2. 计算初始命中映射
    3. 级联依赖解析闭包
    4. 自动注入单例 Kernel
    5. Prompt 序列化、分块生成、词元分析与可选 Hook 执行
    """
    if not library:
        raise HTTPException(status_code=400, detail="Library is empty")

    if overrides:
        for lkey, override in overrides.items():
            if lkey in interfaces.get("lookups", {}):
                interfaces["lookups"][lkey]["selectors"] = override.get("selectors", [])

    initial_map: dict[str, set[str]] = {}

    if direct_lookup:
        lkey, ldef = direct_lookup
        try:
            matched_ids = evaluate_lookup(library, ldef, interfaces)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"选择器演算异常: {e}")
        for aid in matched_ids:
            initial_map.setdefault(aid, set()).add(lkey)
    elif imports:
        for item in imports:
            if "lookup" in item:
                lkey = item["lookup"]
                ldef = resolve_lookup_by_key(lkey, None, interfaces)
                if not ldef:
                    continue
                matched_ids = evaluate_lookup(library, ldef, interfaces)
                for aid in matched_ids:
                    initial_map.setdefault(aid, set()).add(lkey)
            elif "query" in item:
                matched_ids = select_atoms_by_query(library, item["query"])
                for aid in matched_ids:
                    initial_map.setdefault(aid, set())

    try:
        final_atom_map = resolve_dependencies(initial_map, library, interfaces)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"依赖解析异常: {e}")

    kernel_ids = {
        k for k, v in library.items() if v.get("meta", {}).get("type") == "kernel"
    }
    for k_id in kernel_ids:
        if k_id not in final_atom_map:
            final_atom_map[k_id] = set()

    prompt_text = serialize_prompt(final_atom_map, library)
    chunks_data = generate_prompt_chunks(final_atom_map, library)
    profile_data = generate_prompt_profile(final_atom_map, library)

    hooked_output = None
    if apply_hook:
        hooked_output = execute_hook(hook_command, prompt_text)

    return BuildResponse(
        prompt=prompt_text,
        hooked_prompt=hooked_output,
        chunks=[PromptChunk(**c) for c in chunks_data],
        profile=profile_data,
    )
