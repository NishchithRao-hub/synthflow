// frontend/src/app/settings/page.tsx

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  useBillingUsage,
  useCreateCheckout,
  useCreatePortal,
} from "@/hooks/use-billing";
import AppLayout from "@/components/layout/app-layout";
import Button from "@/components/ui/button";
import {
  User as UserIcon,
  CreditCard,
  Key,
  Zap,
  Crown,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, isAuthenticated, logout, refreshUser } = useAuth();
  const { data: billing, isLoading: billingLoading } = useBillingUsage();
  const createCheckout = useCreateCheckout();
  const createPortal = useCreatePortal();

  const [upgradeStatus] = useState<"success" | "cancelled" | null>(() => {
    const upgrade = searchParams.get("upgrade");
    return upgrade === "success" || upgrade === "cancelled" ? upgrade : null;
  });
  const [isUpgradeMessageDismissed, setIsUpgradeMessageDismissed] =
    useState(false);
  const upgradeMessage =
    isUpgradeMessageDismissed || !upgradeStatus
      ? null
      : upgradeStatus === "success"
        ? "Welcome to SynthFlow Pro! Your plan has been upgraded."
        : "Upgrade cancelled. You can upgrade anytime.";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Refresh user data on settings page load (picks up plan changes)
  useEffect(() => {
    if (isAuthenticated) {
      refreshUser();
    }
  }, [isAuthenticated, refreshUser]);

  // Check for upgrade success/cancel from Stripe redirect
  useEffect(() => {
    if (upgradeStatus) {
      // router.replace("/settings");
      refreshUser(); // Refresh user data to get new plan info
    }
  }, [upgradeStatus, router, refreshUser]);

  if (isLoading || !isAuthenticated || !user) return null;

  return (
    <AppLayout userName={user.name} userEmail={user.email} onLogout={logout}>
      <div className="p-8 max-w-3xl">
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Settings
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
          Manage your account, billing, and preferences
        </p>

        {/* Upgrade message */}
        {upgradeMessage && (
          <div
            className="rounded-xl p-4 mb-6 flex items-center gap-3"
            style={{
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
            }}
          >
            <CheckCircle2 size={18} style={{ color: "var(--accent-green)" }} />
            <p className="text-sm" style={{ color: "var(--accent-green)" }}>
              {upgradeMessage}
            </p>
            <button
              onClick={() => setIsUpgradeMessageDismissed(true)}
              className="ml-auto text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Profile section */}
        <SettingsSection title="Profile" icon={UserIcon}>
          <SettingsRow label="Name" value={user.name} />
          <SettingsRow label="Email" value={user.email} />
          <SettingsRow
            label="Plan"
            value={
              <span className="flex items-center gap-1.5">
                {user.plan === "pro" ? (
                  <>
                    <Crown
                      size={14}
                      style={{ color: "var(--accent-purple)" }}
                    />
                    <span style={{ color: "var(--accent-purple)" }}>Pro</span>
                  </>
                ) : (
                  <span>Free</span>
                )}
              </span>
            }
          />
        </SettingsSection>

        {/* Billing & Usage section */}
        <SettingsSection title="Billing & Usage" icon={CreditCard}>
          {billingLoading ? (
            <p className="text-sm py-4" style={{ color: "var(--text-muted)" }}>
              Loading usage data...
            </p>
          ) : billing ? (
            <>
              {/* Usage meters */}
              <div className="space-y-4 mb-6">
                <UsageMeter
                  label="Workflows"
                  used={billing.usage.workflows.used}
                  limit={billing.usage.workflows.limit}
                />
                <UsageMeter
                  label="Workflow Runs"
                  subtitle="this month"
                  used={billing.usage.workflow_runs.used}
                  limit={billing.usage.workflow_runs.limit}
                />
                <UsageMeter
                  label="AI Node Calls"
                  subtitle="this month"
                  used={billing.usage.ai_node_calls.used}
                  limit={billing.usage.ai_node_calls.limit}
                />
              </div>

              {/* Billing cycle */}
              <p
                className="text-xs mb-4"
                style={{ color: "var(--text-muted)" }}
              >
                Billing cycle: {formatDate(billing.billing_cycle_start)} —{" "}
                {formatDate(billing.billing_cycle_end)}
              </p>

              {/* Upgrade / Manage buttons */}
              {user.plan === "free" ? (
                <div
                  className="rounded-xl p-5 border"
                  style={{
                    backgroundColor: "rgba(139, 92, 246, 0.05)",
                    borderColor: "rgba(139, 92, 246, 0.2)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={16} style={{ color: "var(--accent-purple)" }} />
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Upgrade to Pro — $10/month
                    </h3>
                  </div>
                  <ul
                    className="text-xs space-y-1 mb-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <li>• Unlimited workflows</li>
                    <li>• 5,000 workflow runs per month</li>
                    <li>• 2,000 AI node calls per month</li>
                    <li>• 90-day run history</li>
                  </ul>
                  <Button
                    onClick={() => createCheckout.mutate()}
                    loading={createCheckout.isPending}
                  >
                    <Crown size={14} />
                    Upgrade to Pro
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => createPortal.mutate()}
                    loading={createPortal.isPending}
                  >
                    <CreditCard size={14} />
                    Manage Subscription
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm py-4" style={{ color: "var(--text-muted)" }}>
              Unable to load usage data
            </p>
          )}
        </SettingsSection>

        {/* API Keys section */}
        <SettingsSection title="API Keys" icon={Key}>
          <p
            className="text-xs mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            Add your own API keys to use external LLM providers in your
            workflows.
          </p>
          <APIKeyRow />
        </SettingsSection>
      </div>
    </AppLayout>
  );
}

// --- Sub-components ---

function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof UserIcon;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-6 mb-6"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-color)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} style={{ color: "var(--text-secondary)" }} />
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function SettingsRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-sm" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

function UsageMeter({
  label,
  subtitle,
  used,
  limit,
}: {
  label: string;
  subtitle?: string;
  used: number;
  limit: number;
}) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const barColor = isAtLimit
    ? "var(--accent-red)"
    : isNearLimit
      ? "var(--accent-orange)"
      : "var(--accent-blue)";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "var(--text-primary)" }}>
            {label}
          </span>
          {subtitle && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              ({subtitle})
            </span>
          )}
          {isAtLimit && (
            <AlertTriangle size={13} style={{ color: "var(--accent-red)" }} />
          )}
        </div>
        <span
          className="text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {used.toLocaleString()} /{" "}
          {limit >= 999999 ? "∞" : limit.toLocaleString()}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}

