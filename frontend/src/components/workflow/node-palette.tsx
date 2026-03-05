// frontend/src/components/workflow/node-palette.tsx

"use client";

import { Zap, Brain, Send } from "lucide-react";

const nodeTypes = [
  {
    type: "trigger",
    label: "Trigger",
    description: "Starts the workflow",
    icon: Zap,
    color: "var(--node-trigger)",
    bgColor: "rgba(59, 130, 246, 0.15)",
  },
  {
    type: "ai",
    label: "AI Task",
    description: "Process with LLM",
    icon: Brain,
    color: "var(--node-ai)",
    bgColor: "rgba(139, 92, 246, 0.15)",
  },
  {
    type: "action",
    label: "Action",
    description: "Call external API",
    icon: Send,
    color: "var(--node-action)",
    bgColor: "rgba(34, 197, 94, 0.15)",
  },
];

export default function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/synthflow-node", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className="w-56 border-r p-4 space-y-2"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border-color)",
      }}
    >
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        Nodes
      </h3>

      {nodeTypes.map((node) => (
        <div
          key={node.type}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-colors"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-color)",
          }}
          draggable
          onDragStart={(e) => onDragStart(e, node.type)}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = node.color)}
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = "var(--border-color)")
          }
        >
          <div
            className="flex items-center justify-center w-8 h-8 rounded-md flex-shrink-0"
            style={{ backgroundColor: node.bgColor }}
          >
            <node.icon size={15} style={{ color: node.color }} />
          </div>
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {node.label}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {node.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
