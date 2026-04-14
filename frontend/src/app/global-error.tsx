"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Global app error:", error);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          backgroundColor: "#0a0a0f",
          color: "#f0f0f5",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            borderRadius: 16,
            border: "1px solid #2a2a3d",
            backgroundColor: "#16161f",
            padding: 24,
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: "0 0 10px" }}>Unexpected application error</h2>
          <p style={{ margin: "0 0 18px", color: "#a0a0b8", lineHeight: 1.5 }}>
            A critical error interrupted the app. You can retry or return to the
            home page.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <button
              onClick={() => window.location.assign("/")}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                backgroundColor: "#252533",
                border: "1px solid #3a3a50",
                color: "#f0f0f5",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Go Home
            </button>
            <button
              onClick={reset}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                backgroundColor: "#3b82f6",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
