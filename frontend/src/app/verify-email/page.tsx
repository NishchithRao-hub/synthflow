// frontend/src/app/verify-email/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";

type Status = "verifying" | "success" | "error";

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
  return "Verification failed. The link may be invalid or expired.";
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [message, setMessage] = useState(
    token ? "" : "No verification token found in this link.",
  );

  useEffect(() => {
    if (!token) return;

    api
      .post("/api/auth/verify-email", { token })
      .then(() => {
        setStatus("success");
        setMessage("Your email has been verified. You can now sign in.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(extractErrorMessage(err));
      });
  }, [token]);

  const icon =
    status === "verifying" ? "⏳" : status === "success" ? "✅" : "❌";
  const heading =
    status === "verifying"
      ? "Verifying your email…"
      : status === "success"
        ? "Email verified!"
        : "Verification failed";

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
        {/* Logo */}
        <Image
          src="/logo.png"
          alt="SynthFlow"
          width={52}
          height={52}
          className="rounded-xl"
          style={{ display: "inline-block", marginBottom: 16 }}
        />

        <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>

        <h1
          style={{
            margin: "0 0 8px",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {heading}
        </h1>

        {status === "verifying" ? (
          <div
            style={{ display: "flex", justifyContent: "center", marginTop: 16 }}
          >
            <svg
              className="animate-spin"
              width={28}
              height={28}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-purple)"
              strokeWidth={2}
            >
              <circle cx={12} cy={12} r={10} strokeOpacity={0.25} />
              <path
                d="M4 12a8 8 0 018-8"
                strokeOpacity={0.75}
                strokeLinecap="round"
              />
            </svg>
          </div>
        ) : (
          <>
            <p
              style={{
                margin: "0 0 24px",
                fontSize: 14,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {message}
            </p>

            {status === "success" ? (
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
                Sign in to SynthFlow
              </Link>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
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
                <Link
                  href="/resend-verification"
                  style={{
                    fontSize: 13,
                    color: "var(--accent-purple)",
                    textDecoration: "none",
                  }}
                >
                  Resend verification email
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
