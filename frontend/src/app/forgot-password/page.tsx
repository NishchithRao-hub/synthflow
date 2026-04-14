// frontend/src/app/forgot-password/page.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as {
      response?: { data?: { error?: { message?: string }; message?: string } };
      message?: string;
    };
    if (e.response?.data?.error?.message) return e.response.data.error.message;
    if (typeof e.response?.data?.message === "string") {
      return e.response.data.message;
    }
    if (typeof e.message === "string" && e.message) return e.message;
  }
  return "Something went wrong. Please try again.";
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError(null);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
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
            Reset your password
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            {submitted
              ? "Check your inbox for a reset link."
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              If an account exists for{" "}
              <strong style={{ color: "var(--text-primary)" }}>{email}</strong>,
              a password reset link has been sent. It expires in 1 hour.
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
              Back to sign in
            </Link>
          </div>
        ) : (
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

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                htmlFor="forgot-email"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                Email address
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                style={{
                  padding: "10px 14px",
                  backgroundColor: "var(--bg-primary)",
                  border: `1px solid ${emailError ? "var(--accent-red)" : "var(--border-color)"}`,
                  borderRadius: 8,
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: "none",
                }}
                onFocus={(e) => {
                  if (!emailError)
                    e.currentTarget.style.borderColor = "var(--accent-purple)";
                }}
                onBlur={(e) => {
                  if (!emailError)
                    e.currentTarget.style.borderColor = "var(--border-color)";
                }}
              />
              {emailError && (
                <span style={{ fontSize: 12, color: "var(--accent-red)" }}>
                  {emailError}
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
              Send reset link
            </button>

            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              Remembered your password?{" "}
              <Link
                href="/login"
                style={{
                  color: "var(--accent-purple)",
                  textDecoration: "none",
                }}
              >
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
