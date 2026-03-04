// frontend/src/hooks/use-workflows.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { WorkflowListResponse, WorkflowCreateResponse } from "@/types";

export function useWorkflows(page: number = 1, perPage: number = 20) {
  return useQuery<WorkflowListResponse>({
    queryKey: ["workflows", page, perPage],
    queryFn: async () => {
      const response = await api.get("/api/workflows", {
        params: { page, per_page: perPage },
      });
      return response.data;
    },
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation<
    WorkflowCreateResponse,
    Error,
    { name: string; description?: string }
  >({
    mutationFn: async (data) => {
      const response = await api.post("/api/workflows", {
        name: data.name,
        description: data.description || null,
        graph_data: { nodes: [], edges: [] },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (workflowId) => {
      await api.delete(`/api/workflows/${workflowId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}
