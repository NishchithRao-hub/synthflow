# backend/app/core/executors/trigger_executor.py

from app.core.execution_context import ExecutionContext, NodeResult
from app.core.executors.base import NodeExecutor


class TriggerExecutor(NodeExecutor):
    """
    Executor for trigger nodes.

    The trigger node doesn't perform any processing — it simply
    passes through the input data that initiated the workflow run
    (webhook body, manual input, etc.).

    The trigger's output is already set in the ExecutionContext
    before execution begins, so this executor just returns success.
    """

    async def run(self, node_config: dict, context: ExecutionContext) -> NodeResult:
        # The trigger output is already in the context (set by the orchestrator)
        # We just confirm execution succeeded
        trigger_data = context.to_dict().get("trigger", {})
        output = trigger_data.get("output", {})

        return NodeResult(
            status="completed",
            output=output,
        )
