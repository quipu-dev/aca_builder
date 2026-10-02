from __future__ import annotations

import asyncio
from typing import Any

import yaml
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from aca_builder import config
from aca_builder.commands import _bootstrap
from aca_builder.domain.events import BuildError
from aca_builder.use_cases.builder import BuilderService

router = APIRouter()


class BuildRequest(BaseModel):
    manifest: str
    is_file: bool = False


class BuildResponse(BaseModel):
    prompt: str


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "aca-studio"}


@router.get("/packages")
def get_packages() -> dict[str, Any]:
    """获取所有已加载的 package 与 lookup 接口定义"""
    lib_repo, _, _ = _bootstrap()
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)
    interfaces = lib_repo.load_interfaces(library_paths)
    return interfaces


@router.get("/manifests")
def list_manifests() -> list[str]:
    """获取当前配置的所有 manifest 清单名称"""
    _, man_repo, _ = _bootstrap()
    app_config = config.load_config()
    manifest_paths = config.get_manifest_paths(app_config)
    return man_repo.list_manifests(manifest_paths)


@router.get("/assets")
def get_assets_overview() -> dict[str, Any]:
    """获取系统完整的资产结构：包、公开接口、内部查找与所有原子清单"""
    lib_repo, man_repo, _ = _bootstrap()
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)
    manifest_paths = config.get_manifest_paths(app_config)

    library = lib_repo.load_library(library_paths, fail_fast=False)
    interfaces = lib_repo.load_interfaces(library_paths)
    manifest_names = man_repo.list_manifests(manifest_paths)

    # 归集包信息
    packages_map: dict[str, dict[str, Any]] = {}
    legacy_atoms = []

    for atom_id, atom in library.items():
        pkg = atom.get("package")
        meta = atom["meta"]
        atom_summary = {
            "id": atom_id,
            "type": meta.get("type"),
            "priority": meta.get("priority"),
            "domain": meta.get("domain", []),
            "source_file": atom.get("source_file"),
            "uses": meta.get("uses", []),
        }

        if pkg:
            if pkg not in packages_map:
                packages_map[pkg] = {
                    "name": pkg,
                    "exports": {},
                    "internal_lookups": {},
                    "atoms": [],
                }
            packages_map[pkg]["atoms"].append(atom_summary)
        else:
            legacy_atoms.append(atom_summary)

    for key, l_def in interfaces.get("lookups", {}).items():
        pkg = l_def.get("package")
        is_public = l_def.get("visibility") == "public"
        lookup_item = {
            "key": key,
            "pillar": l_def.get("pillar"),
            "description": l_def.get("description", ""),
            "visibility": l_def.get("visibility"),
            "selectors": l_def.get("selectors", []),
        }
        if pkg:
            if pkg not in packages_map:
                packages_map[pkg] = {
                    "name": pkg,
                    "exports": {},
                    "internal_lookups": {},
                    "atoms": [],
                }
            if is_public:
                packages_map[pkg]["exports"][key] = lookup_item
            else:
                packages_map[pkg]["internal_lookups"][key] = lookup_item

    return {
        "packages": list(packages_map.values()),
        "legacy_atoms": legacy_atoms,
        "manifests": manifest_names,
    }