function APIKeyRow() {
  const [isEditing, setIsEditing] = useState(false);
  const [keyValue, setKeyValue] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [keyInfo, setKeyInfo] = useState<{
    is_set: boolean;
    masked_key: string | null;
  } | null>(null);

  // Fetch current key status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { default: api } = await import("@/lib/api");
        const r = await api.get("/api/settings/api-keys");
        setKeyInfo(r.data.openai);
      } catch {
        // Ignore
      }
    };
    fetchStatus();
  }, [status]);

  const handleSave = async () => {
    if (!keyValue.trim()) return;
    setStatus("saving");
    try {
      const { default: api } = await import("@/lib/api");
      await api.put("/api/settings/api-keys/openai", {
        openai_api_key: keyValue.trim(),
      });
      setStatus("saved");
      setIsEditing(false);
      setKeyValue("");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  const handleDelete = async () => {
    try {
      const { default: api } = await import("@/lib/api");
      await api.delete("/api/settings/api-keys/openai");
      setKeyInfo({ is_set: false, masked_key: null });
    } catch {
      // Ignore
    }
  };

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: "var(--bg-tertiary)",
        borderColor: "var(--border-color)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            OpenAI API Key
          </p>
          {keyInfo?.is_set ? (
            <p className="text-xs" style={{ color: "var(--accent-green)" }}>
              Configured: {keyInfo.masked_key}
            </p>
          ) : (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Not configured
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {keyInfo?.is_set && !isEditing && (
            <button
              onClick={handleDelete}
              className="text-xs px-2 py-1 rounded-md"
              style={{ color: "var(--accent-red)" }}
            >
              Remove
            </button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Cancel" : keyInfo?.is_set ? "Update" : "Add Key"}
          </Button>
        </div>
      </div>

      {isEditing && (
        <div className="flex items-center gap-2 mt-3">
          <input
            type="password"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            placeholder="sk-proj-..."
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
          />
          <Button
            size="sm"
            onClick={handleSave}
            loading={status === "saving"}
            disabled={!keyValue.trim()}
          >
            Save
          </Button>
        </div>
      )}

      {status === "saved" && (
        <p className="text-xs mt-2" style={{ color: "var(--accent-green)" }}>
          API key saved successfully
        </p>
      )}
      {status === "error" && (
        <p className="text-xs mt-2" style={{ color: "var(--accent-red)" }}>
          Failed to save API key. Make sure it starts with &quot;sk-&quot;
        </p>
      )}
    </div>
  );
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
