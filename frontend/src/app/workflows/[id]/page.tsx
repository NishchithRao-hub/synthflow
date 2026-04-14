// frontend/src/app/workflows/[id]/page.tsx

"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useWorkflow, useSaveWorkflow } from "@/hooks/use-workflow";
import api from "@/lib/api";
import type { Node, Edge } from "@xyflow/react";
import WorkflowCanvas from "@/components/workflow/workflow-canvas";
import WebhookUrlBar from "@/components/workflow/webhook-url-bar";
import RunMonitor from "@/components/workflow/run-monitor";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Skeleton from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  Save,
  Check,
  AlertCircle,
  Play,
  History,
} from "lucide-react";

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const { data: workflow, isLoading } = useWorkflow(
    workflowId,
    isAuthenticated,
  );
  const saveWorkflow = useSaveWorkflow(workflowId);
  const { success, error: showError, info } = useToast();

  const graphRef = useRef<{ nodes: Node[]; edges: Edge[] }>({
    nodes: [],
    edges: [],
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Execution state
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showRunMonitor, setShowRunMonitor] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (saveStatus === "saved") {
      const timer = setTimeout(() => setSaveStatus("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleGraphChange = useCallback((nodes: Node[], edges: Edge[]) => {
    graphRef.current = { nodes, edges };
    setHasUnsavedChanges(true);
    setSaveStatus("idle");
  }, []);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");

    const { nodes, edges } = graphRef.current;

    const graphData = {
      nodes: nodes.map((node) => {
        const data = node.data as Record<string, unknown>;
        return {
          id: node.id,
          type: node.type || "trigger",
          subtype: (data.subtype as string) || undefined,
          config: {
            ...((data.config as Record<string, unknown>) || {}),
            label: data.label,
          },
          position: {
            x: node.position.x,
            y: node.position.y,
          },
        };
      }),
      edges: edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
      })),
    };

    try {
      await saveWorkflow.mutateAsync({ graph_data: graphData });
      setHasUnsavedChanges(false);
      setSaveStatus("saved");
      success("Workflow changes saved.", "Saved");
    } catch (err) {
      setSaveStatus("error");
      showError(extractErrorMessage(err), "Save failed");
    }
  }, [saveWorkflow, showError, success]);

  const handleExecute = async () => {
    // Save first if there are unsaved changes
    if (hasUnsavedChanges) {
      await handleSave();
    }

    setIsExecuting(true);

    try {
      const response = await api.post(`/api/workflows/${workflowId}/execute`, {
        input: {
          triggered_from: "editor",
          timestamp: new Date().toISOString(),
        },
      });

      const runId = response.data.run_id;
      setActiveRunId(runId);
      setShowRunMonitor(true);
      info("Execution started. Live updates are now available.", "Run started");
    } catch (e: unknown) {
      showError(extractErrorMessage(e), "Execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const requestNavigation = useCallback(
    (route: string) => {
      if (hasUnsavedChanges) {
        setPendingRoute(route);
        setShowLeaveModal(true);
        return;
      }
      router.push(route);
    },
    [hasUnsavedChanges, router],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  const initialNodes: Node[] = (workflow?.graph_data?.nodes || []).map(
    (node) => ({
      id: node.id,
      type: node.type,
      position: { x: node.position.x, y: node.position.y },
      data: {
        label: node.config?.label || node.subtype || node.type,
        subtype: node.subtype,
        config: node.config || {},
      },
    }),
  );

  const initialEdges: Edge[] = (workflow?.graph_data?.edges || []).map(
    (edge, index) => ({
      id: `edge_${index}`,
      source: edge.source,
      target: edge.target,
      style: { stroke: "var(--border-hover)", strokeWidth: 2 },
      animated: true,
    }),
  );

  useEffect(() => {
    if (initialNodes.length > 0) {
      graphRef.current = { nodes: initialNodes, edges: initialEdges };
    }
  }, [initialEdges, initialNodes]);

  if (authLoading || isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <div className="w-full max-w-6xl px-6">
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-[65vh] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => requestNavigation("/dashboard")}
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
            <div className="flex items-center gap-2">
              <h1
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {workflow?.name || "Untitled Workflow"}
              </h1>
              {hasUnsavedChanges && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--accent-orange)" }}
                  title="Unsaved changes"
                />
              )}
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              v{workflow?.version || 1} ·{" "}
              {workflow?.is_active ? "Active" : "Inactive"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === "saved" && (
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--accent-green)" }}
            >
              <Check size={14} />
              Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--accent-red)" }}
            >
              <AlertCircle size={14} />
              Save failed
            </span>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={handleSave}
            loading={saveStatus === "saving"}
            disabled={!hasUnsavedChanges && saveStatus !== "error"}
          >
            <Save size={14} />
            Save
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push(`/workflows/${workflowId}/runs`)}
          >
            <History size={14} />
            Runs
          </Button>

          <Button size="sm" onClick={handleExecute} loading={isExecuting}>
            <Play size={14} />
            Execute
          </Button>
        </div>
      </div>

      {/* Webhook URL */}
      <WebhookUrlBar workflowId={workflowId} />

      {/* Canvas + Run Monitor */}
      <div className="flex-1 flex">
        <div className="flex-1">
          <WorkflowCanvas
            initialNodes={initialNodes}
            initialEdges={initialEdges}
            onGraphChange={handleGraphChange}
          />
        </div>

        {/* Run Monitor Panel */}
        {showRunMonitor && (
          <RunMonitor
            runId={activeRunId}
            onClose={() => {
              setShowRunMonitor(false);
              setActiveRunId(null);
            }}
          />
        )}
      </div>

      <Modal
        isOpen={showLeaveModal}
        onClose={() => {
          setShowLeaveModal(false);
          setPendingRoute(null);
        }}
        title="Unsaved changes"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            You have unsaved edits in this workflow. Leaving now will discard
            those changes.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowLeaveModal(false);
                setPendingRoute(null);
              }}
            >
              Stay
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const route = pendingRoute || "/dashboard";
                setShowLeaveModal(false);
                setPendingRoute(null);
                router.push(route);
              }}
            >
              Leave without saving
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as {
      response?: {
        data?: {
          error?: { message?: string };
          message?: string;
          detail?: unknown;
        };
      };
      message?: string;
    };
    if (e.response?.data?.error?.message) return e.response.data.error.message;
    if (typeof e.response?.data?.message === "string") {
      return e.response.data.message;
    }
    const detail = e.response?.data?.detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail[0]?.msg ?? "Validation error";
    }
    if (typeof detail === "string") return detail;
    if (typeof e.message === "string" && e.message) return e.message;
  }
  return "Something went wrong. Please try again.";
}
