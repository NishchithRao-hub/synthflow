// frontend/src/app/settings/page.tsx

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import AppLayout from "@/components/layout/app-layout";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || !user) return null;

  return (
    <AppLayout userName={user.name} userEmail={user.email} onLogout={logout}>
      <div className="p-8 max-w-2xl">
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Settings
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          Manage your account and preferences
        </p>

        {/* Profile section */}
        <div
          className="rounded-xl border p-6 mb-6"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-color)",
          }}
        >
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Profile
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Name
              </span>
              <span
                className="text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                {user.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Email
              </span>
              <span
                className="text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                {user.email}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                Plan
              </span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "rgba(139, 92, 246, 0.1)",
                  color: "var(--accent-purple)",
                }}
              >
                {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Placeholder sections */}
        <div
          className="rounded-xl border p-6 mb-6"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-color)",
          }}
        >
          <h2
            className="text-sm font-semibold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Billing
          </h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Usage tracking and Stripe integration coming in Phase 11.
          </p>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-color)",
          }}
        >
          <h2
            className="text-sm font-semibold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            API Keys
          </h2>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            OpenAI BYOK configuration coming in Phase 6.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
