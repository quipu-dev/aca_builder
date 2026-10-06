from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel

from aca_builder.domain.compiler import (
    ProfileSummary,
    PromptChunk,
    compile_prompt,
)
from aca_builder.domain.events import BuildError
from aca_builder.server.common import execute_hook


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
    apply_hook: bool = False,
    hook_command: str | None = None,
    include_kernel: bool = True,
) -> BuildResponse:
    """
    Imperative Shell:
    1. 调用纯函数核心 compile_prompt
    2. 执行外部后处理 Hook 副作用
    3. 封装为 HTTP BuildResponse 响应
    """
    try:
        comp_res = compile_prompt(
            library=library,
            interfaces=interfaces,
            imports=imports,
            direct_lookup=direct_lookup,
            include_kernel=include_kernel,
        )
    except BuildError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"编译解析异常: {e}")

    hooked_output = None
    if apply_hook:
        hooked_output = execute_hook(hook_command, comp_res.prompt)

    return BuildResponse(
        prompt=comp_res.prompt,
        hooked_prompt=hooked_output,
        chunks=comp_res.chunks,
        profile=comp_res.profile,
    )
