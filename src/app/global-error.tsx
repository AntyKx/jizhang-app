"use client";

import { useEffect } from "react";

// Only fires when the ROOT layout itself throws (e.g. ClerkProvider setup
// failing) — a case ordinary error.tsx can't catch since it renders inside
// the root layout, not around it. Next.js requires this file to render its
// own <html>/<body> since it fully replaces the root layout when it fires.
// Kept deliberately plain (no fonts, no BearIllustration, no other app
// code) — if the root layout is broken, the goal is to not depend on
// anything that could also be broken.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="zh-TW">
      <body style={{ margin: 0 }}>
        <div
          style={{
            display: "flex",
            minHeight: "100svh",
            width: "100%",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1.5rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            backgroundColor: "#fff8f0",
            color: "#3a2a20",
          }}
        >
          <span style={{ fontSize: "1.125rem", fontWeight: 500 }}>小熊記帳本</span>
          <p style={{ fontSize: "0.875rem", color: "#8a7565" }}>發生了一點問題，請再試一次。</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              borderRadius: "9999px",
              backgroundColor: "#e2874f",
              color: "#fff8f0",
              padding: "0.5rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "none",
            }}
          >
            重新嘗試
          </button>
        </div>
      </body>
    </html>
  );
}
