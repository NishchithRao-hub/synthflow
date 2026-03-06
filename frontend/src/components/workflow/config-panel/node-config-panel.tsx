// frontend/src/components/workflow/config-panel/node-config-panel.tsx

"use client";

import type { Node } from "@xyflow/react";
import { X, Zap, Brain, Send, Trash2 } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import TriggerConfig from "./trigger-config";
import AIConfig from "./ai-config";
import ActionConfig from "./action-config";

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

const nodeTypeInfo: Record<
  string,
  { label: string; icon: typeof Zap; color: string }
> = {
  trigger: { label: "Trigger", icon: Zap, color: "var(--node-trigger)" },
  ai: { label: "AI Task", icon: Brain, color: "var(--node-ai)" },
  action: { label: "Action", icon: Send, color: "var(--node-action)" },
};

export default function NodeConfigPanel({
  node,
  onUpdate,
  onDelete,
  onClose,
}: NodeConfigPanelProps) {
  const nodeInfo = nodeTypeInfo[node.type || "trigger"];
  const Icon = nodeInfo?.icon || Zap;
  const data = node.data as Record<string, unknown>;
  const config = (data.config as Record<string, unknown>) || {};

  const handleLabelChange = (label: string) => {
    onUpdate(node.id, { ...data, label });
  };

  const handleConfigChange = (newConfig: Record<string, unknown>) => {
    // If subtype changed in config, also update it at the data level
    const subtype = newConfig.subtype || data.subtype;
    onUpdate(node.id, { ...data, config: newConfig, subtype });
  };

  return (
    <div
      className="w-80 border-l h-full flex flex-col overflow-hidden"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-md"
            style={{ backgroundColor: `${nodeInfo?.color}20` }}
          >
            <Icon size={14} style={{ color: nodeInfo?.color }} />
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {nodeInfo?.label || "Node"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {node.id}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--bg-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Node label */}
        <Input
          label="Label"
          value={(data.label as string) || ""}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="Node name"
        />

        {/* Divider */}
        <div
          className="border-t"
          style={{ borderColor: "var(--border-color)" }}
        />

        {/* Type-specific config */}
        <h3
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Configuration
        </h3>

        {node.type === "trigger" && (
          <TriggerConfig
            config={{ ...config, subtype: data.subtype }}
            onChange={handleConfigChange}
          />
        )}
        {node.type === "ai" && (
          <AIConfig
            config={{ ...config, subtype: data.subtype }}
            onChange={handleConfigChange}
          />
        )}
        {node.type === "action" && (
          <ActionConfig
            config={{ ...config, subtype: data.subtype }}
            onChange={handleConfigChange}
          />
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t flex-shrink-0"
        style={{ borderColor: "var(--border-color)" }}
      >
        <Button
          variant="danger"
          size="sm"
          className="w-full"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 size={14} />
          Delete Node
        </Button>
      </div>
    </div>
  );
}
