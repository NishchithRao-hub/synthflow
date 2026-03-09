# backend/app/core/execution_context.py

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import structlog

logger = structlog.get_logger()

# Pattern to match {{ expression }} templates
TEMPLATE_PATTERN = re.compile(r"\{\{\s*(.+?)\s*\}\}")


@dataclass
class NodeResult:
    """The result of executing a single node."""

    status: str  # "completed" | "failed" | "skipped"
    output: dict = field(default_factory=dict)
    error: str | None = None
    duration_ms: int = 0


class ExecutionContext:
    """
    Accumulates node outputs during workflow execution.

    Structure:
    {
        "trigger": {
            "node_id": "node_1",
            "output": { ... }
        },
        "nodes": {
            "node_2": {
                "status": "completed",
                "output": { ... }
            },
            ...
        },
        "metadata": {
            "run_id": "...",
            "workflow_id": "...",
            "started_at": "..."
        }
    }
    """

    def __init__(self, run_id: str, workflow_id: str):
        self.run_id = run_id
        self.workflow_id = workflow_id
        self.started_at = datetime.now(timezone.utc).isoformat()

        self._trigger: dict[str, Any] = {}
        self._nodes: dict[str, dict[str, Any]] = {}

    def set_trigger_output(self, node_id: str, output: dict) -> None:
        """Store the trigger node's output."""
        self._trigger = {
            "node_id": node_id,
            "output": output,
        }

    def set_node_result(self, node_id: str, result: NodeResult) -> None:
        """Store a node's execution result."""
        self._nodes[node_id] = {
            "status": result.status,
            "output": result.output,
            "error": result.error,
            "duration_ms": result.duration_ms,
        }

    def get_node_output(self, node_id: str) -> dict:
        """Get a specific node's output. Returns empty dict if not found."""
        if node_id in self._nodes:
            return self._nodes[node_id].get("output", {})
        return {}

    def get_node_status(self, node_id: str) -> str | None:
        """Get a specific node's status. Returns None if not executed yet."""
        if node_id in self._nodes:
            return self._nodes[node_id].get("status")
        return None

    def to_dict(self) -> dict:
        """Serialize the full context to a dict (for storing in database)."""
        return {
            "trigger": self._trigger,
            "nodes": self._nodes,
            "metadata": {
                "run_id": self.run_id,
                "workflow_id": self.workflow_id,
                "started_at": self.started_at,
            },
        }

    def resolve_template(self, template: str) -> str:
        """
        Resolve all {{ expression }} placeholders in a template string
        using data from the execution context.

        Supported expressions:
            {{ trigger.output.field_name }}
            {{ trigger.output.nested.field }}
            {{ nodes.node_id.output.field_name }}

        If a referenced path doesn't exist, the placeholder is replaced
        with an empty string and a warning is logged.
        """

        def replace_match(match: re.Match) -> str:
            expression = match.group(1).strip()
            try:
                value = self._resolve_expression(expression)
                # Convert non-string values to their string representation
                if isinstance(value, (dict, list)):
                    import json

                    return json.dumps(value)
                return str(value)
            except (KeyError, IndexError, TypeError) as e:
                logger.warning(
                    "template_resolution_failed",
                    expression=expression,
                    error=str(e),
                    run_id=self.run_id,
                )
                return ""

        return TEMPLATE_PATTERN.sub(replace_match, template)

    def resolve_template_deep(self, obj: Any) -> Any:
        """
        Recursively resolve templates in a nested structure.

        Works on strings, dicts, and lists. Non-string/non-container
        values are returned unchanged.
        """
        if isinstance(obj, str):
            return self.resolve_template(obj)
        elif isinstance(obj, dict):
            return {
                key: self.resolve_template_deep(value) for key, value in obj.items()
            }
        elif isinstance(obj, list):
            return [self.resolve_template_deep(item) for item in obj]
        return obj

    def _resolve_expression(self, expression: str) -> Any:
        """
        Resolve a dot-notation expression against the context data.

        Examples:
            "trigger.output.webhook_body.message"
            "nodes.node_2.output.classification"
        """
        parts = expression.split(".")
        if not parts:
            raise KeyError("Empty expression")

        root = parts[0]

        if root == "trigger":
            return self._walk_path(self._trigger, parts[1:])
        elif root == "nodes":
            if len(parts) < 2:
                raise KeyError("Node expression requires node_id: nodes.<node_id>....")
            node_id = parts[1]
            if node_id not in self._nodes:
                raise KeyError(f"Node '{node_id}' has not been executed yet")
            return self._walk_path(self._nodes[node_id], parts[2:])
        else:
            raise KeyError(f"Unknown root '{root}'. Expected 'trigger' or 'nodes'")

    @staticmethod
    def _walk_path(data: Any, path: list[str]) -> Any:
        """
        Walk a dot-notation path through nested dicts.

        _walk_path({"a": {"b": {"c": 42}}}, ["a", "b", "c"]) -> 42
        """
        current = data
        for key in path:
            if isinstance(current, dict):
                if key not in current:
                    raise KeyError(f"Key '{key}' not found in {list(current.keys())}")
                current = current[key]
            else:
                raise TypeError(
                    f"Cannot access '{key}' on non-dict value: {type(current).__name__}"
                )
        return current
