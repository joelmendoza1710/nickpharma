import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, validateBody } from "@/lib/api-handler";
import { z } from "zod";
import { auditLog } from "@/lib/audit";

const adjustStockSchema = z.object({
  newStock: z.number().int().min(0, "El stock no puede ser negativo"),
  reason: z.string().min(3, "Indica el motivo del ajuste").max(500),
  lotId: z.string().min(1).optional(),
}).refine((d) => d.reason.trim().length >= 3, "El motivo debe tener al menos 3 caracteres");

// POST /api/products/[id]/adjust-stock — ajuste manual de inventario (conteo físico)
export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { session, response } = await requirePermission("inventory:manage");
  if (response) return response;

  const { id } = await params;
  const body = await validateBody(adjustStockSchema, req);
  const { newStock, reason, lotId } = body;
  const userName = session!.user?.name ?? "Usuario";

  const product = await db.product.findUnique({
    where: { id },
    include: { lots: { orderBy: { expiryDate: "asc" } } },
  });

  if (!product) return NextResponse.json({ error: "Producto no encontrado", code: "NOT_FOUND" }, { status: 404 });

  const currentStock = product.lots.reduce((s, l) => s + l.quantity, 0);
  const difference = newStock - currentStock;

  if (difference === 0) {
    return NextResponse.json({ error: "El nuevo stock es igual al actual. No hay ajuste necesario.", code: "NO_CHANGE" }, { status: 400 });
  }

  const result = await db.$transaction(async (tx) => {
    if (lotId) {
      const lot = product.lots.find((l) => l.id === lotId);
      if (!lot) throw new Error("LOTE_NO_ENCONTRADO");
      const lotDiff = newStock - lot.quantity;
      if (lotDiff !== 0) {
        await tx.lot.update({ where: { id: lotId }, data: { quantity: newStock } });
      }
    } else {
      // Ajuste global: incrementos al primer lote con stock, decrementos FIFO
      if (difference > 0) {
        const targetLot = product.lots.find((l) => l.quantity > 0) ?? product.lots[0];
        if (targetLot) {
          await tx.lot.update({ where: { id: targetLot.id }, data: { quantity: { increment: difference } } });
        }
      } else {
        let remaining = Math.abs(difference);
        for (const lot of product.lots) {
          if (remaining <= 0) break;
          if (lot.quantity <= 0) continue;
          const take = Math.min(lot.quantity, remaining);
          await tx.lot.update({ where: { id: lot.id }, data: { quantity: { decrement: take } } });
          remaining -= take;
        }
      }
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId: id,
        type: "adjustment",
        quantity: difference,
        balance: newStock,
        reference: reason.trim(),
        lotId: lotId ?? null,
        userName,
      },
    });

    return { movement, previousStock: currentStock, newStock, difference };
  });

  await auditLog({
    userId: (session!.user as any).id,
    userName: session!.user?.name ?? "Usuario",
    action: "stock.adjust",
    entityType: "product",
    entityId: id,
    description: `Ajuste de stock: ${result.previousStock} → ${result.newStock} (${difference > 0 ? "+" : ""}${difference})`,
    metadata: { previousStock: result.previousStock, newStock: result.newStock, difference: result.difference, reason },
  });

  return NextResponse.json({
    ...result,
    message: `Stock ajustado de ${currentStock} a ${newStock} (${difference > 0 ? "+" : ""}${difference} und)`,
  }, { status: 201 });
});
