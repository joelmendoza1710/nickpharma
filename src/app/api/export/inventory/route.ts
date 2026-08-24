import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/format";

export async function GET(_req: NextRequest) {
  const { response } = await requirePermission("inventory:view");
  if (response) return response;

  const products = await db.product.findMany({
    include: { category: { select: { name: true } }, lots: { where: { quantity: { gt: 0 } }, orderBy: { expiryDate: "asc" } } },
    orderBy: { name: "asc" },
  });
  const now = new Date();

  function esc(v: unknown): string {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const headers = ["Nombre","Sustancia","Presentación","Dosis","Código Barras","Laboratorio","Categoría","Precio Venta","Precio Costo","Margen %","Stock Total","Stock Mín","Estado Stock","Valor Inventario","N° Lotes","Próximo Vencimiento","Días Venc.","Estado Venc.","Requiere Receta","IVA","CUM","Registro INVIMA","Venc. Registro","Acción Terapéutica"];
  const rows = products.map(p => {
    const stock = p.lots.reduce((s, l) => s + l.quantity, 0);
    const margin = p.salePrice > 0 ? +(((p.salePrice - p.costPrice) / p.salePrice) * 100).toFixed(1) : 0;
    const next = p.lots[0];
    const days = next ? Math.round((next.expiryDate.getTime() - now.getTime()) / 86400000) : null;
    let expSt = "Sin lotes";
    if (next) { if (days! < 0) expSt = "Vencido"; else if (days! <= 30) expSt = "Crítico"; else if (days! <= 90) expSt = "Por vencer"; else expSt = "Vigente"; }
    return [p.name, p.activeIngredient ?? "", p.presentation ?? "", p.dosage ?? "", p.barcode, p.laboratory ?? "", p.category.name,
      formatCurrency(p.salePrice), formatCurrency(p.costPrice), `${margin}%`, String(stock), String(p.minStock),
      stock === 0 ? "Agotado" : stock <= p.minStock ? "Stock bajo" : "Disponible",
      formatCurrency(stock * p.costPrice), String(p.lots.length),
      next ? formatDate(next.expiryDate) : "", days !== null ? String(days) : "", expSt,
      p.requiresPrescription ? "Sí" : "No", `${(p.taxRate * 100).toFixed(0)}%`,
      p.cum ?? "", p.invimaRegistration ?? "", p.invimaExpiryDate ? formatDate(p.invimaExpiryDate) : "", p.therapeuticAction ?? ""];
  });

  const csv = "\uFEFF" + [headers, ...rows].map(r => r.map(esc).join(",")).join("\r\n");
  return new NextResponse(csv, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8;", "Content-Disposition": `attachment; filename="inventario-${new Date().toISOString().slice(0,10)}.csv"` } });
}
