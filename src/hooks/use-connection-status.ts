"use client";

import { useEffect, useState } from "react";

type ConnectionStatus = "online" | "offline";

/**
 * Hook que reporta el estado de conexión del navegador.
 *
 * Escucha los eventos `online` y `offline` del `window` y devuelve
 * `{ status }` con el valor actualizado.
 *
 * @returns `{ status: "online" | "offline" }`
 */
export function useConnectionStatus(): { status: ConnectionStatus } {
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline"
  );

  useEffect(() => {
    const handleOnline = () => setStatus("online");
    const handleOffline = () => setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { status };
}
