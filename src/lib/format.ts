// Utilidades de formato para el sistema de farmacia

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyDetailed(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Calcula días hasta el vencimiento
export function daysUntilExpiry(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Clasifica el estado de vencimiento
export type ExpiryStatus = "expired" | "critical" | "warning" | "ok";

export function getExpiryStatus(date: Date | string): ExpiryStatus {
  const days = daysUntilExpiry(date);
  if (days < 0) return "expired";
  if (days <= 30) return "critical";
  if (days <= 90) return "warning";
  return "ok";
}

// Devuelve clase de color para etiqueta de dosis según la concentración
export function getDosageColorClass(dosage: string | null | undefined): string {
  if (!dosage) return "bg-muted text-muted-foreground";
  const d = dosage.toLowerCase();
  // Intenta extraer número
  const match = d.match(/(\d+(?:\.\d+)?)/);
  const num = match ? parseFloat(match[1]) : 0;
  // Diferentes presentaciones
  if (d.includes("ui")) return "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300";
  if (d.includes("mg/5ml") || d.includes("ml")) return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
  if (d.includes("%")) return "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300";
  if (d.includes("g") && !d.includes("mg")) return "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300";
  // Por magnitud: bajo/medio/alto
  if (num === 0) return "bg-muted text-muted-foreground";
  if (num < 200) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  if (num < 500) return "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300";
  if (num < 800) return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
  return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
}

// Etiqueta legible de método de pago
export function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    mixed: "Mixto",
  };
  return map[method] ?? method;
}
