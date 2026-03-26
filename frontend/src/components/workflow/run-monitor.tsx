// frontend/src/components/workflow/run-monitor.tsx

"use client";

import { useRunWebSocket, type NodeStatus } from "@/hooks/use-run-websocket";
import { useRunPolling } from "@/hooks/use-run-polling";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  SkipForward,
  Wifi,
  WifiOff,
} from "lucide-react";

interface RunMonitorProps {
  runId: string | null;
  onClose: () => void;
}

const statusConfig: Record<
  string,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  pending: { icon: Clock, color: "var(--text-muted)", label: "Pending" },
  running: { icon: Loader2, color: "var(--accent-blue)", label: "Running" },
  completed: {
    icon: CheckCircle2,
    color: "var(--accent-green)",
    label: "Completed",
  },
  failed: { icon: XCircle, color: "var(--accent-red)", label: "Failed" },
  skipped: {
    icon: SkipForward,
    color: "var(--accent-orange)",
    label: "Skipped",
  },
  timed_out: { icon: XCircle, color: "var(--accent-red)", label: "Timed Out" },
};

export default function RunMonitor({ runId, onClose }: RunMonitorProps) {
  const ws = useRunWebSocket(runId);
  const polling = useRunPolling(
    runId,
    !ws.isConnected && !!runId, // Only poll if WebSocket is disconnected
    3000,
  );

  // Merge data sources: prefer WebSocket, fall back to polling
  const runStatus = ws.isConnected
    ? ws.runStatus
    : polling.data?.status || "pending";
  const nodeStatuses = ws.isConnected
    ? ws.nodeStatuses
    : polling.data?.node_statuses || {};
  const isTerminal = ["completed", "failed", "timed_out"].includes(runStatus);

  if (!runId) return null;

  const runConfig = statusConfig[runStatus] || statusConfig.pending;
  const RunIcon = runConfig.icon;

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
          <RunIcon
            size={16}
            className={runStatus === "running" ? "animate-spin" : ""}
            style={{ color: runConfig.color }}
          />
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Execution
            </p>
            <p className="text-xs" style={{ color: runConfig.color }}>
              {runConfig.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection indicator */}
          {ws.isConnected ? (
            <span title="Live connection">
              <Wifi size={12} style={{ color: "var(--accent-green)" }} />
            </span>
          ) : (
            <span title="Polling fallback">
              <WifiOff size={12} style={{ color: "var(--text-muted)" }} />
            </span>
          )}

          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-md transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--bg-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            Close
          </button>
        </div>
      </div>

      {/* Node statuses */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <h3
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          Nodes
        </h3>

        {Object.keys(nodeStatuses).length === 0 && !isTerminal && (
          <div className="flex items-center gap-2 py-4 justify-center">
            <Loader2
              size={14}
              className="animate-spin"
              style={{ color: "var(--text-muted)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Waiting for execution to begin...
            </span>
          </div>
        )}

        {Object.entries(nodeStatuses).map(([nodeId, status]) => (
          <NodeStatusCard key={nodeId} nodeId={nodeId} status={status} />
        ))}
      </div>

      {/* Event log */}
      <div
        className="border-t flex-shrink-0 max-h-48 overflow-y-auto"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="px-4 py-2">
          <h3
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            Event Log ({ws.events.filter((e) => e.event !== "ping").length})
          </h3>
          <div className="space-y-1">
            {ws.events
              .filter((e) => e.event !== "ping")
              .slice(-10)
              .map((event, index) => (
                <EventLogEntry key={index} event={event} />
              ))}
          </div>
        </div>
      </div>

      {/* Error display */}
      {ws.error && (
        <div
          className="px-4 py-2 text-xs border-t"
          style={{
            borderColor: "var(--border-color)",
            color: "var(--accent-orange)",
            backgroundColor: "rgba(249, 115, 22, 0.05)",
          }}
        >
          {ws.error}
        </div>
      )}
    </div>
  );
}

function NodeStatusCard({
  nodeId,
  status,
}: {
  nodeId: string;
  status: NodeStatus;
}) {
  const config = statusConfig[status.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div
      className="rounded-lg border px-3 py-2.5"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor:
          status.status === "running" ? config.color : "var(--border-color)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon
            size={13}
            className={status.status === "running" ? "animate-spin" : ""}
            style={{ color: config.color }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {nodeId}
          </span>
        </div>
        <span className="text-xs" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>

      {status.duration_ms !== undefined && status.duration_ms !== null && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Duration: {status.duration_ms}ms
        </p>
      )}

      {status.error && (
        <p
          className="text-xs mt-1 truncate"
          style={{ color: "var(--accent-red)" }}
          title={status.error}
        >
          {status.error}
        </p>
      )}

      {status.output &&
        !status.output._truncated &&
        Object.keys(status.output).length > 0 && (
          <details className="mt-1">
            <summary
              className="text-xs cursor-pointer"
              style={{ color: "var(--text-muted)" }}
            >
              Output
            </summary>
            <pre
              className="text-xs mt-1 p-2 rounded overflow-x-auto max-h-32"
              style={{
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
              }}
            >
              {JSON.stringify(status.output, null, 2).slice(0, 500)}
            </pre>
          </details>
        )}
    </div>
  );
}

function EventLogEntry({
  event,
}: {
  event: { event: string; data: Record<string, unknown> };
}) {
  const nodeId = event.data.node_id as string | undefined;
  const status = event.data.status as string | undefined;

  const getEventLabel = () => {
    switch (event.event) {
      case "run_started":
        return "Run started";
      case "run_completed":
        return "Run completed";
      case "run_failed":
        return "Run failed";
      case "node_status_update":
        return `${nodeId}: ${status}`;
      default:
        return event.event;
    }
  };

  const eventConfig = statusConfig[status || "pending"] || statusConfig.pending;

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: eventConfig.color }}
      />
      <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
        {getEventLabel()}
      </span>
    </div>
  );
}
