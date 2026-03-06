// frontend/src/components/workflow/config-panel/action-config.tsx

"use client";

import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";

interface ActionConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export default function ActionConfig({ config, onChange }: ActionConfigProps) {
  const method = (config.method as string) || "POST";

  return (
    <div className="space-y-4">
      {/* HTTP Method */}
      <div className="space-y-1.5">
        <label
          className="block text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          HTTP Method
        </label>
        <select
          value={method}
          onChange={(e) => onChange({ ...config, method: e.target.value })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      {/* URL */}
      <Input
        label="URL"
        placeholder="https://hooks.slack.com/services/T.../B.../xxx"
        value={(config.url as string) || ""}
        onChange={(e) => onChange({ ...config, url: e.target.value })}
      />

      {/* Headers */}
      <Textarea
        label="Headers (JSON)"
        placeholder='{"Content-Type": "application/json", "Authorization": "Bearer ..."}'
        value={
          (config.headers as string) || '{"Content-Type": "application/json"}'
        }
        onChange={(e) => onChange({ ...config, headers: e.target.value })}
        rows={3}
      />

      {/* Body template (for POST/PUT/PATCH) */}
      {["POST", "PUT", "PATCH"].includes(method) && (
        <Textarea
          label="Body Template (JSON)"
          placeholder={
            '{"text": "New ticket: {{ nodes.node_2.output.summary }}"}'
          }
          value={(config.body_template as string) || ""}
          onChange={(e) =>
            onChange({ ...config, body_template: e.target.value })
          }
          rows={5}
        />
      )}

      {/* Template variables hint */}
      <div
        className="p-3 rounded-lg text-xs space-y-1"
        style={{
          backgroundColor: "rgba(34, 197, 94, 0.05)",
          border: "1px solid rgba(34, 197, 94, 0.15)",
          color: "var(--text-secondary)",
        }}
      >
        <p className="font-medium" style={{ color: "var(--text-primary)" }}>
          Template variables:
        </p>
        <p>
          Use {"{{ }}"} syntax in URL, headers, and body to reference data from
          upstream nodes.
        </p>
      </div>

      {/* Timeout */}
      <Input
        label="Timeout (seconds)"
        type="number"
        value={(config.timeout_seconds as number) || 10}
        onChange={(e) =>
          onChange({
            ...config,
            timeout_seconds: parseInt(e.target.value) || 10,
          })
        }
      />

      {/* Retry count */}
      <Input
        label="Retry Count"
        type="number"
        value={(config.retry_count as number) || 3}
        onChange={(e) =>
          onChange({ ...config, retry_count: parseInt(e.target.value) || 3 })
        }
      />
    </div>
  );
}
