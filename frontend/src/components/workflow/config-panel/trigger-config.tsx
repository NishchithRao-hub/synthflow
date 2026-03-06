// frontend/src/components/workflow/config-panel/trigger-config.tsx

"use client";

import Input from "@/components/ui/input";

interface TriggerConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export default function TriggerConfig({
  config,
  onChange,
}: TriggerConfigProps) {
  const subtype = (config.subtype as string) || "webhook";

  return (
    <div className="space-y-4">
      {/* Trigger type selector */}
      <div className="space-y-1.5">
        <label
          className="block text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Trigger Type
        </label>
        <select
          value={subtype}
          onChange={(e) => onChange({ ...config, subtype: e.target.value })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }}
        >
          <option value="webhook">Webhook</option>
          <option value="manual">Manual Trigger</option>
          <option value="schedule">Scheduled (Cron)</option>
        </select>
      </div>

      {/* Webhook-specific config */}
      {subtype === "webhook" && (
        <div
          className="p-3 rounded-lg text-xs"
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.05)",
            border: "1px solid rgba(59, 130, 246, 0.15)",
            color: "var(--text-secondary)",
          }}
        >
          A unique webhook URL will be generated when the workflow is saved.
          External services can POST JSON data to this URL to trigger the
          workflow.
        </div>
      )}

      {/* Schedule-specific config */}
      {subtype === "schedule" && (
        <Input
          label="Cron Expression"
          placeholder="e.g., 0 */6 * * * (every 6 hours)"
          value={(config.cron_expression as string) || ""}
          onChange={(e) =>
            onChange({ ...config, cron_expression: e.target.value })
          }
        />
      )}

      {/* Manual trigger info */}
      {subtype === "manual" && (
        <div
          className="p-3 rounded-lg text-xs"
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.05)",
            border: "1px solid rgba(59, 130, 246, 0.15)",
            color: "var(--text-secondary)",
          }}
        >
          This workflow will be triggered manually from the dashboard or via the
          Execute API endpoint. You can pass input data at execution time.
        </div>
      )}
    </div>
  );
}
