// frontend/src/app/dashboard/page.tsx

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  useWorkflows,
  useCreateWorkflow,
  useDeleteWorkflow,
} from "@/hooks/use-workflows";
import AppLayout from "@/components/layout/app-layout";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import {
  Plus,
  Workflow,
  Trash2,
  ExternalLink,
  Clock,
  GitBranch,
  CircleDot,
} from "lucide-react";
import type { WorkflowListItem } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { data, isLoading: workflowsLoading } = useWorkflows();
  const createWorkflow = useCreateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated || !user) {
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

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const result = await createWorkflow.mutateAsync({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      });
      setShowCreateModal(false);
      setNewName("");
      setNewDescription("");
      router.push(`/workflows/${result.id}`);
    } catch {
      // Error handled by TanStack Query
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWorkflow.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch {
      // Error handled by TanStack Query
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <AppLayout userName={user.name} userEmail={user.email} onLogout={logout}>
      <div className="p-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Workflows
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Create and manage your automation workflows
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            New Workflow
          </Button>
        </div>

        {/* Workflow Grid */}
        {workflowsLoading ? (
          <div className="flex justify-center py-20">
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
        ) : data?.workflows.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreateModal(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.workflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onOpen={() => router.push(`/workflows/${workflow.id}`)}
                onDelete={() => setDeleteConfirmId(workflow.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewName("");
          setNewDescription("");
        }}
        title="Create New Workflow"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g., Support Ticket Classifier"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <Textarea
            label="Description (optional)"
            placeholder="What does this workflow do?"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setNewName("");
                setNewDescription("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createWorkflow.isPending}
              disabled={!newName.trim()}
            >
              Create Workflow
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Workflow"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Are you sure you want to delete this workflow? This action cannot be
            undone. All associated runs and logs will also be deleted.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              loading={deleteWorkflow.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

// --- Sub-components ---

function WorkflowCard({
  workflow,
  onOpen,
  onDelete,
}: {
  workflow: WorkflowListItem;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="rounded-xl border p-5 transition-colors cursor-pointer group"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-color)",
      }}
      onClick={onOpen}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--border-hover)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--border-color)")
      }
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ backgroundColor: "var(--bg-tertiary)" }}
          >
            <Workflow size={16} style={{ color: "var(--accent-blue)" }} />
          </div>
          <div>
            <h3
              className="text-sm font-semibold truncate max-w-[180px]"
              style={{ color: "var(--text-primary)" }}
            >
              {workflow.name}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--bg-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
            title="Open workflow"
          >
            <ExternalLink size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
              e.currentTarget.style.color = "var(--accent-red)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
            title="Delete workflow"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Description */}
      {workflow.description && (
        <p
          className="text-xs mb-4 line-clamp-2"
          style={{ color: "var(--text-muted)" }}
        >
          {workflow.description}
        </p>
      )}

      {/* Stats */}
      <div
        className="flex items-center gap-4 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        <span className="flex items-center gap-1">
          <CircleDot size={12} />
          {workflow.node_count} nodes
        </span>
        <span className="flex items-center gap-1">
          <GitBranch size={12} />v{workflow.version}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatCardDate(workflow.updated_at)}
        </span>
      </div>

      {/* Status badge */}
      <div className="mt-3">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: workflow.is_active
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(107, 107, 128, 0.1)",
            color: workflow.is_active
              ? "var(--accent-green)"
              : "var(--text-muted)",
          }}
        >
          {workflow.is_active ? "Active" : "Inactive"}
        </span>
      </div>
    </div>
  );
}

function formatCardDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div
        className="flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        <Workflow size={28} style={{ color: "var(--text-muted)" }} />
      </div>
      <h3
        className="text-lg font-semibold mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        No workflows yet
      </h3>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        Create your first workflow to get started
      </p>
      <Button onClick={onCreateClick}>
        <Plus size={16} />
        Create Workflow
      </Button>
    </div>
  );
}
