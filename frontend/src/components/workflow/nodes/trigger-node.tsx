// frontend/src/components/workflow/nodes/trigger-node.tsx

"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap } from "lucide-react";

function TriggerNode({ data, selected }: NodeProps) {
  return (
    <div
      className="rounded-xl border-2 px-4 py-3 min-w-[180px]"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: selected ? "var(--node-trigger)" : "var(--border-color)",
        boxShadow: selected ? "0 0 0 2px rgba(59, 130, 246, 0.2)" : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div
          className="flex items-center justify-center w-6 h-6 rounded-md"
          style={{ backgroundColor: "rgba(59, 130, 246, 0.15)" }}
        >
          <Zap size={13} style={{ color: "var(--node-trigger)" }} />
        </div>
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--node-trigger)" }}
        >
          TRIGGER
        </span>
      </div>

      {/* Label */}
      <p
        className="text-sm font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {((data as Record<string, unknown>)?.label as string) || "Webhook"}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
        {((data as Record<string, unknown>)?.subtype as string) || "webhook"}
      </p>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          backgroundColor: "var(--node-trigger)",
          border: "2px solid var(--bg-card)",
        }}
      />
    </div>
  );
}

export default memo(TriggerNode);
