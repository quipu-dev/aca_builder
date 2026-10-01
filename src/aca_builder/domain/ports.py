from __future__ import annotations

from typing import Any, Protocol

from .events import Event


class MessageBus(Protocol):
    def emit(self, event: Event) -> None: ...

    def error(self, msg_id: str, **kwargs: Any) -> None:
        """Emits an error message using a message ID."""
        ...

    def lint_error(self, msg_id: str, **kwargs: Any) -> None:
        """Emits a lint error message using a message ID."""
        ...

    def warn(self, msg_id: str, **kwargs: Any) -> None:
        """Emits a warning message using a message ID."""
        ...

    def info(self, msg_id: str, **kwargs: Any) -> None:
        """Emits an info message using a message ID."""
        ...

    def success(self, msg_id: str, **kwargs: Any) -> None:
        """Emits a success message using a message ID."""
        ...


class LibraryRepository(Protocol):
    def load_library(self, paths: list[Any]) -> dict[str, Any]:
        """Loads atoms from storage."""
        ...

    def load_interfaces(self, paths: list[Any]) -> dict[str, Any]:
        """Loads D4 interfaces/lookups from storage."""
        ...


class ManifestRepository(Protocol):
    def find_manifest(self, name: str, search_paths: list[Any]) -> Any | None: ...

    def load_manifest(self, path: Any) -> dict[str, Any]: ...
