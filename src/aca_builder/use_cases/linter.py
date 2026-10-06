from __future__ import annotations

from pathlib import Path

from aca_builder.domain.events import BuildError
from aca_builder.domain.models import Diagnostic
from aca_builder.domain.ports import LibraryRepository, ManifestRepository, MessageBus
from aca_builder.domain.rules import diagnose_knowledge_base


class LinterService:
    def __init__(
        self,
        bus: MessageBus,
        library_repo: LibraryRepository,
        manifest_repo: ManifestRepository,
    ):
        self.bus = bus
        self.lib_repo = library_repo
        self.man_repo = manifest_repo

    def diagnose(
        self, library_paths: list[Path], manifest_paths: list[Path]
    ) -> list[Diagnostic]:
        """纯函数方式执行知识库规范诊断，返回强类型诊断问题清单。"""
        return diagnose_knowledge_base(
            self.lib_repo, self.man_repo, library_paths, manifest_paths
        )

    def lint(self, library_paths: list[Path], manifest_paths: list[Path]) -> None:
        """CLI 命令调度入口：执行纯规则管线，并将结果映射输出至消息总线。"""
        self.bus.info("linter.start", count=len(library_paths))
        diagnostics = self.diagnose(library_paths, manifest_paths)

        error_count = 0
        for diag in diagnostics:
            if diag.level == "ERROR":
                error_count += 1
                self.bus.lint_error(diag.code, **diag.context)
            elif diag.level == "WARN":
                self.bus.warn(diag.code, **diag.context)
            elif diag.level == "INFO":
                self.bus.info(diag.code, **diag.context)

        if error_count == 0:
            self.bus.success("linter.success")
        else:
            raise BuildError("LINT_FAILED_SILENTLY")
