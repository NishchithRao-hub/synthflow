# backend/app/core/dag.py

from collections import defaultdict

from app.core.exceptions import BadRequestException


class DAGValidationError(BadRequestException):
    """Raised when a workflow graph fails validation."""

    def __init__(self, message: str):
        super().__init__(message=f"Workflow validation failed: {message}")


def validate_workflow_graph(graph_data: dict) -> None:
    """
    Validate that a workflow graph is a valid DAG suitable for execution.

    Checks:
    1. Graph has at least one node
    2. Exactly one trigger node exists
    3. Trigger node has no incoming edges (is a root)
    4. All edges reference existing nodes
    5. No orphan nodes (except trigger, all nodes must be reachable)
    6. No cycles (the graph is acyclic)

    Raises DAGValidationError with a descriptive message if any check fails.
    """
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])

    # --- Check 1: At least one node ---
    if not nodes:
        raise DAGValidationError("Workflow must have at least one node")

    # Build lookup structures
    node_ids = {node["id"] for node in nodes}
    node_types = {node["id"]: node.get("type", "") for node in nodes}

    # --- Check 2: Exactly one trigger node ---
    trigger_nodes = [nid for nid, ntype in node_types.items() if ntype == "trigger"]

    if len(trigger_nodes) == 0:
        raise DAGValidationError("Workflow must have exactly one trigger node")
    if len(trigger_nodes) > 1:
        raise DAGValidationError(
            f"Workflow must have exactly one trigger node, found {len(trigger_nodes)}: "
            f"{', '.join(trigger_nodes)}"
        )

    trigger_id = trigger_nodes[0]

    # --- Check 3: All edges reference existing nodes ---
    for edge in edges:
        source = edge.get("source", "")
        target = edge.get("target", "")

        if source not in node_ids:
            raise DAGValidationError(
                f"Edge references non-existent source node: '{source}'"
            )
        if target not in node_ids:
            raise DAGValidationError(
                f"Edge references non-existent target node: '{target}'"
            )
        if source == target:
            raise DAGValidationError(f"Self-loop detected on node: '{source}'")

    # Build adjacency structures
    incoming = defaultdict(set)  # node_id -> set of nodes that point TO it
    outgoing = defaultdict(set)  # node_id -> set of nodes it points TO

    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        outgoing[source].add(target)
        incoming[target].add(source)

    # --- Check 4: Trigger node has no incoming edges ---
    if incoming[trigger_id]:
        raise DAGValidationError(
            f"Trigger node '{trigger_id}' must not have incoming edges, "
            f"but receives edges from: {', '.join(incoming[trigger_id])}"
        )

    # --- Check 5: All non-trigger nodes are reachable from trigger ---
    reachable = set()
    stack = [trigger_id]
    while stack:
        current = stack.pop()
        if current in reachable:
            continue
        reachable.add(current)
        for neighbor in outgoing[current]:
            if neighbor not in reachable:
                stack.append(neighbor)

    unreachable = node_ids - reachable
    if unreachable:
        raise DAGValidationError(
            f"The following nodes are not reachable from the trigger: "
            f"{', '.join(unreachable)}. All nodes must be connected to the workflow."
        )

    # --- Check 6: No cycles (DFS-based cycle detection) ---
    _detect_cycles(node_ids, outgoing)


def _detect_cycles(node_ids: set, outgoing: dict) -> None:
    """
    Detect cycles using DFS with three-color marking.

    WHITE (unvisited) -> GRAY (in current path) -> BLACK (fully processed)
    If we encounter a GRAY node during DFS, we've found a cycle.
    """
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {nid: WHITE for nid in node_ids}

    def dfs(node: str, path: list) -> None:
        color[node] = GRAY
        path.append(node)

        for neighbor in outgoing.get(node, set()):
            if color[neighbor] == GRAY:
                # Found a cycle — extract the cycle path for the error message
                cycle_start = path.index(neighbor)
                cycle = path[cycle_start:] + [neighbor]
                cycle_str = " -> ".join(cycle)
                raise DAGValidationError(f"Cycle detected: {cycle_str}")
            if color[neighbor] == WHITE:
                dfs(neighbor, path)

        path.pop()
        color[node] = BLACK

    for node in node_ids:
        if color[node] == WHITE:
            dfs(node, [])


def topological_sort(graph_data: dict) -> list[str]:
    """
    Perform a topological sort on the workflow graph using Kahn's algorithm.

    Returns a list of node IDs in execution order, where every node appears
    after all of its dependencies.

    This should only be called AFTER validate_workflow_graph() has passed,
    as it assumes the graph is a valid DAG.

    The algorithm:
    1. Calculate in-degree (number of incoming edges) for each node
    2. Start with all nodes that have in-degree 0 (the trigger)
    3. Process each node: decrement in-degree of its neighbors
    4. When a neighbor's in-degree reaches 0, add it to the queue
    5. Repeat until all nodes are processed
    """
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])

    node_ids = {node["id"] for node in nodes}

    # Build adjacency list and in-degree count
    outgoing = defaultdict(list)
    in_degree = {nid: 0 for nid in node_ids}

    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        outgoing[source].append(target)
        in_degree[target] += 1

    # Start with nodes that have no incoming edges (in-degree 0)
    queue = [nid for nid in node_ids if in_degree[nid] == 0]
    # Sort for deterministic ordering when multiple nodes have same in-degree
    queue.sort()

    execution_order = []

    while queue:
        # Process the first node in the queue
        current = queue.pop(0)
        execution_order.append(current)

        # Reduce in-degree of all neighbors
        for neighbor in sorted(outgoing[current]):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
        # Keep queue sorted for deterministic order
        queue.sort()

    # Safety check — if we didn't process all nodes, there's a cycle
    # (This shouldn't happen if validate_workflow_graph was called first)
    if len(execution_order) != len(node_ids):
        processed = set(execution_order)
        stuck = node_ids - processed
        raise DAGValidationError(
            f"Could not determine execution order. Stuck nodes: {', '.join(stuck)}"
        )

    return execution_order


def get_execution_levels(graph_data: dict) -> list[list[str]]:
    """
    Group nodes into execution levels. Nodes within the same level have
    no dependencies on each other and could theoretically execute in parallel.

    Returns a list of levels, where each level is a list of node IDs.

    Example for: trigger -> ai -> [action_1, action_2]
    Returns: [["trigger"], ["ai"], ["action_1", "action_2"]]

    This is useful for understanding the parallelism potential of a workflow
    and for displaying execution progress in the UI.
    """
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])

    node_ids = {node["id"] for node in nodes}

    outgoing = defaultdict(list)
    in_degree = {nid: 0 for nid in node_ids}

    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        outgoing[source].append(target)
        in_degree[target] += 1

    # Start with in-degree 0 nodes
    current_level = sorted([nid for nid in node_ids if in_degree[nid] == 0])
    levels = []

    while current_level:
        levels.append(current_level)
        next_level = []

        for node in current_level:
            for neighbor in outgoing[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    next_level.append(neighbor)

        current_level = sorted(next_level)

    return levels
