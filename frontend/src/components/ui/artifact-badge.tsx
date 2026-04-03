// frontend/src/components/ui/artifact-badge.tsx

"use client";

import { useState } from "react";
import { Download, FileJson, Loader2, ExternalLink } from "lucide-react";
import api from "@/lib/api";

interface ArtifactBadgeProps {
  artifactKey: string;
  sizeBytes: number;
}

export default function ArtifactBadge({
  artifactKey,
  sizeBytes,
}: ArtifactBadgeProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const formattedSize = formatBytes(sizeBytes);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/api/artifacts/url", {
        params: { key: artifactKey },
      });
      const url = response.data.download_url;

      // Open the download URL in a new tab
      window.open(url, "_blank");
    } catch {
      // Fallback to direct download
      try {
        const response = await api.get("/api/artifacts/download", {
          params: { key: artifactKey },
        });
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = artifactKey.split("/").pop() || "output.json";
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        alert("Failed to download artifact");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async () => {
    if (previewData) {
      setShowPreview(!showPreview);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get("/api/artifacts/download", {
        params: { key: artifactKey },
      });
      setPreviewData(response.data);
      setShowPreview(true);
    } catch {
      alert("Failed to load artifact preview");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Artifact info bar */}
      <div
        className="flex items-center gap-3 p-3 rounded-lg"
        style={{
          backgroundColor: "rgba(59, 130, 246, 0.05)",
          border: "1px solid rgba(59, 130, 246, 0.15)",
        }}
      >
        <FileJson size={16} style={{ color: "var(--accent-blue)" }} />

        <div className="flex-1">
          <p
            className="text-xs font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Large output stored as artifact
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {formattedSize}
          </p>
        </div>

        <button
          onClick={handlePreview}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-color)",
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <ExternalLink size={12} />
          )}
          {showPreview ? "Hide" : "Preview"}
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
          style={{
            backgroundColor: "var(--accent-blue)",
            color: "white",
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Download size={12} />
          )}
          Download
        </button>
      </div>

      {/* Preview panel */}
      {showPreview && previewData && (
        <pre
          className="mt-2 p-4 rounded-lg text-xs max-h-64 overflow-y-auto"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-color)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            overflowWrap: "break-word",
            maxWidth: "100%",
          }}
        >
          {JSON.stringify(previewData, null, 2).slice(0, 5000)}
          {JSON.stringify(previewData, null, 2).length > 5000 &&
            "\n\n... (truncated)"}
        </pre>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
