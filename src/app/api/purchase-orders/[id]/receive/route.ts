import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, validateBody } from "@/lib/api-handler";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const receiveSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1),
    receivedQty: z.number().int().nonnegative(),
    lotNumber: z.string().min(1).max(50),
    expiryDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Fecha inválida"),
  })).min(1),
});

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { session, response } = await requirePermission("suppliers:manage");
  if (response) return response;
  const userId = (session!.user as any).id as string;
  const { id } = await params;
  const data = await validateBody(receiveSchema, req);
  const order = await db.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Orden no encontrada", code: "NOT_FOUND" }, { status: 404 });
  if (order.status === "received") return NextResponse.json({ error: "Ya recibida", code: "ALREADY_RECEIVED" }, { status: 409 });

  const result = await db.$transaction(async (tx) => {
    for (const recv of data.items) {
      const item = order.items.find(i => i.id === recv.id);
      if (!item) continue;
      if (recv.receivedQty <= 0) continue;
      await tx.lot.create({ data: { productId: item.productId, lotNumber: recv.lotNumber, expiryDate: new Date(recv.expiryDate), quantity: recv.receivedQty, initialQty: recv.receivedQty } });
      await tx.purchaseOrderItem.update({ where: { id: recv.id }, data: { receivedQty: { increment: recv.receivedQty }, lotNumber: recv.lotNumber, expiryDate: new Date(recv.expiryDate) } });
      if (item.unitCost > 0) await tx.product.update({ where: { id: item.productId }, data: { costPrice: item.unitCost } });
    }
    return tx.purchaseOrder.update({ where: { id }, data: { status: "received", receivedAt: new Date() }, include: { supplier: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true, dosage: true } } } } } });
  });

  await auditLog({ userId, userName: session!.user?.name ?? "Usuario", action: "po.receive", entityType: "purchase-order", entityId: id, description: `Orden ${order.orderNumber} recibida · ${result.supplier.name}`, metadata: { orderNumber: order.orderNumber, supplier: result.supplier.name, itemsReceived: data.items.length } });

  return NextResponse.json({ order: result, message: `Orden ${order.orderNumber} recibida. Stock actualizado.` });
});
