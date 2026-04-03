// frontend/src/app/workflows/[id]/runs/[runId]/page.tsx

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useWorkflow } from "@/hooks/use-workflow";
import { useRunDetail, type RunDetail } from "@/hooks/use-run-detail";
import AppLayout from "@/components/layout/app-layout";
import Button from "@/components/ui/button";
import ArtifactBadge from "@/components/ui/artifact-badge";

import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Timer,
  SkipForward,
  Webhook,
  Play,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";

const statusConfig: Record<
  string,
  { icon: typeof CheckCircle2; color: string; bgColor: string; label: string }
> = {
  pending: {
    icon: Clock,
    color: "var(--text-muted)",
    bgColor: "rgba(107, 107, 128, 0.1)",
    label: "Pending",
  },
  running: {
    icon: Loader2,
    color: "var(--accent-blue)",
    bgColor: "rgba(59, 130, 246, 0.1)",
    label: "Running",
  },
  completed: {
    icon: CheckCircle2,
    color: "var(--accent-green)",
    bgColor: "rgba(34, 197, 94, 0.1)",
    label: "Completed",
  },
  failed: {
    icon: XCircle,
    color: "var(--accent-red)",
    bgColor: "rgba(239, 68, 68, 0.1)",
    label: "Failed",
  },
  timed_out: {
    icon: Timer,
    color: "var(--accent-red)",
    bgColor: "rgba(239, 68, 68, 0.1)",
    label: "Timed Out",
  },
  skipped: {
    icon: SkipForward,
    color: "var(--accent-orange)",
    bgColor: "rgba(249, 115, 22, 0.1)",
    label: "Skipped",
  },
};

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const runId = params.runId as string;
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();

  const { data: workflow } = useWorkflow(workflowId, isAuthenticated);
  const { data: run, isLoading: runLoading } = useRunDetail(
    runId,
    isAuthenticated,
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated || !user) return null;

  if (runLoading || !run) {
    return (
      <AppLayout userName={user.name} userEmail={user.email} onLogout={logout}>
        <div className="flex justify-center py-20">
          <Loader2
            className="animate-spin"
            size={24}
            style={{ color: "var(--accent-blue)" }}
          />
        </div>
      </AppLayout>
    );
  }

  const runConfig = statusConfig[run.status] || statusConfig.pending;
  const RunIcon = runConfig.icon;
  const triggerLabel = run.trigger_type === "webhook" ? "Webhook" : "Manual";
  const TriggerIcon = run.trigger_type === "webhook" ? Webhook : Play;

  return (
    <AppLayout userName={user.name} userEmail={user.email} onLogout={logout}>
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push(`/workflows/${workflowId}/runs`)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--bg-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Run Details
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {workflow?.name || "Loading..."}
            </p>
          </div>

          {/* Status badge */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: runConfig.bgColor }}
          >
            <RunIcon
              size={16}
              className={run.status === "running" ? "animate-spin" : ""}
              style={{ color: runConfig.color }}
            />
            <span
              className="text-sm font-semibold"
              style={{ color: runConfig.color }}
            >
              {runConfig.label}
            </span>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <SummaryCard
            label="Run ID"
            value={run.run_id.slice(0, 8) + "..."}
            fullValue={run.run_id}
          />
          <SummaryCard
            label="Trigger"
            value={triggerLabel}
            icon={TriggerIcon}
          />
          <SummaryCard
            label="Started"
            value={run.started_at ? formatDateTime(run.started_at) : "—"}
          />
          <SummaryCard
            label="Duration"
            value={
              run.duration_ms != null ? formatDuration(run.duration_ms) : "—"
            }
          />
        </div>

        {/* Trigger input */}
        {run.trigger_input && Object.keys(run.trigger_input).length > 0 && (
          <div className="mb-6">
            <h2
              className="text-sm font-semibold mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              Trigger Input
            </h2>
            <JsonViewer data={run.trigger_input} />
          </div>
        )}

        {/* Execution timeline */}
        <div className="mb-6">
          <h2
            className="text-sm font-semibold mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            Execution Timeline
          </h2>

          {Object.keys(run.node_statuses).length === 0 ? (
            <div
              className="rounded-xl border p-6 text-center"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-color)",
              }}
            >
              <Loader2
                className="animate-spin mx-auto mb-2"
                size={20}
                style={{ color: "var(--text-muted)" }}
              />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Waiting for execution to begin...
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(run.node_statuses).map(
                ([nodeId, nodeStatus], index) => (
                  <NodeTimelineCard
                    key={nodeId}
                    nodeId={nodeId}
                    status={nodeStatus}
                    isLast={index === Object.keys(run.node_statuses).length - 1}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// --- Sub-components ---

function SummaryCard({
  label,
  value,
  fullValue,
  icon: Icon,
}: {
  label: string;
  value: string;
  fullValue?: string;
  icon?: typeof Play;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!fullValue) return;
    await navigator.clipboard.writeText(fullValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-color)",
      }}
    >
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} style={{ color: "var(--text-secondary)" }} />}
        <p
          className="text-sm font-medium truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </p>
        {fullValue && (
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-1 rounded transition-colors"
            style={{
              color: copied ? "var(--accent-green)" : "var(--text-muted)",
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

function NodeTimelineCard({
  nodeId,
  status,
  isLast,
}: {
  nodeId: string;
  status: {
    status: string;
    duration_ms: number | null;
    output: Record<string, unknown> | null;
    error: string | null;
    attempt: number;
  };
  isLast: boolean;
}) {
  const [showOutput, setShowOutput] = useState(false);
  const config = statusConfig[status.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="flex gap-3">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: config.bgColor }}
        >
          <Icon
            size={14}
            className={status.status === "running" ? "animate-spin" : ""}
            style={{ color: config.color }}
          />
        </div>
        {!isLast && (
          <div
            className="w-0.5 flex-1 my-1"
            style={{ backgroundColor: "var(--border-color)" }}
          />
        )}
      </div>

      {/* Content */}
      <div
        className="flex-1 rounded-xl border p-4 mb-1"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor:
            status.status === "running" ? config.color : "var(--border-color)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {nodeId}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: config.bgColor, color: config.color }}
            >
              {config.label}
            </span>
          </div>
          {status.duration_ms != null && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {formatDuration(status.duration_ms)}
            </span>
          )}
        </div>

        {/* Attempt */}
        {status.attempt > 1 && (
          <p className="text-xs mb-1" style={{ color: "var(--accent-orange)" }}>
            Attempt #{status.attempt}
          </p>
        )}

        {/* Error */}
        {status.error && (
          <div
            className="mt-2 p-3 rounded-lg text-xs"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.15)",
              color: "var(--accent-red)",
            }}
          >
            {status.error}
          </div>
        )}

        {/* Output */}
        {status.output && Object.keys(status.output).length > 0 && (
          <div className="mt-2">
            {status.output._artifact ? (
              <ArtifactBadge
                artifactKey={status.output._artifact_key as string}
                sizeBytes={status.output._original_size_bytes as number}
              />
            ) : (
              <>
                <button
                  onClick={() => setShowOutput(!showOutput)}
                  className="flex items-center gap-1 text-xs font-medium transition-colors"
                  style={{ color: "var(--accent-blue)" }}
                >
                  {showOutput ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                  {showOutput ? "Hide output" : "Show output"}
                </button>
                {showOutput && (
                  <div className="mt-2">
                    <JsonViewer data={status.output} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function JsonViewer({ data }: { data: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);
  const jsonStr = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md transition-colors z-10"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          color: copied ? "var(--accent-green)" : "var(--text-muted)",
        }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <pre
        className="p-4 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-color)",
        }}
      >
        {jsonStr}
      </pre>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