@router.get("/graph")
def get_dependency_graph(manifest: str) -> dict[str, Any]:
    """生成指定 Manifest 的完整依赖有向图 (DAG: nodes & edges)"""
    from aca_builder.domain.services import (
        evaluate_lookup,
        resolve_lookup_by_key,
    )

    lib_repo, man_repo, _ = _bootstrap()
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)
    manifest_paths = config.get_manifest_paths(app_config)

    manifest_path = man_repo.find_manifest(manifest, manifest_paths)
    if not manifest_path:
        raise HTTPException(status_code=404, detail=f"Manifest '{manifest}' not found")

    manifest_data = man_repo.load_manifest(manifest_path)
    library = lib_repo.load_library(library_paths, fail_fast=False)
    interfaces = lib_repo.load_interfaces(library_paths)

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    visited_nodes: set[str] = set()
    visited_edges: set[tuple[str, str]] = set()

    # 根节点: Manifest
    manifest_node_id = f"manifest::{manifest}"
    nodes.append(
        {
            "id": manifest_node_id,
            "type": "manifestNode",
            "data": {
                "label": manifest,
                "version": manifest_data.get("version", "1.0"),
                "description": manifest_data.get("description", ""),
            },
        }
    )
    visited_nodes.add(manifest_node_id)

    def add_edge(source: str, target: str, label: str = ""):
        if (source, target) not in visited_edges:
            edges.append(
                {
                    "id": f"e_{source}->{target}",
                    "source": source,
                    "target": target,
                    "label": label,
                    "animated": True,
                }
            )
            visited_edges.add((source, target))

    def process_lookup(lkey: str, parent_id: str, context_pkg: str | None = None):
        lookup_node_id = f"lookup::{lkey}"
        target_def = resolve_lookup_by_key(lkey, context_pkg, interfaces)

        is_broken = target_def is None
        is_private_access = False
        pillar = "unknown"
        desc = ""

        if target_def:
            pillar = target_def.get("pillar", "unknown")
            desc = target_def.get("description", "")
            target_pkg = target_def.get("package")
            if (
                target_pkg
                and target_pkg != context_pkg
                and target_def.get("visibility") == "private"
            ):
                is_private_access = True

        if lookup_node_id not in visited_nodes:
            nodes.append(
                {
                    "id": lookup_node_id,
                    "type": "lookupNode",
                    "data": {
                        "key": lkey,
                        "pillar": pillar,
                        "description": desc,
                        "isBroken": is_broken,
                        "isPrivate": is_private_access,
                    },
                }
            )
            visited_nodes.add(lookup_node_id)

        add_edge(parent_id, lookup_node_id)

        if not target_def:
            return

        # 评估此 lookup 对应的 atoms
        try:
            matched_atom_ids = evaluate_lookup(library, target_def, interfaces)
        except (BuildError, KeyError, ValueError):
            matched_atom_ids = set()

        for atom_id in matched_atom_ids:
            process_atom(atom_id, lookup_node_id)

    def process_atom(atom_id: str, parent_id: str):
        atom_node_id = f"atom::{atom_id}"
        atom = library.get(atom_id)
        if not atom:
            return

        meta = atom["meta"]
        atom_type = meta.get("type", "unknown")
        priority = meta.get("priority")
        pkg = atom.get("package")

        if atom_node_id not in visited_nodes:
            nodes.append(
                {
                    "id": atom_node_id,
                    "type": "atomNode",
                    "data": {
                        "id": atom_id,
                        "type": atom_type,
                        "priority": priority,
                        "package": pkg,
                    },
                }
            )
            visited_nodes.add(atom_node_id)

        add_edge(parent_id, atom_node_id)

        # 如果是 D2 原子，递归处理其 uses
        if atom_type == "d2":
            uses = meta.get("uses", [])
            for use_ref in uses:
                process_lookup(use_ref, atom_node_id, context_pkg=pkg)

    # 1. 展开 imports
    imports = manifest_data.get("imports", [])
    for item in imports:
        if isinstance(item, dict) and "lookup" in item:
            process_lookup(item["lookup"], manifest_node_id, context_pkg=None)

    # 2. 注入 Kernel 节点
    for atom_id, atom in library.items():
        if atom["meta"].get("type") == "kernel":
            process_atom(atom_id, manifest_node_id)

    return {"nodes": nodes, "edges": edges}


class AdhocCompileRequest(BaseModel):
    imports: list[dict[str, Any]]
    overrides: dict[str, Any] | None = None


class SaveManifestRequest(BaseModel):
    name: str
    version: str = "1.0.0"
    description: str = ""
    imports: list[dict[str, Any]]


@router.post("/build", response_model=BuildResponse)
def build_prompt(req: BuildRequest):
    """编译指定 Manifest 生成完整 Prompt 文本"""
    lib_repo, man_repo, _ = _bootstrap()
    builder = BuilderService(lib_repo, man_repo)
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)
    manifest_paths = config.get_manifest_paths(app_config)

    try:
        final_prompt = builder.build_prompt(
            req.manifest,
            library_paths,
            manifest_paths,
            is_file_path=req.is_file,
        )
        return BuildResponse(prompt=final_prompt)
    except BuildError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compile-adhoc", response_model=BuildResponse)
