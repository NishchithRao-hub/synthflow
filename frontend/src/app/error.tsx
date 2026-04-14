"use client";

import { useEffect } from "react";
import Button from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 text-center"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-color)",
        }}
      >
        <h2
          className="text-xl font-semibold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Something went wrong
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          We could not load this page. Try again, or return to the dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => window.location.assign("/dashboard")}
          >
            Go to Dashboard
          </Button>
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
