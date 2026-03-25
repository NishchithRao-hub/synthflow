// frontend/src/components/workflow/webhook-url-bar.tsx

"use client";

import { Globe } from "lucide-react";
import CopyButton from "@/components/ui/copy-button";

interface WebhookUrlBarProps {
  workflowId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function WebhookUrlBar({ workflowId }: WebhookUrlBarProps) {
  const webhookUrl = `${API_URL}/webhooks/${workflowId}`;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 border-b"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border-color)",
      }}
    >
      <div className="flex items-center gap-2">
        <Globe size={14} style={{ color: "var(--accent-green)" }} />
        <span
          className="text-xs font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          Webhook URL
        </span>
      </div>

      <div
        className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md overflow-hidden"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          border: "1px solid var(--border-color)",
        }}
      >
        <code
          className="text-xs truncate flex-1"
          style={{ color: "var(--text-secondary)" }}
        >
          {webhookUrl}
        </code>
        <CopyButton text={webhookUrl} label="Copy URL" />
      </div>

      <span
        className="text-xs px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          color: "var(--accent-green)",
        }}
      >
        Public
      </span>
    </div>
  );
}
