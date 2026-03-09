# backend/app/core/executors/__init__.py

from app.core.executors.action_executor import ActionExecutor
from app.core.executors.ai_executor import AIExecutor
from app.core.executors.base import NodeExecutor
from app.core.executors.trigger_executor import TriggerExecutor

EXECUTOR_MAP: dict[str, type[NodeExecutor]] = {
    "trigger": TriggerExecutor,
    "ai": AIExecutor,
    "action": ActionExecutor,
}


def get_executor(node_type: str) -> NodeExecutor:
    """Get the appropriate executor instance for a node type."""
    executor_class = EXECUTOR_MAP.get(node_type)
    if executor_class is None:
        raise ValueError(f"Unknown node type: '{node_type}'")
    return executor_class()


__all__ = [
    "NodeExecutor",
    "TriggerExecutor",
    "AIExecutor",
    "ActionExecutor",
    "get_executor",
    "EXECUTOR_MAP",
]
