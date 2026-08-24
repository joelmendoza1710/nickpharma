import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, validateBody } from "@/lib/api-handler";
import { getTypedSettings } from "@/lib/settings";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const voidSaleSchema = z.object({
  reason: z.string().min(3, "Indica el motivo de la anulación").max(500),
});

// POST /api/sales/[id]/void — anular venta, restaurar stock multi-lote
export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { session, response } = await requirePermission("sales:manage");
    if (response) return response;
    const userId = (session!.user as any).id as string;
    const { id } = await params;
    const { reason } = await validateBody(voidSaleSchema, req);

    const sale = await db.sale.findUnique({ where: { id }, include: { items: { include: { lotAllocations: true } } } });
    if (!sale) return NextResponse.json({ error: "Venta no encontrada", code: "NOT_FOUND" }, { status: 404 });
    if (sale.status === "voided") return NextResponse.json({ error: "Esta venta ya está anulada", code: "ALREADY_VOIDED" }, { status: 409 });

    const updated = await db.$transaction(async (tx) => {
      const settings = await getTypedSettings();
      const POINTS_EARN_RATE = settings.loyalty.pointsEarnRate;

      // Restaurar stock usando lotAllocations (multi-lote) o lotId (compatibilidad)
      for (const item of sale.items) {
        if (item.lotAllocations.length > 0) {
          for (const alloc of item.lotAllocations) {
            await tx.lot.update({ where: { id: alloc.lotId }, data: { quantity: { increment: alloc.quantity } } });
          }
        } else if (item.lotId) {
          await tx.lot.update({ where: { id: item.lotId }, data: { quantity: { increment: item.quantity } } });
        }

        // Registrar movimiento de stock (devolución por anulación)
        const allLots = await tx.lot.findMany({ where: { productId: item.productId }, select: { quantity: true } });
        const balance = allLots.reduce((s, l) => s + l.quantity, 0);
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "return",
            quantity: item.quantity,
            balance,
            reference: `Anulación ${sale.invoiceNumber}`,
            lotId: item.lotAllocations[0]?.lotId ?? item.lotId ?? null,
            userName: session!.user?.name ?? "Usuario",
          },
        });
      }

      // Revertir puntos
      if (sale.customerId) {
        const ptsEarned = Math.floor(sale.total / POINTS_EARN_RATE);
        if (ptsEarned > 0) {
          const customer = await tx.customer.findUnique({ where: { id: sale.customerId }, select: { loyaltyPoints: true } });
          if (customer && customer.loyaltyPoints >= ptsEarned) {
            await tx.customer.update({ where: { id: sale.customerId }, data: { loyaltyPoints: { decrement: ptsEarned } } });
          }
        }
        if (sale.pointsRedeemed > 0) {
          await tx.customer.update({ where: { id: sale.customerId }, data: { loyaltyPoints: { increment: sale.pointsRedeemed } } });
        }
      }

      return tx.sale.update({ where: { id }, data: { status: "voided" } });
    });

    // Registrar en auditoría
    await auditLog({
      userId,
      userName: session!.user?.name ?? "Usuario",
      action: "sale.void",
      entityType: "sale",
      entityId: id,
      description: `Anulación ${sale.invoiceNumber} · ${reason}`,
      metadata: { invoiceNumber: sale.invoiceNumber, reason, total: sale.total },
    });

    return NextResponse.json({ sale: updated, message: `Venta ${sale.invoiceNumber} anulada. Stock restaurado.` });
  }
);
