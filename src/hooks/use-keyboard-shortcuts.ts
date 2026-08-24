"use client";

import { useEffect } from "react";

/**
 * Hook para registrar atajos de teclado globales.
 *
 * Las claves del objeto `shortcuts` describen combinaciones en formato legible:
 *   - "Ctrl+k"   → Ctrl+K (también Cmd+K en macOS)
 *   - "1".."9"   → teclas numéricas simples
 *   - "/"        → barra diagonal
 *   - "s"        → tecla de letra (minúsculas)
 *
 * Reglas:
 *   - Cuando el foco está en un INPUT/TEXTAREA/SELECT los atajos se ignoran,
 *     EXCEPTO "/" que funciona en cualquier parte (útil para enfocar búsqueda).
 *   - Se evita el comportamiento por defecto del navegador cuando hay match.
 *   - La limpieza se hace al desmontar.
 *
 * @example
 *   useKeyboardShortcuts({
 *     "Ctrl+k": (e) => e.preventDefault() || setSearchOpen(true),
 *     "/":      (e) => e.preventDefault() || inputRef.current?.focus(),
 *     "1":      () => navigate("dashboard"),
 *   });
 */
export function useKeyboardShortcuts(
  shortcuts: Record<string, (e: KeyboardEvent) => void>
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable === true;

      for (const key of Object.keys(shortcuts)) {
        const handlerFn = shortcuts[key];
        if (matchesShortcut(e, key)) {
          // "/" es global (incluso dentro de inputs); el resto se ignora en editables
          if (isEditable && key !== "/") continue;
          e.preventDefault();
          e.stopPropagation();
          handlerFn(e);
          return;
        }
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [shortcuts]);
}

/**
 * Compara un evento de teclado con la definición textual del atajo.
 * Soporta:
 *   - "Ctrl+k", "Ctrl+Shift+p", "Cmd+k"
 *   - teclas simples: "/", "1", "s", "Enter"
 */
function matchesShortcut(e: KeyboardEvent, definition: string): boolean {
  const parts = definition.toLowerCase().split("+").map((p) => p.trim());
  const key = parts[parts.length - 1];
  const needCtrl = parts.includes("ctrl") || parts.includes("cmd");
  const needMeta = parts.includes("cmd");
  const needShift = parts.includes("shift");
  const needAlt = parts.includes("alt");

  const ctrlOk = needCtrl ? e.ctrlKey || e.metaKey : true;
  const metaOk = needMeta ? e.metaKey : true;
  const shiftOk = needShift ? e.shiftKey : true;
  const altOk = needAlt ? e.altKey : true;

  // Si el atajo no exige Ctrl/Cmd, no permitir combinación con ellos (evita conflictos)
  const noMods =
    !needCtrl &&
    !needMeta &&
    !needShift &&
    !needAlt &&
    (e.ctrlKey || e.metaKey || e.altKey);

  if (!ctrlOk || !metaOk || !shiftOk || !altOk || noMods) return false;

  const pressed = e.key.toLowerCase();

  // Normalizaciones comunes
  if (key === "/") return pressed === "/";
  if (key === "enter") return pressed === "enter";
  if (key === "escape" || key === "esc") return pressed === "escape";

  // Letras y números: comparación directa
  if (key.length === 1) return pressed === key;

  // Teclas nombradas (space, etc.)
  return pressed === key;
}
