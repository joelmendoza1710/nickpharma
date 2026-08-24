import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler } from "@/lib/api-handler";
import { invalidateSettingsCache } from "@/lib/settings";
import { z } from "zod";

// Claves de configuración con valores por defecto
const DEFAULT_SETTINGS: Record<string, { value: string; label: string }> = {
  pharmacy_name: { value: "NickPharma", label: "Nombre de la farmacia" },
  pharmacy_tagline: { value: "Cuidamos de ti", label: "Eslogan" },
  pharmacy_nit: { value: "900.123.456-7", label: "NIT" },
  pharmacy_phone: { value: "+57 601 555 0011", label: "Teléfono" },
  pharmacy_address: { value: "Calle 123 #45-67, Bogotá", label: "Dirección" },
  pharmacy_email: { value: "contacto@nickpharma.com", label: "Email" },
  points_rate: { value: "100", label: "Puntos por dólar (canje)" },
  points_earn_rate: { value: "10", label: "Dólares por punto (acumulación)" },
  expiry_warning_days: { value: "90", label: "Días para alerta de vencimiento" },
  expiry_critical_days: { value: "30", label: "Días para vencimiento crítico" },
  low_stock_threshold: { value: "10", label: "Stock mínimo por defecto" },
  invoice_prefix: { value: "FAC", label: "Prefijo de factura" },
  invoice_start: { value: "1001", label: "Número de factura inicial" },
};

// GET /api/settings — obtener toda la configuración
export const GET = withErrorHandler(async () => {
  const { response } = await requirePermission("users:manage");
  if (response) return response;

  const settings = await db.settings.findMany();
  const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

  const result = Object.entries(DEFAULT_SETTINGS).map(([key, def]) => ({
    key,
    label: def.label,
    value: settingsMap.get(key) ?? def.value,
  }));

  return NextResponse.json({ settings: result });
});

const updateSchema = z.object({
  settings: z.record(z.string(), z.string()).refine(
    (obj) => Object.keys(obj).length > 0,
    "Debe incluir al menos una configuración"
  ),
});

// PUT /api/settings — actualizar configuración (batch)
export const PUT = withErrorHandler(async (req: NextRequest) => {
  const { session, response } = await requirePermission("users:manage");
  if (response) return response;

  const body = await req.json();
  const { settings: updates } = updateSchema.parse(body);

  const validKeys = Object.keys(DEFAULT_SETTINGS);
  const validUpdates = Object.entries(updates).filter(([key]) => validKeys.includes(key));

  if (validUpdates.length === 0) {
    return NextResponse.json({ error: "No hay configuraciones válidas para actualizar", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const userName = session!.user?.name ?? "Usuario";
  const results = await Promise.all(
    validUpdates.map(([key, value]) =>
      db.settings.upsert({
        where: { key },
        update: { value },
        create: { key, value, label: DEFAULT_SETTINGS[key]?.label ?? key },
      })
    )
  );

  // Registrar en auditoría
  await db.auditLog.create({
    data: {
      userId: (session!.user as any).id,
      userName,
      action: "settings.update",
      entityType: "settings",
      description: `Configuración actualizada: ${validUpdates.map(([k]) => k).join(", ")}`,
      metadata: JSON.stringify(Object.fromEntries(validUpdates)),
    },
  });

  // Invalidar caché
  invalidateSettingsCache();

  return NextResponse.json({
    updated: results.length,
    settings: results.map((r) => ({ key: r.key, label: r.label, value: r.value })),
  });
});
