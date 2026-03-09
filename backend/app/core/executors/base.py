# backend/app/core/executors/base.py

import time
from abc import ABC, abstractmethod

import structlog

from app.core.execution_context import ExecutionContext, NodeResult

logger = structlog.get_logger()


class NodeExecutor(ABC):
    """
    Abstract base class for all node executors.

    Every node type (trigger, ai, action) implements this interface.
    The execute() method receives the node's config and the accumulated
    execution context, and returns a NodeResult.
    """

    @abstractmethod
    async def run(self, node_config: dict, context: ExecutionContext) -> NodeResult:
        """
        Execute the node's logic.

        Args:
            node_config: The node's configuration dict from graph_data
            context: The accumulated execution context with all prior outputs

        Returns:
            NodeResult with status, output, and optional error
        """
        pass

    async def execute(
        self,
        node_id: str,
        node_type: str,
        node_config: dict,
        context: ExecutionContext,
    ) -> NodeResult:
        """
        Wrapper that handles timing, logging, and error catching.

        This is what the orchestrator calls. It delegates to run()
        which subclasses implement.
        """
        logger.info(
            "node_execution_started",
            node_id=node_id,
            node_type=node_type,
            run_id=context.run_id,
        )

        start_time = time.perf_counter()

        try:
            # Resolve any templates in the node config before passing to run()
            resolved_config = context.resolve_template_deep(node_config)

            result = await self.run(resolved_config, context)
            result.duration_ms = round((time.perf_counter() - start_time) * 1000)

            logger.info(
                "node_execution_completed",
                node_id=node_id,
                node_type=node_type,
                status=result.status,
                duration_ms=result.duration_ms,
                run_id=context.run_id,
            )

            return result

        except Exception as e:
            duration_ms = round((time.perf_counter() - start_time) * 1000)

            logger.error(
                "node_execution_failed",
                node_id=node_id,
                node_type=node_type,
                error=str(e),
                duration_ms=duration_ms,
                run_id=context.run_id,
            )

            return NodeResult(
                status="failed",
                error=str(e),
                duration_ms=duration_ms,
            )
