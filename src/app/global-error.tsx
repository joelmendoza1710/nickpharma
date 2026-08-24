"use client";

import * as React from "react";

// Atención: este componente se renderiza FUERA del RootLayout (no hay html/body
// ni estilos de Tailwind disponibles). Por eso usamos estilos inline.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Error global (no capturado):", error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            padding: "1rem",
          }}
        >
          <div
            style={{
              maxWidth: "420px",
              width: "100%",
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "1.5rem", textAlign: "center" }}>
              <div
                style={{
                  margin: "0 auto 0.75rem",
                  width: "56px",
                  height: "56px",
                  borderRadius: "9999px",
                  background: "#fee2e2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
                  Error
                </span>
              </div>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0f172a", margin: 0 }}>
                Error crítico
              </h1>
              <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.5rem", marginBottom: 0 }}>
                Se produjo un error inesperado en la aplicación.
              </p>
            </div>
            {error?.message && (
              <div
                style={{
                  margin: "0 1.5rem",
                  padding: "0.75rem",
                  background: "#f1f5f9",
                  borderRadius: "8px",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  color: "#475569",
                  textAlign: "center",
                  wordBreak: "break-word",
                }}
              >
                {error.message}
                {error.digest ? ` · ${error.digest}` : ""}
              </div>
            )}
            <div
              style={{
                padding: "1.5rem",
                display: "flex",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <button
                onClick={() => reset()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Reintentar
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "#ffffff",
                  color: "#0f172a",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
