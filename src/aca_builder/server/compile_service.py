from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel

from aca_builder.domain.events import BuildError
from aca_builder.domain.services import compile_prompt_closure
from aca_builder.server.common import execute_hook


def generate_prompt_profile(
    atom_lookup_map: dict[str, set[str]], library: dict[str, Any]
) -> dict[str, Any]:
    """Generates structured context profiling metrics including tokens and pillar distributions."""
    final_ids = atom_lookup_map.keys()
    by_pillar = {"kernel": 0, "d1": 0, "d2": 0, "d3": 0}
    atoms_profile = []
    total_tokens = 0

    for atom_id in final_ids:
        atom = library.get(atom_id)
        if not atom:
            continue
        meta = atom["meta"]
        atom_type = str(meta.get("type", "unknown")).lower()
        content = atom.get("content", "")
        char_count = len(content)
        # Token estimation: approximately 3.8 chars per token
        tokens = max(1, round(char_count / 3.8))
        total_tokens += tokens
        if atom_type in by_pillar:
            by_pillar[atom_type] += tokens
        else:
            by_pillar[atom_type] = tokens

        lookups = sorted(atom_lookup_map.get(atom_id, set()))
        atoms_profile.append(
            {
                "id": atom_id,
                "type": atom_type,
                "priority": meta.get("priority"),
                "package": atom.get("package"),
                "source_file": atom.get("source_file"),
                "char_count": char_count,
                "estimated_tokens": tokens,
                "via_lookups": lookups,
            }
        )

    atoms_profile.sort(key=lambda x: x["estimated_tokens"], reverse=True)
    return {
        "total_tokens": total_tokens,
        "by_pillar": by_pillar,
        "atoms": atoms_profile,
    }


def generate_prompt_chunks(
    atom_lookup_map: dict[str, set[str]], library: dict[str, Any]
) -> list[dict[str, Any]]:
    """Generates ordered structured prompt chunks for block-based UI rendering."""
    final_ids = atom_lookup_map.keys()
    atoms_to_serialize = [
        library[atom_id] for atom_id in final_ids if atom_id in library
    ]

    def sort_key(atom):
        meta = atom["meta"]
        if meta.get("type") == "kernel":
            return (-1,)
        priority = meta.get("priority", 99)
        if meta.get("type") == "d3":
            if priority == 0:
                return (0,)
            if priority == 1:
                return (1,)
            if priority == 2:
                return (4,)
        elif meta.get("type") == "d1":
            return (2,)
        elif meta.get("type") == "d2":
            return (3,)
        return (99,)

    atoms_to_serialize.sort(key=sort_key)
    chunks = []

    for atom in atoms_to_serialize:
        meta = atom["meta"]
        atom_id = atom["id"]
        lookups = sorted(atom_lookup_map.get(atom_id, set()))
        chunks.append(
            {
                "id": atom_id,
                "type": meta.get("type", "unknown").lower(),
                "priority": meta.get("priority"),
                "package": atom.get("package"),
                "source_file": atom.get("source_file"),
                "meta": meta,
                "content": atom.get("content", "").strip(),
                "via_lookups": lookups,
            }
        )

    return chunks


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
