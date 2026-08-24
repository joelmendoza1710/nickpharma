import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandlerSimple } from "@/lib/api-handler";
import { getTypedSettings } from "@/lib/settings";

export const GET = withErrorHandlerSimple(async () => {
  const { response } = await requirePermission("dashboard:view");
  if (response) return response;

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);

  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // --- Ventas de hoy ---
  const todaySales = await db.sale.findMany({
    where: { createdAt: { gte: startToday }, status: "completed" },
    select: { total: true, createdAt: true },
  });
  const todayTotal = todaySales.reduce((s, x) => s + x.total, 0);
  const todayCount = todaySales.length;

  // --- Ventas de ayer ---
  const yesterdaySales = await db.sale.findMany({
    where: {
      createdAt: { gte: startYesterday, lt: startToday },
      status: "completed",
    },
    select: { total: true },
  });
  const yesterdayTotal = yesterdaySales.reduce((s, x) => s + x.total, 0);

  // --- Ventas del mes y mes anterior ---
  const monthSales = await db.sale.findMany({
    where: { createdAt: { gte: startMonth }, status: "completed" },
    select: { total: true, subtotal: true },
  });
  const monthTotal = monthSales.reduce((s, x) => s + x.total, 0);

  const prevMonthSales = await db.sale.findMany({
    where: {
      createdAt: { gte: startPrevMonth, lt: startMonth },
      status: "completed",
    },
    select: { total: true },
  });
  const prevMonthTotal = prevMonthSales.reduce((s, x) => s + x.total, 0);

  // --- Serie de ventas últimos 14 días ---
  const fourteenAgo = new Date(now);
  fourteenAgo.setDate(fourteenAgo.getDate() - 13);
  fourteenAgo.setHours(0, 0, 0, 0);
  const recentSales = await db.sale.findMany({
    where: { createdAt: { gte: fourteenAgo }, status: "completed" },
    select: { total: true, createdAt: true },
  });
  const dailySeries: { date: string; label: string; total: number; count: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(fourteenAgo);
    d.setDate(d.getDate() + i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const dayItems = recentSales.filter(
      (s) => s.createdAt >= d && s.createdAt < next
    );
    dailySeries.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
      total: +dayItems.reduce((s, x) => s + x.total, 0).toFixed(2),
      count: dayItems.length,
    });
  }

  // --- Top productos más vendidos (últimos 30 días) ---
  const thirtyAgo = new Date(now);
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const topItems = await db.saleItem.findMany({
    where: { sale: { createdAt: { gte: thirtyAgo }, status: "completed" } },
    select: {
      quantity: true,
      lineTotal: true,
      product: {
        select: {
          id: true,
          name: true,
          dosage: true,
          presentation: true,
          costPrice: true,
        },
      },
    },
  });
  const productAgg = new Map<
    string,
    {
      id: string;
      name: string;
      dosage: string | null;
      presentation: string | null;
      quantity: number;
      revenue: number;
      cost: number;
    }
  >();
  for (const it of topItems) {
    const key = it.product.id;
    const cur = productAgg.get(key) ?? {
      id: it.product.id,
      name: it.product.name,
      dosage: it.product.dosage,
      presentation: it.product.presentation,
      quantity: 0,
      revenue: 0,
      cost: 0,
    };
    cur.quantity += it.quantity;
    cur.revenue += it.lineTotal;
    cur.cost += it.product.costPrice * it.quantity;
    productAgg.set(key, cur);
  }
  const topProducts = Array.from(productAgg.values())
    .map((p) => ({
      ...p,
      revenue: +p.revenue.toFixed(2),
      profit: +(p.revenue - p.cost).toFixed(2),
      margin: p.revenue > 0 ? +(((p.revenue - p.cost) / p.revenue) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  // --- Métricas de inventario + listas accionables ---
  const products = await db.product.findMany({
    include: {
      lots: { select: { quantity: true, expiryDate: true, lotNumber: true }, orderBy: { expiryDate: "asc" } },
      category: { select: { name: true } },
    },
  });
  let totalStock = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const inventoryValue = products.reduce((s, p) => {
    const stock = p.lots.reduce((a, l) => a + l.quantity, 0);
    totalStock += stock;
    if (stock === 0) outOfStockCount++;
    else if (stock <= p.minStock) lowStockCount++;
    return s + stock * p.costPrice;
  }, 0);

  // Listas accionables: productos con stock bajo (top 8)
  const lowStockProducts = products
    .filter((p) => {
      const stock = p.lots.reduce((a, l) => a + l.quantity, 0);
      return stock > 0 && stock <= p.minStock;
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      dosage: p.dosage,
      stock: p.lots.reduce((a, l) => a + l.quantity, 0),
      minStock: p.minStock,
      categoryName: p.category.name,
    }))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 8);

  // Productos agotados (top 8)
  const outOfStockProducts = products
    .filter((p) => p.lots.reduce((a, l) => a + l.quantity, 0) === 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      dosage: p.dosage,
      minStock: p.minStock,
      categoryName: p.category.name,
    }))
    .slice(0, 8);

  // --- Vencimientos próximos (umbral configurable via settings) ---
  const settings = await getTypedSettings();
  const expiryWarningDays = settings.alerts.expiryWarningDays;
  const soon = new Date(now);
  soon.setDate(soon.getDate() + expiryWarningDays);
  const expiringLots = await db.lot.findMany({
    where: { expiryDate: { lte: soon }, quantity: { gt: 0 } },
    include: { product: { select: { name: true, dosage: true, id: true } } },
  });
  const expiredCount = expiringLots.filter((l) => l.expiryDate < now).length;

  // Lotes por vencer (próximos 90 días, no vencidos, top 8 más urgentes)
  const expiringSoonLots = expiringLots
    .filter((l) => l.expiryDate >= now)
    .map((l) => {
      const days = Math.round((l.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: l.product.id,
        lotId: l.id,
        lotNumber: l.lotNumber,
        name: l.product.name,
        dosage: l.product.dosage,
        quantity: l.quantity,
        expiryDate: l.expiryDate.toISOString(),
        daysToExpiry: days,
      };
    })
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry)
    .slice(0, 8);

  // Lotes vencidos (top 8)
  const expiredLots = expiringLots
    .filter((l) => l.expiryDate < now)
    .map((l) => {
      const days = Math.round((l.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: l.product.id,
        lotId: l.id,
        lotNumber: l.lotNumber,
        name: l.product.name,
        dosage: l.product.dosage,
        quantity: l.quantity,
        expiryDate: l.expiryDate.toISOString(),
        daysToExpiry: days,
      };
    })
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry)
    .slice(0, 8);

  // --- Ventas por método de pago (últimos 30 días) ---
  const paymentAgg = await db.sale.groupBy({
    by: ["paymentMethod"],
    where: { createdAt: { gte: thirtyAgo }, status: "completed" },
    _sum: { total: true },
    _count: true,
  });

  // Ticket promedio
  const avgTicket = todayCount > 0 ? todayTotal / todayCount : 0;

  // Variaciones porcentuales
  const dayVariation =
    yesterdayTotal > 0
      ? +(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100).toFixed(1)
      : todayTotal > 0
      ? 100
      : 0;
  const monthVariation =
    prevMonthTotal > 0
      ? +(((monthTotal - prevMonthTotal) / prevMonthTotal) * 100).toFixed(1)
      : monthTotal > 0
      ? 100
      : 0;

  return NextResponse.json({
    kpis: {
      todayTotal: +todayTotal.toFixed(2),
      todayCount,
      yesterdayTotal: +yesterdayTotal.toFixed(2),
      dayVariation,
      monthTotal: +monthTotal.toFixed(2),
      prevMonthTotal: +prevMonthTotal.toFixed(2),
      monthVariation,
      avgTicket: +avgTicket.toFixed(2),
      inventoryValue: +inventoryValue.toFixed(2),
      totalStock,
      lowStockCount,
      outOfStockCount,
      expiringSoonCount: expiringLots.filter((l) => l.expiryDate >= now).length,
      expiredCount,
    },
    alerts: {
      lowStock: lowStockProducts,
      outOfStock: outOfStockProducts,
      expiringSoon: expiringSoonLots,
      expired: expiredLots,
    },
    dailySeries,
    topProducts,
    paymentAgg: paymentAgg.map((p) => ({
      method: p.paymentMethod,
      total: +(p._sum.total ?? 0).toFixed(2),
      count: p._count,
    })),
  });
});
