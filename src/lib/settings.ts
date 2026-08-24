import { db } from "@/lib/db";

// Defaults idénticos a /api/settings/route.ts
const DEFAULT_SETTINGS: Record<string, string> = {
  pharmacy_name: "NickPharma",
  pharmacy_tagline: "Cuidamos de ti",
  pharmacy_nit: "900.123.456-7",
  pharmacy_phone: "+57 601 555 0011",
  pharmacy_address: "Calle 123 #45-67, Bogotá",
  pharmacy_email: "contacto@nickpharma.com",
  points_rate: "100",
  points_earn_rate: "10",
  expiry_warning_days: "90",
  expiry_critical_days: "30",
  low_stock_threshold: "10",
  invoice_prefix: "FAC",
  invoice_start: "1001",
};

// Cache en memoria (TTL 60s)
let cache: { data: Record<string, string>; ts: number } | null = null;
const CACHE_TTL = 60_000;

/**
 * Helper server-side para leer configuración global.
 * Usa caché en memoria de 60s para evitar N+1 en APIs de alto tráfico.
 */
export async function getSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }

  const rows = await db.settings.findMany();
  const dbMap = new Map(rows.map((r) => [r.key, r.value]));

  const result: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (dbMap.has(key)) result[key] = dbMap.get(key)!;
  }

  cache = { data: result, ts: Date.now() };
  return result;
}

/**
 * Invalidar caché (llamar tras actualizar settings)
 */
export function invalidateSettingsCache() {
  cache = null;
}

/**
 * Helper tipado para acceder a settings con valores parseados
 */
export async function getTypedSettings() {
  const s = await getSettings();
  return {
    pharmacy: {
      name: s.pharmacy_name,
      tagline: s.pharmacy_tagline,
      nit: s.pharmacy_nit,
      phone: s.pharmacy_phone,
      address: s.pharmacy_address,
      email: s.pharmacy_email,
    },
    loyalty: {
      pointsRate: parseInt(s.points_rate) || 100,
      pointsEarnRate: parseInt(s.points_earn_rate) || 10,
    },
    alerts: {
      expiryWarningDays: parseInt(s.expiry_warning_days) || 90,
      expiryCriticalDays: parseInt(s.expiry_critical_days) || 30,
      lowStockThreshold: parseInt(s.low_stock_threshold) || 10,
    },
    invoicing: {
      prefix: s.invoice_prefix,
      start: parseInt(s.invoice_start) || 1001,
    },
  };
}
