// frontend/src/hooks/use-billing.ts

import { useMutation, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface UsageItem {
  used: number;
  limit: number;
}

export interface BillingUsage {
  plan: string;
  billing_cycle_start: string;
  billing_cycle_end: string;
  usage: {
    workflows: UsageItem;
    workflow_runs: UsageItem;
    ai_node_calls: UsageItem;
  };
}

export function useBillingUsage() {
  return useQuery<BillingUsage>({
    queryKey: ["billing-usage"],
    queryFn: async () => {
      const response = await api.get("/api/billing/usage");
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useCreateCheckout() {
  return useMutation<{ checkout_url: string }, Error>({
    mutationFn: async () => {
      const response = await api.post("/api/billing/create-checkout-session");
      return response.data;
    },
    onSuccess: (data) => {
      window.location.href = data.checkout_url;
    },
  });
}

export function useCreatePortal() {
  return useMutation<{ portal_url: string }, Error>({
    mutationFn: async () => {
      const response = await api.post("/api/billing/create-portal-session");
      return response.data;
    },
    onSuccess: (data) => {
      window.location.href = data.portal_url;
    },
  });
}
