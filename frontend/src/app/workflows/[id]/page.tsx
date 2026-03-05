// frontend/src/app/workflows/[id]/page.tsx

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import api from "@/lib/api";
import type { Workflow } from "@/types";
import type { Node } from "@xyflow/react";
import WorkflowCanvas from "@/components/workflow/workflow-canvas";
import Button from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const { data: workflow, isLoading } = useQuery<Workflow>({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      const response = await api.get(`/api/workflows/${workflowId}`);
      return response.data;
    },
    enabled: isAuthenticated,
  });

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

  // Convert backend graph_data to React Flow format
  const initialNodes: Node[] = (workflow?.graph_data?.nodes || []).map(
    (node) => ({
      id: node.id,
      type: node.type,
      position: { x: node.position.x, y: node.position.y },
      data: {
        label: node.config?.label || node.subtype || node.type,
        subtype: node.subtype,
        config: node.config,
      },
    }),
  );

  const initialEdges = (workflow?.graph_data?.edges || []).map(
    (edge, index) => ({
      id: `edge_${index}`,
      source: edge.source,
      target: edge.target,
      style: { stroke: "var(--border-hover)", strokeWidth: 2 },
      animated: true,
    }),
  );

  return (
    <div
      className="h-screen flex flex-col"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
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
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {workflow?.name || "Untitled Workflow"}
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              v{workflow?.version || 1} ·{" "}
              {workflow?.is_active ? "Active" : "Inactive"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedNode && (
            <span
              className="text-xs px-2 py-1 rounded-md"
              style={{
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
              }}
            >
              Selected: {selectedNode.id}
            </span>
          )}
          <Button size="sm" variant="secondary">
            <Save size={14} />
            Save
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <WorkflowCanvas
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          onNodeSelect={setSelectedNode}
        />
      </div>
    </div>
  );
}
