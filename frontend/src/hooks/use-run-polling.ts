// frontend/src/hooks/use-run-polling.ts

"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface NodeStatus {
  status: string;
  duration_ms?: number;
  output?: Record<string, unknown>;
  error?: string;
}

interface RunPollData {
  run_id: string;
  workflow_id: string;
  status: string;
  trigger_type: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  node_statuses: Record<string, NodeStatus>;
}

interface UseRunPollingReturn {
  data: RunPollData | null;
  isLoading: boolean;
  error: string | null;
}

export function useRunPolling(
  runId: string | null,
  enabled: boolean = true,
  intervalMs: number = 3000,
): UseRunPollingReturn {
  const [data, setData] = useState<RunPollData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId || !enabled) return;

    let active = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const poll = async () => {
      if (!active) return;

      try {
        setIsLoading(true);
        const response = await api.get(`/api/runs/${runId}`);
        if (!active) return;

        setData(response.data);
        setError(null);

        // Stop polling if run is terminal
        const status = response.data.status;
        if (
          status === "completed" ||
          status === "failed" ||
          status === "timed_out"
        ) {
          return;
        }

        // Schedule next poll
        timeoutId = setTimeout(poll, intervalMs);
      } catch (e) {
        if (!active) return;
        setError("Failed to fetch run status");
        // Continue polling even on error
        timeoutId = setTimeout(poll, intervalMs);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    poll();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [runId, enabled, intervalMs]);

  return { data, isLoading, error };
}
