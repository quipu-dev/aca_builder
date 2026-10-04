from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel

from aca_builder.domain.events import BuildError
from aca_builder.domain.services import (
    compile_prompt_closure,
    generate_prompt_chunks,
    generate_prompt_profile,
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
    include_kernel: bool = True,
) -> BuildResponse:
    """
    通用 Prompt 服务端呈现流水线：
    1. 调用纯领域统一编译流水线 (compile_prompt_closure)
    2. 生成 Presentation 层所需分块 (chunks) 与词元分析 (profile)
    3. 可选执行后处理 Hook 并包装响应
    """
    try:
        final_atom_map, prompt_text = compile_prompt_closure(
            library=library,
            interfaces=interfaces,
            imports=imports,
            direct_lookup=direct_lookup,
            overrides=overrides,
            include_kernel=include_kernel,
        )
    except BuildError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"编译解析异常: {e}")

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
