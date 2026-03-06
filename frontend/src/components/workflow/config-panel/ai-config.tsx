// frontend/src/components/workflow/config-panel/ai-config.tsx

"use client";

import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";

interface AIConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export default function AIConfig({ config, onChange }: AIConfigProps) {
  const subtype = (config.subtype as string) || "classify";

  return (
    <div className="space-y-4">
      {/* AI task type */}
      <div className="space-y-1.5">
        <label
          className="block text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Task Type
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
          <option value="classify">Classification</option>
          <option value="summarize">Summarization</option>
          <option value="extract">Data Extraction</option>
          <option value="custom">Custom Prompt</option>
        </select>
      </div>

      {/* Model selection */}
      <div className="space-y-1.5">
        <label
          className="block text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Model
        </label>
        <select
          value={(config.model as string) || "ollama/mistral"}
          onChange={(e) => onChange({ ...config, model: e.target.value })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }}
        >
          <option value="ollama/mistral">Ollama — Mistral 7B</option>
          <option value="ollama/phi3:mini">Ollama — Phi-3 Mini</option>
          <option value="ollama/llama3">Ollama — Llama 3</option>
          <option value="openai/gpt-4o-mini">
            OpenAI — GPT-4o Mini (BYOK)
          </option>
        </select>
      </div>

      {/* Prompt template */}
      <Textarea
        label="Prompt Template"
        placeholder={getPromptPlaceholder(subtype)}
        value={(config.prompt_template as string) || ""}
        onChange={(e) =>
          onChange({ ...config, prompt_template: e.target.value })
        }
        rows={6}
      />

      {/* Template variables hint */}
      <div
        className="p-3 rounded-lg text-xs space-y-1"
        style={{
          backgroundColor: "rgba(139, 92, 246, 0.05)",
          border: "1px solid rgba(139, 92, 246, 0.15)",
          color: "var(--text-secondary)",
        }}
      >
        <p className="font-medium" style={{ color: "var(--text-primary)" }}>
          Available variables:
        </p>
        <p>
          <code
            className="px-1 py-0.5 rounded text-xs"
            style={{ backgroundColor: "var(--bg-tertiary)" }}
          >
            {"{{ trigger.output.* }}"}
          </code>
          {" — data from the trigger"}
        </p>
        <p>
          <code
            className="px-1 py-0.5 rounded text-xs"
            style={{ backgroundColor: "var(--bg-tertiary)" }}
          >
            {"{{ nodes.<node_id>.output.* }}"}
          </code>
          {" — output from a previous node"}
        </p>
      </div>

      {/* Timeout */}
      <Input
        label="Timeout (seconds)"
        type="number"
        value={(config.timeout_seconds as number) || 30}
        onChange={(e) =>
          onChange({
            ...config,
            timeout_seconds: parseInt(e.target.value) || 30,
          })
        }
      />
    </div>
  );
}

function getPromptPlaceholder(subtype: string): string {
  switch (subtype) {
    case "classify":
      return 'Classify the following text into one of these categories: bug, feature, question.\n\nText: {{ trigger.output.webhook_body.message }}\n\nRespond with JSON: {"classification": "...", "confidence": 0.0}';
    case "summarize":
      return "Summarize the following content in 3 bullet points:\n\n{{ trigger.output.webhook_body.content }}";
    case "extract":
      return 'Extract the following fields from the text: name, email, phone.\n\nText: {{ trigger.output.webhook_body.message }}\n\nRespond with JSON: {"name": "...", "email": "...", "phone": "..."}';
    case "custom":
      return "Enter your custom prompt here. Use {{ }} for template variables.";
    default:
      return "";
  }
}
