// frontend/src/components/workflow/workflow-canvas.tsx

"use client";

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import TriggerNode from "./nodes/trigger-node";
import AINode from "./nodes/ai-node";
import ActionNode from "./nodes/action-node";
import NodePalette from "./node-palette";
import NodeConfigPanel from "./config-panel/node-config-panel";

const nodeTypes = {
  trigger: TriggerNode,
  ai: AINode,
  action: ActionNode,
};

const defaultNodeData: Record<string, Record<string, unknown>> = {
  trigger: { label: "Webhook", subtype: "webhook", config: {} },
  ai: { label: "AI Task", subtype: "classify", config: {} },
  action: { label: "HTTP Request", subtype: "http_request", config: {} },
};

interface WorkflowCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onGraphChange?: (nodes: Node[], edges: Edge[]) => void;
}

let nodeId = 0;
const getNextNodeId = () => `node_${++nodeId}`;

export default function WorkflowCanvas({
  initialNodes = [],
  initialEdges = [],
  onGraphChange,
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Notify parent of graph changes
  const notifyChange = useCallback(
    (updatedNodes: Node[], updatedEdges: Edge[]) => {
      onGraphChange?.(updatedNodes, updatedEdges);
    },
    [onGraphChange],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge(
          {
            ...params,
            style: { stroke: "var(--border-hover)", strokeWidth: 2 },
            animated: true,
          },
          eds,
        );
        setTimeout(() => notifyChange(nodes, newEdges), 0);
        return newEdges;
      });
    },
    [setEdges, nodes, notifyChange],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/synthflow-node");
      if (!type || !reactFlowInstance || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNode: Node = {
        id: getNextNodeId(),
        type,
        position,
        data: { ...defaultNodeData[type] },
      };

      setNodes((nds) => {
        const updated = [...nds, newNode];
        setTimeout(() => notifyChange(updated, edges), 0);
        return updated;
      });
    },
    [reactFlowInstance, setNodes, edges, notifyChange],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Update node data from config panel
  const handleNodeUpdate = useCallback(
    (nodeId: string, newData: Record<string, unknown>) => {
      setNodes((nds) => {
        const updated = nds.map((n) =>
          n.id === nodeId ? { ...n, data: newData } : n,
        );
        // Update selectedNode to reflect changes
        const updatedNode = updated.find((n) => n.id === nodeId);
        if (updatedNode) setSelectedNode(updatedNode);
        setTimeout(() => notifyChange(updated, edges), 0);
        return updated;
      });
    },
    [setNodes, edges, notifyChange],
  );

  // Delete node from config panel
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => {
        const updated = nds.filter((n) => n.id !== nodeId);
        setTimeout(() => notifyChange(updated, edges), 0);
        return updated;
      });
      setEdges((eds) => {
        const updated = eds.filter(
          (e) => e.source !== nodeId && e.target !== nodeId,
        );
        setTimeout(() => notifyChange(nodes, updated), 0);
        return updated;
      });
      setSelectedNode(null);
    },
    [setNodes, setEdges, nodes, edges, notifyChange],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Backspace" || event.key === "Delete") {
        const selectedNodes = nodes.filter((n) => n.selected);
        if (selectedNodes.length > 0) {
          const selectedIds = new Set(selectedNodes.map((n) => n.id));
          setNodes((nds) => nds.filter((n) => !n.selected));
          setEdges((eds) =>
            eds.filter(
              (e) => !selectedIds.has(e.source) && !selectedIds.has(e.target),
            ),
          );
          setSelectedNode(null);
        }
      }
    },
    [nodes, setNodes, setEdges],
  );

  return (
    <div className="flex h-full">
      <NodePalette />

      <div
        ref={reactFlowWrapper}
        className="flex-1"
        style={{ backgroundColor: "var(--bg-primary)" }}
        onKeyDown={onKeyDown}
        tabIndex={0}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            style: { stroke: "var(--border-hover)", strokeWidth: 2 },
            animated: true,
          }}
          style={{ backgroundColor: "var(--bg-primary)" }}
        >
          <Controls
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
              borderRadius: "8px",
            }}
          />
          <MiniMap
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "8px",
            }}
            nodeColor={(node) => {
              switch (node.type) {
                case "trigger":
                  return "var(--node-trigger)";
                case "ai":
                  return "var(--node-ai)";
                case "action":
                  return "var(--node-action)";
                default:
                  return "var(--text-muted)";
              }
            }}
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="var(--border-color)"
          />
        </ReactFlow>
      </div>

      {/* Config panel */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={handleNodeUpdate}
          onDelete={handleNodeDelete}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
