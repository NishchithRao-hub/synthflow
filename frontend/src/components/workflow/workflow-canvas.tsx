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

// Register custom node types
const nodeTypes = {
  trigger: TriggerNode,
  ai: AINode,
  action: ActionNode,
};

// Default data for each node type when dropped
const defaultNodeData: Record<string, Record<string, unknown>> = {
  trigger: { label: "Webhook", subtype: "webhook", config: {} },
  ai: { label: "AI Task", subtype: "classify", config: {} },
  action: { label: "HTTP Request", subtype: "http_request", config: {} },
};

interface WorkflowCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onNodeSelect?: (node: Node | null) => void;
}

let nodeId = 0;
const getNextNodeId = () => `node_${++nodeId}`;

export default function WorkflowCanvas({
  initialNodes = [],
  initialEdges = [],
  onNodesChange: onNodesChangeCallback,
  onEdgesChange: onEdgesChangeCallback,
  onNodeSelect,
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Notify parent of changes
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      // We need to use a timeout to get the updated nodes after state update
      setTimeout(() => {
        onNodesChangeCallback?.(nodes);
      }, 0);
    },
    [onNodesChange, onNodesChangeCallback, nodes],
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      setTimeout(() => {
        onEdgesChangeCallback?.(edges);
      }, 0);
    },
    [onEdgesChange, onEdgesChangeCallback, edges],
  );

  // Connect two nodes
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            style: { stroke: "var(--border-hover)", strokeWidth: 2 },
            animated: true,
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  // Handle drag over for drop target
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Handle drop from palette
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

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes],
  );

  // Handle node click for selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect?.(node);
    },
    [onNodeSelect],
  );

  // Handle pane click to deselect
  const onPaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  // Handle node delete via backspace/delete key
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Backspace" || event.key === "Delete") {
        setNodes((nds) => nds.filter((n) => !n.selected));
        setEdges((eds) => eds.filter((e) => !e.selected));
        onNodeSelect?.(null);
      }
    },
    [setNodes, setEdges, onNodeSelect],
  );

  return (
    <div className="flex h-full">
      {/* Node palette sidebar */}
      <NodePalette />

      {/* Canvas */}
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
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
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
    </div>
  );
}
