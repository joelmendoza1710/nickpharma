import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, validateBody } from "@/lib/api-handler";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const supplierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactName: z.string().max(200).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  address: z.string().max(300).nullable().optional(),
  taxId: z.string().max(50).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  active: z.boolean().optional(),
});

// GET /api/suppliers/[id] — detalle con métricas
export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { response } = await requirePermission("suppliers:manage");
  if (response) return response;
  const { id } = await params;

  const [supplier, orders] = await Promise.all([
    db.supplier.findUnique({
      where: { id },
      include: { _count: { select: { purchaseOrders: true } } },
    }),
    db.purchaseOrder.findMany({
      where: { supplierId: id },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { product: { select: { id: true, name: true, dosage: true } } } },
      },
      take: 50,
    }),
  ]);

  if (!supplier) return NextResponse.json({ error: "Proveedor no encontrado", code: "NOT_FOUND" }, { status: 404 });

  const totalOrders = orders.length;
  const receivedOrders = orders.filter((o) => o.status === "received");
  const totalPurchased = orders.reduce((s, o) => s + o.total, 0);

  const deliveryTimes = receivedOrders
    .filter((o) => o.orderedAt && o.receivedAt)
    .map((o) => Math.round((o.receivedAt!.getTime() - o.orderedAt!.getTime()) / (1000 * 60 * 60 * 24)));
  const avgDeliveryDays = deliveryTimes.length > 0
    ? Math.round(deliveryTimes.reduce((s, d) => s + d, 0) / deliveryTimes.length)
    : null;

  const prodMap = new Map<string, { id: string; name: string; dosage: string | null; totalQty: number; totalReceived: number; totalSpent: number; lastOrder: string }>();
  const allItems = await db.purchaseOrderItem.findMany({
    where: { purchaseOrder: { supplierId: id } },
    select: { productId: true, product: { select: { name: true, dosage: true } }, quantity: true, receivedQty: true, lineTotal: true, purchaseOrder: { select: { createdAt: true } } },
  });
  for (const it of allItems) {
    const cur = prodMap.get(it.productId) ?? { id: it.productId, name: it.product.name, dosage: it.product.dosage, totalQty: 0, totalReceived: 0, totalSpent: 0, lastOrder: it.purchaseOrder.createdAt.toISOString() };
    cur.totalQty += it.quantity; cur.totalReceived += it.receivedQty; cur.totalSpent += it.lineTotal;
    if (it.purchaseOrder.createdAt.toISOString() > cur.lastOrder) cur.lastOrder = it.purchaseOrder.createdAt.toISOString();
    prodMap.set(it.productId, cur);
  }
  const productsSupplied = Array.from(prodMap.values()).map((p) => ({ ...p, totalSpent: +p.totalSpent.toFixed(2) })).sort((a, b) => b.totalSpent - a.totalSpent);

  const recentOrders = orders.slice(0, 10).map((o) => ({
    id: o.id, orderNumber: o.orderNumber, status: o.status, total: o.total,
    createdAt: o.createdAt.toISOString(), orderedAt: o.orderedAt?.toISOString() ?? null, receivedAt: o.receivedAt?.toISOString() ?? null,
    itemCount: o.items.length, totalQty: o.items.reduce((s, it) => s + it.quantity, 0),
  }));

  return NextResponse.json({
    supplier,
    metrics: { totalOrders, receivedCount: receivedOrders.length, cancelledCount: orders.filter((o) => o.status === "cancelled").length, pendingCount: orders.filter((o) => o.status !== "received" && o.status !== "cancelled").length, totalPurchased: +totalPurchased.toFixed(2), avgDeliveryDays, productsCount: productsSupplied.length, lastOrderDate: orders[0]?.createdAt.toISOString() ?? null },
    recentOrders,
    productsSupplied,
  });
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { session, response } = await requirePermission("suppliers:manage");
  if (response) return response;
  const { id } = await params;
  const data = await validateBody(supplierSchema, req);
  const updated = await db.supplier.update({ where: { id }, data: { ...data, email: data.email || null, contactName: data.contactName || null, phone: data.phone || null, address: data.address || null, taxId: data.taxId || null, notes: data.notes || null } });
  await auditLog({ userId: (session!.user as any).id, userName: session!.user?.name ?? "Usuario", action: "supplier.update", entityType: "supplier", entityId: id, description: `Proveedor actualizado: ${updated.name}`, metadata: { fields: Object.keys(data) } });
  return NextResponse.json({ supplier: updated });
});

export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { session, response } = await requirePermission("suppliers:manage");
  if (response) return response;
  const { id } = await params;
  const supplier = await db.supplier.findUnique({ where: { id }, select: { name: true } });
  await db.supplier.update({ where: { id }, data: { active: false } });
  await auditLog({ userId: (session!.user as any).id, userName: session!.user?.name ?? "Usuario", action: "supplier.deactivate", entityType: "supplier", entityId: id, description: `Proveedor desactivado: ${supplier?.name ?? id}`, metadata: {} });
  return NextResponse.json({ ok: true });
});
