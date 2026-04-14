// frontend/src/app/reset-password/page.tsx

"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import api from "@/lib/api";

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as {
      response?: {
        data?: {
          error?: { message?: string };
          message?: string;
          detail?: unknown;
        };
      };
      message?: string;
    };
    if (e.response?.data?.error?.message) return e.response.data.error.message;
    if (typeof e.response?.data?.message === "string") {
      return e.response.data.message;
    }
    const detail = e.response?.data?.detail;
    if (Array.isArray(detail) && detail.length > 0)
      return detail[0]?.msg ?? "Validation error";
    if (typeof detail === "string") return detail;
    if (typeof e.message === "string" && e.message) return e.message;
  }
  return "Something went wrong. Please try again.";
}

function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["", "#ef4444", "#f97316", "#22c55e", "#10b981"];

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>(
    {},
  );
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = passwordStrength(password);

  function validate(): boolean {
    const e: { password?: string; confirm?: string } = {};
    if (!password) e.password = "Password is required";
    else if (password.length < 8)
      e.password = "Password must be at least 8 characters";
    else if (!/[A-Z]/.test(password))
      e.password = "Must include an uppercase letter";
    else if (!/[a-z]/.test(password))
      e.password = "Must include a lowercase letter";
    else if (!/[0-9]/.test(password)) e.password = "Must include a number";
    if (!confirmPassword) e.confirm = "Please confirm your password";
    else if (password !== confirmPassword) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    const token = searchParams.get("token");
    if (!token) {
      setApiError("Invalid reset link. Please request a new one.");
      return;
    }

    setLoading(true);
    setApiError(null);
    try {
      await api.post("/api/auth/reset-password", {
        token,
        new_password: password,
      });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--bg-primary)", padding: "24px 16px" }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: 16,
            padding: "40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Password updated!
          </h1>
          <p
            style={{
              margin: "0 0 24px",
              fontSize: 14,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            Your password has been changed. Redirecting you to sign in…
          </p>
          <Link
            href="/login"
            style={{
              display: "inline-block",
              padding: "10px 28px",
              backgroundColor: "var(--accent-purple)",
              color: "#fff",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Sign in now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--bg-primary)", padding: "24px 16px" }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: 16,
          padding: "40px",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Image
            src="/logo.png"
            alt="SynthFlow"
            width={52}
            height={52}
            className="rounded-xl"
            style={{ display: "inline-block", marginBottom: 12 }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Choose a new password
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            Must be at least 8 characters with a number and uppercase letter.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          {apiError && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                backgroundColor: "rgba(239,68,68,.1)",
                color: "var(--accent-red)",
                border: "1px solid rgba(239,68,68,.25)",
              }}
            >
              {apiError}
            </div>
          )}

          {/* New password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor="reset-pw"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              New password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="reset-pw"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                style={{
                  width: "100%",
                  padding: "10px 42px 10px 14px",
                  backgroundColor: "var(--bg-primary)",
                  border: `1px solid ${errors.password ? "var(--accent-red)" : "var(--border-color)"}`,
                  borderRadius: 8,
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                tabIndex={-1}
                aria-label={showPw ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <span style={{ fontSize: 12, color: "var(--accent-red)" }}>
                {errors.password}
              </span>
            )}
            {/* Strength indicator */}
            {password && (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      backgroundColor:
                        n <= strength
                          ? STRENGTH_COLORS[strength]
                          : "var(--border-color)",
                      transition: "background-color .2s",
                    }}
                  />
                ))}
                <span
                  style={{
                    fontSize: 11,
                    color: STRENGTH_COLORS[strength],
                    marginLeft: 6,
                    minWidth: 40,
                  }}
                >
                  {STRENGTH_LABELS[strength]}
                </span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor="reset-confirm"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              Confirm new password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="reset-confirm"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                style={{
                  width: "100%",
                  padding: "10px 42px 10px 14px",
                  backgroundColor: "var(--bg-primary)",
                  border: `1px solid ${errors.confirm ? "var(--accent-red)" : "var(--border-color)"}`,
                  borderRadius: 8,
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                tabIndex={-1}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirm && (
              <span style={{ fontSize: 12, color: "var(--accent-red)" }}>
                {errors.confirm}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "11px 0",
              backgroundColor: "var(--accent-purple)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.75 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading && (
              <svg
                className="animate-spin"
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx={12} cy={12} r={10} strokeOpacity={0.25} />
                <path
                  d="M4 12a8 8 0 018-8"
                  strokeOpacity={0.75}
                  strokeLinecap="round"
                />
              </svg>
            )}
            Update password
          </button>

          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            <Link
              href="/login"
              style={{ color: "var(--accent-purple)", textDecoration: "none" }}
            >
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
