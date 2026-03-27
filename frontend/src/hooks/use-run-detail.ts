// frontend/src/hooks/use-run-detail.ts

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface NodeStatus {
  status: string;
  duration_ms: number | null;
  output: Record<string, unknown> | null;
  error: string | null;
  attempt: number;
}

export interface RunDetail {
  run_id: string;
  workflow_id: string;
  workflow_version: number;
  status: string;
  trigger_type: string;
  trigger_input: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  node_statuses: Record<string, NodeStatus>;
  execution_context: Record<string, unknown>;
}

export function useRunDetail(runId: string, enabled: boolean = true) {
  return useQuery<RunDetail>({
    queryKey: ["run-detail", runId],
    queryFn: async () => {
      const response = await api.get(`/api/runs/${runId}`);
      return response.data;
    },
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (
        status === "completed" ||
        status === "failed" ||
        status === "timed_out"
      ) {
        return false;
      }
      return 3000;
    },
  });
}
