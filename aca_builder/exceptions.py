# aca_builder/exceptions.py

class BuildError(Exception):
    """自定义构建错误"""
    pass


class LintError(Exception):
    """Custom exception for linting errors."""
    pass