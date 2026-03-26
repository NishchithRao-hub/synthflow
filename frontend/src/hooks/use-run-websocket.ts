// frontend/src/hooks/use-run-websocket.ts

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAccessToken } from "@/lib/api";

const WS_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000")
  .replace("http://", "ws://")
  .replace("https://", "wss://");

export interface RunEvent {
  event: string;
  timestamp?: string;
  data: {
    run_id?: string;
    workflow_id?: string;
    node_id?: string;
    node_type?: string;
    status?: string;
    duration_ms?: number;
    output?: Record<string, unknown>;
    error?: string;
  };
}

export interface NodeStatus {
  status: string;
  duration_ms?: number;
  output?: Record<string, unknown>;
  error?: string;
}

interface UseRunWebSocketReturn {
  runStatus: string;
  nodeStatuses: Record<string, NodeStatus>;
  events: RunEvent[];
  isConnected: boolean;
  error: string | null;
}

export function useRunWebSocket(
  runId: string | null,
  enabled: boolean = true,
): UseRunWebSocketReturn {
  const [runStatus, setRunStatus] = useState<string>("pending");
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>(
    {},
  );
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEvent = useCallback((event: RunEvent) => {
    setEvents((prev) => [...prev, event]);

    switch (event.event) {
      case "run_started":
        setRunStatus("running");
        break;

      case "node_status_update":
        if (event.data.node_id) {
          setNodeStatuses((prev) => ({
            ...prev,
            [event.data.node_id!]: {
              status: event.data.status || "unknown",
              duration_ms: event.data.duration_ms,
              output: event.data.output,
              error: event.data.error,
            },
          }));
        }
        break;

      case "run_completed":
        setRunStatus("completed");
        break;

      case "run_failed":
        setRunStatus("failed");
        break;

      case "ping":
        // Keepalive, ignore
        break;

      default:
        break;
    }
  }, []);

  const connect = useCallback(
    function connectImpl() {
      if (!runId || !enabled) return;

      const token = getAccessToken();
      if (!token) {
        setError("No access token available");
        return;
      }

      const url = `${WS_BASE_URL}/ws/runs/${runId}?token=${token}`;

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          setError(null);
          reconnectAttempts.current = 0;
        };

        ws.onmessage = (messageEvent) => {
          try {
            const event: RunEvent = JSON.parse(messageEvent.data);
            handleEvent(event);
          } catch {
            // Ignore non-JSON messages
          }
        };

        ws.onerror = () => {
          setError("WebSocket connection error");
        };

        ws.onclose = (closeEvent) => {
          setIsConnected(false);
          wsRef.current = null;

          // Don't reconnect if closed normally (run completed) or auth rejected
          if (closeEvent.code === 1000 || closeEvent.code === 4001) {
            return;
          }

          // Attempt reconnection with exponential backoff
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttempts.current),
              10000,
            );
            reconnectAttempts.current += 1;

            reconnectTimeoutRef.current = setTimeout(() => {
              connectImpl();
            }, delay);
          } else {
            setError("WebSocket connection lost. Falling back to polling.");
          }
        };
      } catch {
        setError("Failed to create WebSocket connection");
      }
    },
    [runId, enabled, handleEvent],
  );

  // Connect when runId changes
  useEffect(() => {
    if (runId && enabled) {
      // Reset state for new run
      setRunStatus("pending");
      setNodeStatuses({});
      setEvents([]);
      setError(null);
      reconnectAttempts.current = 0;

      connect();
    }

    return () => {
      // Cleanup on unmount or runId change
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [runId, enabled, connect]);

  return {
    runStatus,
    nodeStatuses,
    events,
    isConnected,
    error,
  };
}
