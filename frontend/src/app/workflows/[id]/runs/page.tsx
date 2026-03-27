// frontend/src/app/workflows/[id]/runs/page.tsx

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useWorkflow } from "@/hooks/use-workflow";
import { useWorkflowRuns, type RunListItem } from "@/hooks/use-runs";
import AppLayout from "@/components/layout/app-layout";
import Button from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Webhook,
  Play,
  ChevronLeft,
  ChevronRight,
  Timer,
  SkipForward,
} from "lucide-react";

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
  timed_out: { icon: Timer, color: "var(--accent-red)", label: "Timed Out" },
  skipped: {
    icon: SkipForward,
    color: "var(--accent-orange)",
    label: "Skipped",
  },
};

const triggerConfig: Record<string, { icon: typeof Play; label: string }> = {
  manual: { icon: Play, label: "Manual" },
  webhook: { icon: Webhook, label: "Webhook" },
  schedule: { icon: Clock, label: "Schedule" },
};

export default function RunHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const perPage = 15;

  const { data: workflow } = useWorkflow(workflowId, isAuthenticated);
  const { data: runsData, isLoading: runsLoading } = useWorkflowRuns(
    workflowId,
    page,
    perPage,
    statusFilter,
    isAuthenticated,
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated || !user) return null;

  const totalPages = runsData ? Math.ceil(runsData.total / perPage) : 0;

  return (
    <AppLayout userName={user.name} userEmail={user.email} onLogout={logout}>
      <div className="p-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push(`/workflows/${workflowId}`)}
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
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Run History
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {workflow?.name || "Loading..."} · {runsData?.total || 0} total
              runs
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <span
            className="text-xs font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            Filter:
          </span>
          {["all", "completed", "failed", "running", "pending"].map(
            (filter) => (
              <button
                key={filter}
                onClick={() => {
                  setStatusFilter(filter === "all" ? undefined : filter);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  backgroundColor:
                    (filter === "all" && !statusFilter) ||
                    statusFilter === filter
                      ? "var(--bg-tertiary)"
                      : "transparent",
                  color:
                    (filter === "all" && !statusFilter) ||
                    statusFilter === filter
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  border: `1px solid ${
                    (filter === "all" && !statusFilter) ||
                    statusFilter === filter
                      ? "var(--border-hover)"
                      : "transparent"
                  }`,
                }}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ),
          )}
        </div>

        {/* Runs table */}
        {runsLoading ? (
          <div className="flex justify-center py-20">
            <Loader2
              className="animate-spin"
              size={24}
              style={{ color: "var(--accent-blue)" }}
            />
          </div>
        ) : runsData?.runs.length === 0 ? (
          <EmptyRunState />
        ) : (
          <>
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-color)",
              }}
            >
              {/* Table header */}
              <div
                className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b"
                style={{
                  color: "var(--text-muted)",
                  borderColor: "var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                }}
              >
                <div className="col-span-3">Status</div>
                <div className="col-span-2">Trigger</div>
                <div className="col-span-3">Started</div>
                <div className="col-span-2">Duration</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Table rows */}
              {runsData?.runs.map((run) => (
                <RunRow
                  key={run.id}
                  run={run}
                  onClick={() =>
                    router.push(`/workflows/${workflowId}/runs/${run.id}`)
                  }
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Page {page} of {totalPages} · {runsData?.total} total runs
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function RunRow({ run, onClick }: { run: RunListItem; onClick: () => void }) {
  const status = statusConfig[run.status] || statusConfig.pending;
  const trigger = triggerConfig[run.trigger_type] || triggerConfig.manual;
  const StatusIcon = status.icon;
  const TriggerIcon = trigger.icon;

  const duration = getDuration(run.started_at, run.completed_at);
  const startedAt = run.started_at ? formatDateTime(run.started_at) : "—";

  return (
    <div
      className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center border-b cursor-pointer transition-colors"
      style={{ borderColor: "var(--border-color)" }}
      onClick={onClick}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = "var(--bg-hover)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = "transparent")
      }
    >
      {/* Status */}
      <div className="col-span-3 flex items-center gap-2">
        <StatusIcon
          size={14}
          className={run.status === "running" ? "animate-spin" : ""}
          style={{ color: status.color }}
        />
        <span className="text-sm font-medium" style={{ color: status.color }}>
          {status.label}
        </span>
      </div>

      {/* Trigger */}
      <div className="col-span-2 flex items-center gap-1.5">
        <TriggerIcon size={12} style={{ color: "var(--text-muted)" }} />
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {trigger.label}
        </span>
      </div>

      {/* Started at */}
      <div className="col-span-3">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {startedAt}
        </span>
      </div>

      {/* Duration */}
      <div className="col-span-2">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {duration}
        </span>
      </div>

      {/* Actions */}
      <div className="col-span-2 text-right">
        <span
          className="text-xs font-medium"
          style={{ color: "var(--accent-blue)" }}
        >
          View details →
        </span>
      </div>
    </div>
  );
}

function EmptyRunState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Clock size={28} style={{ color: "var(--text-muted)" }} />
      <h3
        className="text-lg font-semibold mt-3 mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        No runs yet
      </h3>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Execute your workflow to see run history here
      </p>
    </div>
  );
}

function getDuration(
  startedAt: string | null,
  completedAt: string | null,
): string {
  if (!startedAt || !completedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const ms = end - start;

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
