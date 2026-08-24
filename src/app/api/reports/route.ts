import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, validateQuery } from "@/lib/api-handler";
import { reportsQuerySchema } from "@/lib/schemas";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { response } = await requirePermission("reports:view");
  if (response) return response;

  const query = validateQuery(reportsQuerySchema, req);
  const days = parseInt(query.days ?? "30");
  const categoryId = query.categoryId;
  const paymentMethod = query.paymentMethod;

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const saleItems = await db.saleItem.findMany({
    where: {
      sale: { createdAt: { gte: from }, status: "completed" },
    },
    select: {
      quantity: true,
      lineTotal: true,
      unitPrice: true,
      product: {
        select: {
          id: true,
          name: true,
          dosage: true,
          costPrice: true,
          categoryId: true,
          category: { select: { name: true, color: true } },
        },
      },
      sale: { select: { createdAt: true, paymentMethod: true } },
    },
  });

  // --- Ventas por categoría ---
  const catMap = new Map<string, { name: string; color: string; total: number; qty: number; cost: number }>();
  for (const it of saleItems) {
    const key = it.product.category.name;
    const cur = catMap.get(key) ?? {
      name: it.product.category.name,
      color: it.product.category.color,
      total: 0,
      qty: 0,
      cost: 0,
    };
    cur.total += it.lineTotal;
    cur.qty += it.quantity;
    cur.cost += it.product.costPrice * it.quantity;
    catMap.set(key, cur);
  }
  const byCategory = Array.from(catMap.values())
    .map((c) => ({
      ...c,
      total: +c.total.toFixed(2),
      cost: +c.cost.toFixed(2),
      profit: +(c.total - c.cost).toFixed(2),
      margin: c.total > 0 ? +(((c.total - c.cost) / c.total) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // --- Ventas por día ---
  const dayMap = new Map<string, { total: number; count: number; qty: number }>();
  for (const it of saleItems) {
    const dKey = it.sale.createdAt.toISOString().slice(0, 10);
    const cur = dayMap.get(dKey) ?? { total: 0, count: 0, qty: 0 };
    cur.total += it.lineTotal;
    cur.qty += it.quantity;
    dayMap.set(dKey, cur);
  }
  // Contar ventas únicas por día
  const sales = await db.sale.findMany({
    where: { createdAt: { gte: from }, status: "completed" },
    select: { createdAt: true, total: true, paymentMethod: true, cashierName: true, discount: true, pointsDiscount: true },
  });
  const dayCountMap = new Map<string, number>();
  for (const s of sales) {
    const dKey = s.createdAt.toISOString().slice(0, 10);
    dayCountMap.set(dKey, (dayCountMap.get(dKey) ?? 0) + 1);
  }
  const byDay = Array.from(dayMap.entries())
    .map(([date, v]) => ({
      date,
      label: new Date(date).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
      }),
      total: +v.total.toFixed(2),
      count: dayCountMap.get(date) ?? 0,
      qty: v.qty,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- Ventas por método de pago ---
  const payMap = new Map<string, { total: number; count: number }>();
  for (const s of sales) {
    const cur = payMap.get(s.paymentMethod) ?? { total: 0, count: 0 };
    cur.total += s.total;
    cur.count += 1;
    payMap.set(s.paymentMethod, cur);
  }
  const byPayment = Array.from(payMap.entries()).map(([method, v]) => ({
    method,
    total: +v.total.toFixed(2),
    count: v.count,
  }));

  // --- Productos por rentabilidad ---
  const prodMap = new Map<
    string,
    { name: string; dosage: string | null; qty: number; revenue: number; cost: number }
  >();
  for (const it of saleItems) {
    const key = it.product.id;
    const cur = prodMap.get(key) ?? {
      name: it.product.name,
      dosage: it.product.dosage,
      qty: 0,
      revenue: 0,
      cost: 0,
    };
    cur.qty += it.quantity;
    cur.revenue += it.lineTotal;
    cur.cost += it.product.costPrice * it.quantity;
    prodMap.set(key, cur);
  }
  const byProfit = Array.from(prodMap.values())
    .map((p) => ({
      ...p,
      revenue: +p.revenue.toFixed(2),
      cost: +p.cost.toFixed(2),
      profit: +(p.revenue - p.cost).toFixed(2),
      margin: p.revenue > 0 ? +(((p.revenue - p.cost) / p.revenue) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.profit - a.profit);

  // --- Ventas por cajero ---
  const cashierMap = new Map<string, { name: string; salesCount: number; revenue: number; discount: number; pointsDiscount: number }>();
  for (const s of sales) {
    const cur = cashierMap.get(s.cashierName) ?? { name: s.cashierName, salesCount: 0, revenue: 0, discount: 0, pointsDiscount: 0 };
    cur.salesCount += 1;
    cur.revenue += s.total;
    cur.discount += s.discount;
    cur.pointsDiscount += s.pointsDiscount;
    cashierMap.set(s.cashierName, cur);
  }
  // Unidades por cajero
  const cashierUnits = await db.saleItem.groupBy({
    by: ["saleId"],
    where: { sale: { createdAt: { gte: from }, status: "completed" } },
    _sum: { quantity: true },
  });
  const saleIdToCashier = new Map(sales.map((s) => [s.createdAt.toISOString() + s.cashierName, s.cashierName]));
  // Approximación: sumar unidades por cajero usando saleId mapping
  const saleIds = await db.sale.findMany({ where: { createdAt: { gte: from }, status: "completed" }, select: { id: true, cashierName: true } });
  const saleIdMap = new Map(saleIds.map((s) => [s.id, s.cashierName]));
  for (const cu of cashierUnits) {
    const cname = saleIdMap.get(cu.saleId);
    if (cname) {
      const cur = cashierMap.get(cname);
      if (cur) (cur as any).units = ((cur as any).units ?? 0) + (cu._sum.quantity ?? 0);
    }
  }
  const byCashier = Array.from(cashierMap.values())
    .map((c: any) => ({
      name: c.name,
      salesCount: c.salesCount,
      revenue: +c.revenue.toFixed(2),
      discount: +c.discount.toFixed(2),
      pointsDiscount: +c.pointsDiscount.toFixed(2),
      units: c.units ?? 0,
      avgTicket: c.salesCount > 0 ? +(c.revenue / c.salesCount).toFixed(2) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // --- Totales globales del período ---
  const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
  const totalCost = saleItems.reduce((s, it) => s + it.product.costPrice * it.quantity, 0);
  const totalProfit = totalRevenue - totalCost;
  const totalUnits = saleItems.reduce((s, it) => s + it.quantity, 0);

  return NextResponse.json({
    period: { days, from: from.toISOString(), to: now.toISOString() },
    summary: {
      totalRevenue: +totalRevenue.toFixed(2),
      totalCost: +totalCost.toFixed(2),
      totalProfit: +totalProfit.toFixed(2),
      margin: totalRevenue > 0 ? +((totalProfit / totalRevenue) * 100).toFixed(1) : 0,
      totalSales: sales.length,
      totalUnits,
      avgTicket: sales.length > 0 ? +(totalRevenue / sales.length).toFixed(2) : 0,
    },
    byCategory,
    byDay,
    byPayment,
    byCashier,
    byProfit: byProfit.slice(0, 15),
  });
});
