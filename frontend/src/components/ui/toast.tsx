"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  title?: string;
  variant: ToastVariant;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const MAX_TOASTS = 4;

function toastVisuals(variant: ToastVariant): {
  icon: React.ReactNode;
  borderColor: string;
  iconColor: string;
  bgColor: string;
} {
  if (variant === "success") {
    return {
      icon: <CheckCircle2 size={16} />,
      borderColor: "rgba(34,197,94,0.35)",
      iconColor: "var(--accent-green)",
      bgColor: "rgba(34,197,94,0.08)",
    };
  }
  if (variant === "error") {
    return {
      icon: <AlertCircle size={16} />,
      borderColor: "rgba(239,68,68,0.35)",
      iconColor: "var(--accent-red)",
      bgColor: "rgba(239,68,68,0.08)",
    };
  }
  return {
    icon: <Info size={16} />,
    borderColor: "rgba(59,130,246,0.35)",
    iconColor: "var(--accent-blue)",
    bgColor: "rgba(59,130,246,0.08)",
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info", title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const durationMs = variant === "error" ? 6000 : 4200;
      const nextToast: ToastItem = { id, message, title, variant, durationMs };

      setToasts((prev) => [nextToast, ...prev].slice(0, MAX_TOASTS));
      window.setTimeout(() => dismissToast(id), durationMs);
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message, title) => showToast(message, "success", title),
      error: (message, title) => showToast(message, "error", title),
      info: (message, title) => showToast(message, "info", title),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 90,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          width: "min(360px, calc(100vw - 32px))",
          pointerEvents: "none",
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const visuals = toastVisuals(toast.variant);
          return (
            <div
              key={toast.id}
              className="toast-enter"
              style={{
                pointerEvents: "auto",
                border: `1px solid ${visuals.borderColor}`,
                backgroundColor: visuals.bgColor,
                backdropFilter: "blur(8px)",
                borderRadius: 12,
                padding: "10px 12px",
                boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
              }}
            >
              <div
                style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
              >
                <div style={{ color: visuals.iconColor, marginTop: 1 }}>
                  {visuals.icon}
                </div>
                <div style={{ flex: 1 }}>
                  {toast.title && (
                    <p
                      style={{
                        margin: "0 0 2px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {toast.title}
                    </p>
                  )}
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {toast.message}
                  </p>
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss notification"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
