import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, validateBody } from "@/lib/api-handler";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const poQuerySchema = z.object({ status: z.enum(["draft", "ordered", "received", "cancelled"]).optional(), supplierId: z.string().optional(), limit: z.string().optional() }).passthrough();

const createPOSchema = z.object({
  supplierId: z.string().min(1),
  notes: z.string().max(500).nullable().optional(),
  expectedDate: z.string().optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive(), unitCost: z.number().nonnegative() })).min(1),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { response } = await requirePermission("suppliers:manage");
  if (response) return response;
  const { searchParams } = new URL(req.url);
  const where: any = {};
  if (searchParams.get("status")) where.status = searchParams.get("status");
  if (searchParams.get("supplierId")) where.supplierId = searchParams.get("supplierId");
  const orders = await db.purchaseOrder.findMany({ where, orderBy: { createdAt: "desc" }, take: parseInt(searchParams.get("limit") ?? "50"), include: { supplier: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true, dosage: true } } } } } });
  return NextResponse.json({ orders, total: orders.length });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { session, response } = await requirePermission("suppliers:manage");
  if (response) return response;
  const userId = (session!.user as any).id as string;
  const data = await validateBody(createPOSchema, req);
  const supplier = await db.supplier.findUnique({ where: { id: data.supplierId } });
  if (!supplier) return NextResponse.json({ error: "Proveedor no encontrado", code: "NOT_FOUND" }, { status: 404 });
  const itemsData = data.items.map(it => ({ productId: it.productId, quantity: it.quantity, unitCost: it.unitCost, lineTotal: +(it.quantity * it.unitCost).toFixed(2) }));
  const total = +itemsData.reduce((s, it) => s + it.lineTotal, 0).toFixed(2);
  const lastOrder = await db.purchaseOrder.findFirst({ orderBy: { orderNumber: "desc" } });
  let nextNum = 1; if (lastOrder?.orderNumber) { const m = lastOrder.orderNumber.match(/(\d+)/); if (m) nextNum = parseInt(m[1]) + 1; }
  const order = await db.purchaseOrder.create({ data: { orderNumber: `OC-${nextNum}`, supplierId: data.supplierId, userId, total, notes: data.notes ?? null, expectedDate: data.expectedDate ? new Date(data.expectedDate) : null, items: { create: itemsData } }, include: { supplier: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true, dosage: true } } } } } });
  await auditLog({ userId, userName: session!.user?.name ?? "Usuario", action: "po.create", entityType: "purchase-order", entityId: order.id, description: `Orden de compra ${order.orderNumber} · ${supplier.name} · ${total}`, metadata: { orderNumber: order.orderNumber, supplier: supplier.name, total, itemCount: itemsData.length } });
  return NextResponse.json({ order }, { status: 201 });
});
