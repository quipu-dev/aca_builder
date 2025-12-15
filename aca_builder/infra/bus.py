import typer
from typing import Any
from aca_builder.domain.ports import MessageBus
from aca_builder.domain.events import Event, LogEvent
from aca_builder.messages import MESSAGES


class ConsoleMessageBus(MessageBus):
    """Adapter that outputs events to the console using Typer."""

    def emit(self, event: Event) -> None:
        if isinstance(event, LogEvent):
            self._log(event)

    def _format(self, msg_id: str, **kwargs: Any) -> str:
        template = MESSAGES.get(msg_id, f"[MISSING: {msg_id}]")
        try:
            return template.format(**kwargs)
        except KeyError as e:
            return f"{template} (Missing Argument: {e})"

    def _log(self, event: LogEvent):
        fg = typer.colors.WHITE
        prefix = ""
        err_stream = False

        if event.level == "ERROR":
            fg = typer.colors.RED
            prefix = "[FAIL]"
            err_stream = True
        elif event.level == "LINT_FAIL":
            fg = typer.colors.RED
            prefix = "[FAIL]"
            err_stream = False
        elif event.level == "WARN":
            fg = typer.colors.YELLOW
            prefix = "[WARN]"
            err_stream = True
        elif event.level == "SUCCESS":
            fg = typer.colors.GREEN
            prefix = "[OK]"
        else:
            fg = typer.colors.WHITE

        msg = event.message

        if prefix:
            typer.secho(f"  {prefix} {msg}", fg=fg, err=err_stream)
        else:
            typer.echo(msg)

    def error(self, msg_id: str, **kwargs: Any) -> None:
        msg = self._format(msg_id, **kwargs)
        self.emit(LogEvent(message=msg, level="ERROR"))

    def lint_error(self, msg_id: str, **kwargs: Any) -> None:
        msg = self._format(msg_id, **kwargs)
        self.emit(LogEvent(message=msg, level="LINT_FAIL"))

    def warn(self, msg_id: str, **kwargs: Any) -> None:
        msg = self._format(msg_id, **kwargs)
        self.emit(LogEvent(message=msg, level="WARN"))

    def info(self, msg_id: str, **kwargs: Any) -> None:
        msg = self._format(msg_id, **kwargs)
        self.emit(LogEvent(message=msg, level="INFO"))

    def success(self, msg_id: str, **kwargs: Any) -> None:
        msg = self._format(msg_id, **kwargs)
        self.emit(LogEvent(message=msg, level="SUCCESS"))
