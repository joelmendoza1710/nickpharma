import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, withErrorHandlerSimple, validateBody } from "@/lib/api-handler";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const openSchema = z.object({ openingAmount: z.number().nonnegative(), notes: z.string().max(500).optional() });
const querySchema = z.object({ status: z.enum(["open", "closed"]).optional(), limit: z.string().optional() }).passthrough();

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { response } = await requirePermission("cash:manage");
  if (response) return response;
  const q = validateQuery(querySchema, req);
  const where: any = {};
  if (q.status) where.status = q.status;
  const shifts = await db.cashShift.findMany({ where, orderBy: { openedAt: "desc" }, take: parseInt(q.limit ?? "50"), include: { user: { select: { id: true, name: true, email: true, role: true } } } });
  return NextResponse.json({ shifts, total: shifts.length });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { session, response } = await requirePermission("cash:manage");
  if (response) return response;
  const userId = (session!.user as any).id as string;
  const data = await validateBody(openSchema, req);
  const open = await db.cashShift.findFirst({ where: { userId, status: "open" } });
  if (open) return NextResponse.json({ error: "Ya tienes un turno abierto", code: "SHIFT_ALREADY_OPEN" }, { status: 409 });
  const shift = await db.cashShift.create({ data: { userId, openingAmount: +data.openingAmount.toFixed(2), notes: data.notes ?? null, status: "open" }, include: { user: { select: { id: true, name: true, email: true, role: true } } } });
  await auditLog({
    userId: (session!.user as any).id,
    userName: session!.user?.name ?? "Usuario",
    action: "cash.open",
    entityType: "cash",
    entityId: shift.id,
    description: `Turno abierto · Apertura: ${data.openingAmount}`,
    metadata: { openingAmount: data.openingAmount },
  });
  return NextResponse.json({ shift }, { status: 201 });
});

function validateQuery(schema: any, req: NextRequest) { try { return schema.parse(Object.fromEntries(new URL(req.url).searchParams)); } catch { return {} as any; } }
