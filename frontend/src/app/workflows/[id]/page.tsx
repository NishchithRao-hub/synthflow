// frontend/src/app/workflows/[id]/page.tsx

"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useWorkflow, useSaveWorkflow } from "@/hooks/use-workflow";
import type { Node, Edge } from "@xyflow/react";
import WorkflowCanvas from "@/components/workflow/workflow-canvas";
import WebhookUrlBar from "@/components/workflow/webhook-url-bar";
import Button from "@/components/ui/button";
import { ArrowLeft, Save, Check, AlertCircle } from "lucide-react";

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

  const graphRef = useRef<{ nodes: Node[]; edges: Edge[] }>({
    nodes: [],
    edges: [],
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Clear "saved" status after 2 seconds
  useEffect(() => {
    if (saveStatus === "saved") {
      const timer = setTimeout(() => setSaveStatus("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Warn before leaving with unsaved changes
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

  const handleSave = async () => {
    setSaveStatus("saving");

    const { nodes, edges } = graphRef.current;

    // Convert React Flow nodes/edges back to backend format
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
    } catch {
      setSaveStatus("error");
    }
  };

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Convert backend graph_data to React Flow format
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

  // Initialize graphRef with loaded data
  useEffect(() => {
    if (initialNodes.length > 0) {
      graphRef.current = { nodes: initialNodes, edges: initialEdges };
    }
  }, [workflow]);

  if (authLoading || isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <svg
          className="animate-spin h-8 w-8"
          style={{ color: "var(--accent-blue)" }}
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
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
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (hasUnsavedChanges) {
                if (window.confirm("You have unsaved changes. Leave anyway?")) {
                  router.push("/dashboard");
                }
              } else {
                router.push("/dashboard");
              }
            }}
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

        <div className="flex items-center gap-3">
          {/* Save status indicator */}
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
            onClick={handleSave}
            loading={saveStatus === "saving"}
            disabled={!hasUnsavedChanges && saveStatus !== "error"}
          >
            <Save size={14} />
            Save
          </Button>
        </div>
      </div>

      {/* Webhook URL */}
      <WebhookUrlBar workflowId={workflowId} />

      {/* Canvas */}
      <div className="flex-1">
        <WorkflowCanvas
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          onGraphChange={handleGraphChange}
        />
      </div>
    </div>
  );
}