def compile_adhoc(req: AdhocCompileRequest):
    """根据前端传入的内存草稿组件列表，进行即席拓扑求解与序列化"""
    from aca_builder.domain.services import (
        evaluate_lookup,
        resolve_dependencies,
        resolve_lookup_by_key,
        select_atoms_by_query,
        serialize_prompt,
    )

    lib_repo, _, _ = _bootstrap()
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)

    library = lib_repo.load_library(library_paths, fail_fast=False)
    interfaces = lib_repo.load_interfaces(library_paths)

    if not library:
        raise HTTPException(status_code=400, detail="Library is empty")

    # 1. 覆盖机制
    if req.overrides:
        for lkey, override in req.overrides.items():
            if lkey in interfaces["lookups"]:
                interfaces["lookups"][lkey]["selectors"] = override.get("selectors", [])

    # 2. 导入求解
    initial_map: dict[str, set[str]] = {}
    for item in req.imports:
        if "lookup" in item:
            lkey = item["lookup"]
            l_def = resolve_lookup_by_key(lkey, None, interfaces)
            if not l_def:
                continue
            matched_ids = evaluate_lookup(library, l_def, interfaces)
            for aid in matched_ids:
                initial_map.setdefault(aid, set()).add(lkey)
        elif "query" in item:
            matched_ids = select_atoms_by_query(library, item["query"])
            for aid in matched_ids:
                initial_map.setdefault(aid, set())

    # 3. 递归依赖解析
    final_atom_map = resolve_dependencies(initial_map, library, interfaces)

    # 4. Kernel 注入
    kernel_ids = {k for k, v in library.items() if v["meta"]["type"] == "kernel"}
    for k_id in kernel_ids:
        if k_id not in final_atom_map:
            final_atom_map[k_id] = set()

    # 5. 序列化
    final_prompt = serialize_prompt(final_atom_map, library)
    return BuildResponse(prompt=final_prompt)


@router.post("/manifests")
def save_manifest(req: SaveManifestRequest):
    """将装配好的结构持久化保存为 Manifest YAML 文件"""
    app_config = config.load_config()
    manifest_paths = config.get_manifest_paths(app_config)
    if not manifest_paths:
        raise HTTPException(status_code=400, detail="No manifest_paths configured")

    target_dir = manifest_paths[0]
    target_dir.mkdir(parents=True, exist_ok=True)
    target_file = target_dir / f"{req.name}.yaml"

    manifest_content = {
        "name": req.name,
        "version": req.version,
        "description": req.description,
        "imports": req.imports,
    }

    try:
        target_file.write_text(
            yaml.safe_dump(manifest_content, sort_keys=False, allow_unicode=True),
            encoding="utf-8",
        )
        return {"status": "ok", "path": str(target_file)}
    except (OSError, yaml.YAMLError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to save manifest: {e}")


class CollectingMessageBus:
    """用于捕获 Linter 事件并格式化为结构化列表的消息总线适配器"""

    def __init__(self):
        self.issues: list[dict[str, Any]] = []
        self.error_count = 0
        self.warn_count = 0

    def emit(self, event: Any) -> None:
        pass

    def _format(self, msg_id: str, **kwargs: Any) -> str:
        from aca_builder.messages import MESSAGES

        template = MESSAGES.get(msg_id, f"[{msg_id}]")
        try:
            return template.format(**kwargs)
        except (KeyError, IndexError, ValueError):
            return template

    def error(self, msg_id: str, **kwargs: Any) -> None:
        self.error_count += 1
        self.issues.append(
            {
                "level": "错误",
                "code": msg_id,
                "message": self._format(msg_id, **kwargs),
            }
        )

    def lint_error(self, msg_id: str, **kwargs: Any) -> None:
        self.error_count += 1
        self.issues.append(
            {
                "level": "错误",
                "code": msg_id,
                "message": self._format(msg_id, **kwargs),
            }
        )

    def warn(self, msg_id: str, **kwargs: Any) -> None:
        self.warn_count += 1
        self.issues.append(
            {
                "level": "警告",
                "code": msg_id,
                "message": self._format(msg_id, **kwargs),
            }
        )

    def info(self, msg_id: str, **kwargs: Any) -> None:
        pass

    def success(self, msg_id: str, **kwargs: Any) -> None:
        pass


@router.get("/lint")
def run_linter() -> dict[str, Any]:
    """运行全量规范检查，返回结构化诊断报告"""
    from aca_builder.use_cases.linter import LinterService

    lib_repo, man_repo, _ = _bootstrap()
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)
    manifest_paths = config.get_manifest_paths(app_config)

    bus = CollectingMessageBus()
    linter = LinterService(bus, lib_repo, man_repo)

    try:
        linter.lint(library_paths, manifest_paths)
    except BuildError:
        # Linter 会在存在错误时抛出 BuildError("LINT_FAILED_SILENTLY")，结果已由 bus 收集
        pass

    return {
        "error_count": bus.error_count,
        "warn_count": bus.warn_count,
        "issues": bus.issues,
    }


