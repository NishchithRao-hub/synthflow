// frontend/src/components/workflow/nodes/ai-node.tsx

"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Brain } from "lucide-react";

function AINode({ data, selected }: NodeProps) {
  const label =
    ((data as Record<string, unknown>)?.label as string) || "AI Task";
  const subtype =
    ((data as Record<string, unknown>)?.subtype as string) || "classify";

  return (
    <div
      className="rounded-xl border-2 px-4 py-3 min-w-[180px]"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: selected ? "var(--node-ai)" : "var(--border-color)",
        boxShadow: selected ? "0 0 0 2px rgba(139, 92, 246, 0.2)" : "none",
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 10,
          height: 10,
          backgroundColor: "var(--node-ai)",
          border: "2px solid var(--bg-card)",
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-md"
          style={{ backgroundColor: "rgba(139, 92, 246, 0.15)" }}
        >
          <Brain size={13} style={{ color: "var(--node-ai)" }} />
        </div>
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--node-ai)" }}
        >
          AI TASK
        </span>
      </div>

      {/* Label */}
      <p
        className="text-sm font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
        {subtype}
      </p>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          backgroundColor: "var(--node-ai)",
          border: "2px solid var(--bg-card)",
        }}
      />
    </div>
  );
}

export default memo(AINode);
