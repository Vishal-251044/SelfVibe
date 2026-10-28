"use client";

/**
 * Last-resort error screen (Next.js global-error): shown when the root layout
 * itself fails, so it brings its own <html> and plain styles. Reports to Sentry.
 */
import { useEffect } from "react";
import { reportError } from "@/lib/errorTracking";

/**
 * @param {{ error: Error & { digest?: string }, reset: () => void }} props
 */
export default function RootError({ error, reset }) {
  useEffect(() => {
    reportError(error, { digest: error?.digest, boundary: "root" });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          color: "#e5e7eb",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 12px", color: "#fff" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 24px", lineHeight: 1.6 }}>
            SelfVibe hit an unexpected error. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              padding: "0 24px",
              borderRadius: 999,
              border: 0,
              background: "#22c55e",
              color: "#000",
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
