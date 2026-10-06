from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from aca_builder.domain.dag import sort_atoms_canonically
from aca_builder.domain.services import compile_prompt_closure


class AtomTokenProfile(BaseModel):
    id: str
    type: str
    priority: int | None = None
    package: str | None = None
    source_file: str | None = None
    char_count: int
    estimated_tokens: int
    via_lookups: list[str] = Field(default_factory=list)


class ProfileSummary(BaseModel):
    total_tokens: int
    by_pillar: dict[str, int]
    atoms: list[AtomTokenProfile] = Field(default_factory=list)


class PromptChunk(BaseModel):
    id: str
    type: str
    priority: int | None = None
    package: str | None = None
    source_file: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)
    content: str
    via_lookups: list[str] = Field(default_factory=list)


class CompilationResult(BaseModel):
    """统一编译器流水线输出结果（纯数据 IR + Emitter 产物）。"""

    prompt: str
    final_atom_map: dict[str, set[str]]
    chunks: list[PromptChunk]
    profile: ProfileSummary


def emit_prompt_profile(
    atom_lookup_map: dict[str, set[str]], library: dict[str, Any]
) -> ProfileSummary:
    """纯函数 Emitter：根据原子集合计算词元估算与 Pillar 分布。"""
    final_ids = atom_lookup_map.keys()
    by_pillar = {"kernel": 0, "d1": 0, "d2": 0, "d3": 0}
    atoms_profile: list[AtomTokenProfile] = []
    total_tokens = 0

    for atom_id in final_ids:
        atom = library.get(atom_id)
        if not atom:
            continue
        meta = atom["meta"]
        atom_type = str(
            meta.get("type")
            if hasattr(meta, "get")
            else getattr(meta, "type", "unknown")
        ).lower()
        content = (
            atom.get("content", "")
            if hasattr(atom, "get")
            else getattr(atom, "content", "")
        )
        char_count = len(content)
        tokens = max(1, round(char_count / 3.8))
        total_tokens += tokens
        if atom_type in by_pillar:
            by_pillar[atom_type] += tokens
        else:
            by_pillar[atom_type] = tokens

        lookups = sorted(atom_lookup_map.get(atom_id, set()))
        priority = (
            meta.get("priority")
            if hasattr(meta, "get")
            else getattr(meta, "priority", None)
        )
        pkg = (
            atom.get("package")
            if hasattr(atom, "get")
            else getattr(atom, "package", None)
        )
        source_file = (
            atom.get("source_file")
            if hasattr(atom, "get")
            else getattr(atom, "source_file", None)
        )

        atoms_profile.append(
            AtomTokenProfile(
                id=atom_id,
                type=atom_type,
                priority=priority,
                package=pkg,
                source_file=source_file,
                char_count=char_count,
                estimated_tokens=tokens,
                via_lookups=lookups,
            )
        )

    atoms_profile.sort(key=lambda x: x.estimated_tokens, reverse=True)
    return ProfileSummary(
        total_tokens=total_tokens,
        by_pillar=by_pillar,
        atoms=atoms_profile,
    )


def emit_prompt_chunks(
    atom_lookup_map: dict[str, set[str]], library: dict[str, Any]
) -> list[PromptChunk]:
    """纯函数 Emitter：生成规范拓扑排序的块状结构（供 Web 呈现）。"""
    final_ids = atom_lookup_map.keys()
    atoms_to_serialize = [
        library[atom_id] for atom_id in final_ids if atom_id in library
    ]
    atoms_to_serialize = sort_atoms_canonically(atoms_to_serialize)
    chunks: list[PromptChunk] = []

    for atom in atoms_to_serialize:
        meta = atom["meta"]
        atom_id = atom.get("id") if hasattr(atom, "get") else getattr(atom, "id", "")
        lookups = sorted(atom_lookup_map.get(atom_id, set()))
        meta_dict = (
            meta.model_dump()
            if hasattr(meta, "model_dump")
            else (
                meta.dict()
                if hasattr(meta, "dict")
                else (dict(meta) if isinstance(meta, dict) else {})
            )
        )
        atom_type = str(
            meta.get("type")
            if hasattr(meta, "get")
            else getattr(meta, "type", "unknown")
        ).lower()
        priority = (
            meta.get("priority")
            if hasattr(meta, "get")
            else getattr(meta, "priority", None)
        )
        pkg = (
            atom.get("package")
            if hasattr(atom, "get")
            else getattr(atom, "package", None)
        )
        source_file = (
            atom.get("source_file")
            if hasattr(atom, "get")
            else getattr(atom, "source_file", None)
        )
        content = (
            atom.get("content", "")
            if hasattr(atom, "get")
            else getattr(atom, "content", "")
        )

        chunks.append(
            PromptChunk(
                id=atom_id,
                type=atom_type,
                priority=priority,
                package=pkg,
                source_file=source_file,
                meta=meta_dict,
                content=content.strip(),
                via_lookups=lookups,
            )
        )

    return chunks


def compile_prompt(
    library: dict[str, Any],
    interfaces: dict[str, Any],
    imports: list[dict[str, Any]] | None = None,
    direct_lookup: tuple[str, dict[str, Any]] | None = None,
    include_kernel: bool = True,
) -> CompilationResult:
    """统一编译器纯函数主入口：接收知识库与接口，执行依赖求解并输出完整的 CompilationResult。"""
    final_atom_map, prompt_text = compile_prompt_closure(
        library=library,
        interfaces=interfaces,
        imports=imports,
        direct_lookup=direct_lookup,
        include_kernel=include_kernel,
    )
    chunks = emit_prompt_chunks(final_atom_map, library)
    profile = emit_prompt_profile(final_atom_map, library)

    return CompilationResult(
        prompt=prompt_text,
        final_atom_map=final_atom_map,
        chunks=chunks,
        profile=profile,
    )
