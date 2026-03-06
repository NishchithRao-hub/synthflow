// frontend/src/hooks/use-workflow.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Workflow } from "@/types";

export function useWorkflow(workflowId: string, enabled: boolean = true) {
  return useQuery<Workflow>({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      const response = await api.get(`/api/workflows/${workflowId}`);
      return response.data;
    },
    enabled,
  });
}

interface SaveWorkflowData {
  name?: string;
  description?: string;
  graph_data?: {
    nodes: Array<{
      id: string;
      type: string;
      subtype?: string;
      config: Record<string, unknown>;
      position: { x: number; y: number };
    }>;
    edges: Array<{
      source: string;
      target: string;
    }>;
  };
  is_active?: boolean;
  concurrency_policy?: string;
}

export function useSaveWorkflow(workflowId: string) {
  const queryClient = useQueryClient();

  return useMutation<Workflow, Error, SaveWorkflowData>({
    mutationFn: async (data) => {
      const response = await api.put(`/api/workflows/${workflowId}`, data);
      return response.data;
    },
    onSuccess: (updatedWorkflow) => {
      queryClient.setQueryData(["workflow", workflowId], updatedWorkflow);
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}
