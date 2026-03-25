// frontend/src/components/ui/copy-button.tsx

"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
}

export default function CopyButton({ text, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
      style={{
        backgroundColor: copied
          ? "rgba(34, 197, 94, 0.1)"
          : "var(--bg-tertiary)",
        color: copied ? "var(--accent-green)" : "var(--text-secondary)",
        border: `1px solid ${copied ? "rgba(34, 197, 94, 0.3)" : "var(--border-color)"}`,
      }}
      title={copied ? "Copied!" : `Copy ${label || "to clipboard"}`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied!" : label || "Copy"}
    </button>
  );
}
