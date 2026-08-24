import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/format";

// GET /api/export/reports — exportar reporte analítico en CSV
// Acepta mismos filtros que /api/reports: days, from, to, categoryId, paymentMethod
export async function GET(req: NextRequest) {
  const { response } = await requirePermission("reports:view");
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const paymentMethod = searchParams.get("paymentMethod") ?? undefined;

  const now = new Date();
  let from: Date;
  let to: Date = now;
  if (fromParam) {
    from = new Date(fromParam);
    from.setHours(0, 0, 0, 0);
    if (toParam) { to = new Date(toParam); to.setHours(23, 59, 59, 999); }
    else { to = new Date(); to.setHours(23, 59, 59, 999); }
  } else {
    from = new Date(now);
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
  }

  const saleWhere: any = { createdAt: { gte: from, lte: to }, status: "completed" };
  if (paymentMethod) saleWhere.paymentMethod = paymentMethod;
  const productWhere: any = {};
  if (categoryId) productWhere.categoryId = categoryId;

  const [saleItems, sales] = await Promise.all([
    db.saleItem.findMany({
      where: { sale: saleWhere, product: productWhere },
      select: {
        quantity: true, lineTotal: true, unitPrice: true,
        product: { select: { id: true, name: true, dosage: true, costPrice: true, categoryId: true, category: { select: { name: true } } } },
        sale: { select: { createdAt: true, paymentMethod: true, invoiceNumber: true } },
      },
    }),
    db.sale.findMany({
      where: saleWhere,
      select: { createdAt: true, total: true, paymentMethod: true, invoiceNumber: true, cashierName: true },
    }),
  ]);

  // Agregados
  const catMap = new Map<string, { name: string; total: number; qty: number; cost: number }>();
  for (const it of saleItems) {
    const key = it.product.category.name;
    const cur = catMap.get(key) ?? { name: key, total: 0, qty: 0, cost: 0 };
    cur.total += it.lineTotal; cur.qty += it.quantity; cur.cost += it.product.costPrice * it.quantity;
    catMap.set(key, cur);
  }
  const byCategory = Array.from(catMap.values())
    .map((c) => ({ ...c, total: +c.total.toFixed(2), cost: +c.cost.toFixed(2), profit: +(c.total - c.cost).toFixed(2), margin: c.total > 0 ? +(((c.total - c.cost) / c.total) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.total - a.total);

  const prodMap = new Map<string, { name: string; dosage: string | null; qty: number; revenue: number; cost: number }>();
  for (const it of saleItems) {
    const key = it.product.id;
    const cur = prodMap.get(key) ?? { name: it.product.name, dosage: it.product.dosage, qty: 0, revenue: 0, cost: 0 };
    cur.qty += it.quantity; cur.revenue += it.lineTotal; cur.cost += it.product.costPrice * it.quantity;
    prodMap.set(key, cur);
  }
  const byProduct = Array.from(prodMap.values())
    .map((p) => ({ ...p, revenue: +p.revenue.toFixed(2), cost: +p.cost.toFixed(2), profit: +(p.revenue - p.cost).toFixed(2), margin: p.revenue > 0 ? +(((p.revenue - p.cost) / p.revenue) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.profit - a.profit);

  const cashierMap = new Map<string, { name: string; salesCount: number; revenue: number }>();
  for (const s of sales) {
    const cur = cashierMap.get(s.cashierName) ?? { name: s.cashierName, salesCount: 0, revenue: 0 };
    cur.salesCount += 1; cur.revenue += s.total;
    cashierMap.set(s.cashierName, cur);
  }
  const byCashier = Array.from(cashierMap.values())
    .map((c) => ({ ...c, revenue: +c.revenue.toFixed(2), avgTicket: c.salesCount > 0 ? +(c.revenue / c.salesCount).toFixed(2) : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  const payMap = new Map<string, { total: number; count: number }>();
  for (const s of sales) {
    const cur = payMap.get(s.paymentMethod) ?? { total: 0, count: 0 };
    cur.total += s.total; cur.count += 1;
    payMap.set(s.paymentMethod, cur);
  }
  const byPayment = Array.from(payMap.entries()).map(([method, v]) => ({ method, total: +v.total.toFixed(2), count: v.count }));

  const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
  const totalCost = saleItems.reduce((s, it) => s + it.product.costPrice * it.quantity, 0);
  const totalProfit = totalRevenue - totalCost;
  const totalUnits = saleItems.reduce((s, it) => s + it.quantity, 0);

  function esc(v: unknown): string {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const periodLabel = fromParam ? `${from.toISOString().slice(0, 10)} a ${to.toISOString().slice(0, 10)}` : `Últimos ${days} días`;
  const lines: string[][] = [];
  lines.push(["REPORTE DE VENTAS — NickPharma"]);
  lines.push(["Período", periodLabel]);
  lines.push(["Generado", new Date().toLocaleString("es-CO")]);
  if (categoryId) lines.push(["Filtro categoría", categoryId]);
  if (paymentMethod) lines.push(["Filtro pago", paymentMethod]);
  lines.push([]);
  lines.push(["MÉTRICAS GENERALES"]);
  lines.push(["Ingresos totales", formatCurrency(totalRevenue)]);
  lines.push(["Costo total", formatCurrency(totalCost)]);
  lines.push(["Utilidad bruta", formatCurrency(totalProfit)]);
  lines.push(["Margen %", `${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%`]);
  lines.push(["N° ventas", String(sales.length)]);
  lines.push(["Unidades vendidas", String(totalUnits)]);
  lines.push(["Ticket promedio", formatCurrency(sales.length > 0 ? totalRevenue / sales.length : 0)]);
  lines.push([]);
  lines.push(["VENTAS POR CATEGORÍA"]);
  lines.push(["Categoría", "Unidades", "Ingresos", "Costo", "Utilidad", "Margen %"]);
  for (const c of byCategory) lines.push([c.name, String(c.qty), formatCurrency(c.total), formatCurrency(c.cost), formatCurrency(c.profit), `${c.margin}%`]);
  lines.push([]);
  lines.push(["PRODUCTOS MÁS RENTABLES"]);
  lines.push(["Producto", "Dosis", "Unidades", "Ingresos", "Costo", "Utilidad", "Margen %"]);
  for (const p of byProduct) lines.push([p.name, p.dosage ?? "", String(p.qty), formatCurrency(p.revenue), formatCurrency(p.cost), formatCurrency(p.profit), `${p.margin}%`]);
  lines.push([]);
  lines.push(["VENTAS POR MÉTODO DE PAGO"]);
  lines.push(["Método", "N° Ventas", "Ingresos"]);
  for (const p of byPayment) lines.push([p.method, String(p.count), formatCurrency(p.total)]);
  lines.push([]);
  lines.push(["RENDIMIENTO POR CAJERO"]);
  lines.push(["Cajero", "N° Ventas", "Ingresos", "Ticket Promedio"]);
  for (const c of byCashier) lines.push([c.name, String(c.salesCount), formatCurrency(c.revenue), formatCurrency(c.avgTicket)]);

  const csv = "\uFEFF" + lines.map((r) => r.map(esc).join(",")).join("\r\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8;",
      "Content-Disposition": `attachment; filename="reporte-ventas-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
