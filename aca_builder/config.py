# aca_builder/config.py

from pathlib import Path
import yaml
from typing import List, Optional, Dict, Any

CONFIG_PATH = Path.home() / ".config" / "aca" / "config.yaml"


def load_config() -> Dict[str, Any]:
    """Loads the ACA global configuration file."""
    if not CONFIG_PATH.exists():
        return {}
    try:
        with CONFIG_PATH.open("r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except (yaml.YAMLError, IOError):
        # In case of malformed file or read error, treat as no config
        return {}


def get_library_paths(config: Dict[str, Any]) -> List[Path]:
    """Gets a list of absolute library paths from the config."""
    base_dir = CONFIG_PATH.parent
    paths = config.get("library_paths", [])
    return [
        Path(p).expanduser() if p.startswith("~") or p.startswith("/") else base_dir / p
        for p in paths
    ]


def get_manifest_paths(config: Dict[str, Any]) -> List[Path]:
    """Gets a list of absolute manifest paths from the config."""
    base_dir = CONFIG_PATH.parent
    paths = config.get("manifest_paths", [])
    return [
        Path(p).expanduser() if p.startswith("~") or p.startswith("/") else base_dir / p
        for p in paths
    ]


def get_post_process_hook(config: Dict[str, Any]) -> Optional[str]:
    """Gets the post-processing hook command from the config."""
    return config.get("post_process_hook")
