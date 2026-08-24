import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandlerSimple } from "@/lib/api-handler";

export const GET = withErrorHandlerSimple(async () => {
  const { session, response } = await requirePermission("cash:manage");
  if (response) return response;
  const userId = (session!.user as any).id as string;
  const shift = await db.cashShift.findFirst({ where: { userId, status: "open" }, orderBy: { openedAt: "desc" }, include: { user: { select: { id: true, name: true, role: true } } } });
  if (!shift) return NextResponse.json({ shift: null });

  const sales = await db.sale.findMany({ where: { userId, status: "completed", createdAt: { gte: shift.openedAt } }, select: { total: true, paymentMethod: true } });
  const voidedSales = await db.sale.findMany({ where: { userId, status: "voided", createdAt: { gte: shift.openedAt } }, select: { total: true, paymentMethod: true } });
  const cashSales = sales.filter(s => s.paymentMethod === "cash").reduce((s, x) => s + x.total, 0);
  const voidedCash = voidedSales.filter(s => s.paymentMethod === "cash").reduce((s, x) => s + x.total, 0);
  const expectedAmount = +(shift.openingAmount + cashSales - voidedCash).toFixed(2);

  return NextResponse.json({ shift: { ...shift, summary: { salesCount: sales.length, totalSales: +sales.reduce((s, x) => s + x.total, 0).toFixed(2), cashSales: +cashSales.toFixed(2), cardSales: +sales.filter(s => s.paymentMethod === "card").reduce((s, x) => s + x.total, 0).toFixed(2), transferSales: +sales.filter(s => s.paymentMethod === "transfer").reduce((s, x) => s + x.total, 0).toFixed(2), voidedCount: voidedSales.length, voidedCash: +voidedCash.toFixed(2), expectedAmount } } });
});