class CreateAtomRequest(BaseModel):
    package: str
    id: str
    type: str  # d1, d2, d3
    priority: int | None = None
    domain: list[str] = []
    uses: list[str] = []
    content: str


@router.post("/atoms")
def create_atom(req: CreateAtomRequest):
    """创建并保存新的原子组件到对应的包目录下"""
    app_config = config.load_config()
    library_paths = config.get_library_paths(app_config)
    if not library_paths:
        raise HTTPException(status_code=400, detail="未配置知识库路径")

    # 寻找目标包的根目录
    target_pkg_dir = None
    for lib_root in library_paths:
        if not lib_root.exists():
            continue
        for pkg_file in lib_root.rglob("package.yaml"):
            try:
                pkg_data = yaml.safe_load(pkg_file.read_text(encoding="utf-8"))
                if pkg_data and pkg_data.get("name") == req.package:
                    target_pkg_dir = pkg_file.parent
                    break
            except (yaml.YAMLError, OSError):
                continue
        if target_pkg_dir:
            break

    if not target_pkg_dir:
        raise HTTPException(
            status_code=404, detail=f"未找到组件包 '{req.package}' 的存放目录"
        )

    # 按照构造归类目录
    type_dir = target_pkg_dir / req.type
    type_dir.mkdir(parents=True, exist_ok=True)

    target_file = type_dir / f"{req.id}.md"

    # 构建合法的前置元数据 (Frontmatter)
    meta: dict[str, Any] = {
        "id": req.id,
        "type": req.type,
    }

    if req.type == "d3":
        meta["priority"] = req.priority if req.priority is not None else 1

    if req.domain:
        meta["domain"] = req.domain

    if req.type == "d2" and req.uses:
        meta["uses"] = req.uses

    meta["status"] = "stable"

    meta_yaml = yaml.safe_dump(meta, sort_keys=False, allow_unicode=True).strip()
    full_content = f"---\n{meta_yaml}\n---\n\n{req.content.strip()}\n"

    try:
        target_file.write_text(full_content, encoding="utf-8")
        return {
            "status": "ok",
            "file": str(target_file),
            "id": req.id,
        }
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"保存原子失败: {e}")


# 全局客户端事件广播队列集合
active_subscribers: set[asyncio.Queue] = set()


@router.get("/events/stream")
async def event_stream():
    """Server-Sent Events 长连接，向前端推送文件系统变更事件"""
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    active_subscribers.add(queue)

    async def sse_generator():
        try:
            # 建立初始握手
            yield "event: ping\ndata: connected\n\n"
            while True:
                data = await queue.get()
                yield f"event: change\ndata: {data}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            active_subscribers.discard(queue)

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def broadcast_change(change_type: str = "LIBRARY_DIRTY"):
    """向所有在线前端客户端广播变更通知"""
    for q in list(active_subscribers):
        try:
            q.put_nowait(change_type)
        except asyncio.QueueFull:
            pass
