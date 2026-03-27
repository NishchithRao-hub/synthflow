// frontend/src/hooks/use-runs.ts

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface RunListItem {
  id: string;
  workflow_id: string;
  status: string;
  trigger_type: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface RunListResponse {
  runs: RunListItem[];
  total: number;
  page: number;
  per_page: number;
}

export function useWorkflowRuns(
  workflowId: string,
  page: number = 1,
  perPage: number = 20,
  status?: string,
  enabled: boolean = true,
) {
  return useQuery<RunListResponse>({
    queryKey: ["workflow-runs", workflowId, page, perPage, status],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
      };
      if (status) params.status = status;

      const response = await api.get(`/api/workflows/${workflowId}/runs`, {
        params,
      });
      return response.data;
    },
    enabled,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}
