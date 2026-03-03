// frontend/src/app/login/page.tsx

"use client";

import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string;
  }) => {
    if (!credentialResponse.credential) {
      setError("Google sign-in failed: no credential received");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(credentialResponse.credential);
      router.push("/dashboard");
    } catch {
      setError("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl border"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-color)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-xl mb-4"
            style={{ backgroundColor: "var(--accent-purple)" }}
          >
            <Zap size={28} color="white" />
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            SynthFlow
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            AI-powered workflow automation
          </p>
        </div>

        {/* Login form */}
        <div className="space-y-6">
          <div>
            <h2
              className="text-lg font-semibold text-center"
              style={{ color: "var(--text-primary)" }}
            >
              Sign in to your account
            </h2>
            <p
              className="mt-1 text-sm text-center"
              style={{ color: "var(--text-muted)" }}
            >
              Use your Google account to get started
            </p>
          </div>

          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                color: "var(--accent-red)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-4">
              <svg
                className="animate-spin h-8 w-8"
                style={{ color: "var(--accent-blue)" }}
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
          ) : (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() =>
                  setError("Google sign-in was cancelled or failed")
                }
                theme="filled_black"
                size="large"
                width="350"
                text="signin_with"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <p
          className="mt-8 text-xs text-center"
          style={{ color: "var(--text-muted)" }}
        >
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
