"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

/**
 * Hook que cierra la sesión del usuario tras `timeoutMinutes` de inactividad.
 *
 * - Rastrea mousemove, keydown, click y scroll.
 * - Reinicia el temporizador con cada actividad.
 * - Muestra una advertencia (toast) 1 minuto antes de cerrar sesión.
 * - Al vencer: llama `signOut({ redirect: false })` y redirige a `/login`.
 *
 * @param timeoutMinutes Minutos de inactividad antes del cierre de sesión.
 */
export function useIdleTimeout(timeoutMinutes: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnedRef = useRef(false);

  useEffect(() => {
    const TIMEOUT_MS = Math.max(timeoutMinutes, 1) * 60 * 1000;
    const WARNING_MS = 60 * 1000; // 1 minuto antes
    const WARN_AT = Math.max(TIMEOUT_MS - WARNING_MS, 0);

    const clearTimers = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
        warningRef.current = null;
      }
    };

    const logout = async () => {
      toast.info("Sesión cerrada por inactividad", {
        description: "Vuelve a iniciar sesión para continuar.",
      });
      try {
        await signOut({ redirect: false });
      } catch {
        // ignorar
      }
      window.location.href = "/login";
    };

    const showWarning = () => {
      if (warnedRef.current) return;
      warnedRef.current = true;
      toast.warning("Tu sesión expirará en 1 minuto", {
        description: "Realiza alguna acción para mantenerla activa.",
        duration: WARNING_MS,
      });
    };

    const reset = () => {
      if (warnedRef.current) warnedRef.current = false;
      clearTimers();
      if (WARN_AT > 0 && WARN_AT < TIMEOUT_MS) {
        warningRef.current = setTimeout(showWarning, WARN_AT);
      }
      timerRef.current = setTimeout(logout, TIMEOUT_MS);
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
    ];

    // Throttle ligero para no saturar el listener
    let lastReset = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastReset < 1000) return;
      lastReset = now;
      reset();
    };

    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    reset();

    return () => {
      events.forEach((ev) =>
        window.removeEventListener(ev, onActivity)
      );
      clearTimers();
    };
  }, [timeoutMinutes]);
}
