import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, validateBody } from "@/lib/api-handler";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const closeSchema = z.object({ closingAmount: z.number().nonnegative(), notes: z.string().max(500).optional() });

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { session, response } = await requirePermission("cash:manage");
  if (response) return response;
  const userId = (session!.user as any).id as string;
  const { id } = await params;
  const data = await validateBody(closeSchema, req);
  const shift = await db.cashShift.findUnique({ where: { id } });
  if (!shift) return NextResponse.json({ error: "Turno no encontrado", code: "NOT_FOUND" }, { status: 404 });
  if (shift.status === "closed") return NextResponse.json({ error: "Ya está cerrado", code: "ALREADY_CLOSED" }, { status: 409 });

  const sales = await db.sale.findMany({ where: { userId: shift.userId, status: "completed", createdAt: { gte: shift.openedAt } }, select: { total: true, paymentMethod: true } });
  const voidedSales = await db.sale.findMany({ where: { userId: shift.userId, status: "voided", createdAt: { gte: shift.openedAt } }, select: { total: true, paymentMethod: true } });
  const cashSales = sales.filter(s => s.paymentMethod === "cash").reduce((s, x) => s + x.total, 0);
  const voidedCash = voidedSales.filter(s => s.paymentMethod === "cash").reduce((s, x) => s + x.total, 0);
  const expectedAmount = +(shift.openingAmount + cashSales - voidedCash).toFixed(2);
  const difference = +(data.closingAmount - expectedAmount).toFixed(2);

  const closed = await db.cashShift.update({ where: { id }, data: { status: "closed", closingAmount: +data.closingAmount.toFixed(2), expectedAmount, difference, notes: data.notes ?? shift.notes, closedAt: new Date() }, include: { user: { select: { id: true, name: true, role: true } } } });
  const result = { closingAmount: closed.closingAmount, expectedAmount, difference };
  await auditLog({
    userId: (session!.user as any).id,
    userName: session!.user?.name ?? "Usuario",
    action: "cash.close",
    entityType: "cash",
    entityId: id,
    description: `Turno cerrado · Diferencia: ${result.difference ?? 0}`,
    metadata: { closingAmount: result.closingAmount, expectedAmount: result.expectedAmount, difference: result.difference },
  });
  return NextResponse.json({ shift: closed, message: difference === 0 ? "Caja cuadrada" : difference > 0 ? `Sobrante de ${difference}` : `Faltante de ${Math.abs(difference)}`, expectedAmount, difference });
});
