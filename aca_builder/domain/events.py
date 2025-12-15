from dataclasses import dataclass
from typing import Optional, Any

@dataclass
class Event:
    pass

@dataclass
class LogEvent(Event):
    message: str
    level: str = "INFO"  # INFO, WARN, ERROR, SUCCESS
    context: Optional[str] = None

@dataclass
class LintError(LogEvent):
    level: str = "ERROR"
    file_path: Optional[str] = None
    line: Optional[int] = None

@dataclass
class LintWarning(LogEvent):
    level: str = "WARN"

class BuildError(Exception):
    """Domain exception for build failures."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

class SystemError(Exception):
    """Infrastructure/System level failures."""
    pass