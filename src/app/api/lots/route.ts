import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandler, validateBody } from "@/lib/api-handler";
import { createLotSchema } from "@/lib/schemas";
import { requirePermission } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

// Listar lotes (con filtros de vencimiento) y crear lotes nuevos
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { response } = await requirePermission("inventory:view");
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId") ?? undefined;
  const status = searchParams.get("status"); // "expired" | "critical" | "warning" | "ok"

  const now = new Date();
  const where: any = {};
  if (productId) where.productId = productId;

  const lots = await db.lot.findMany({
    where,
    include: {
      product: {
        select: { id: true, name: true, dosage: true, presentation: true, barcode: true },
      },
    },
    orderBy: { expiryDate: "asc" },
  });

  let result = lots.map((l) => {
    const days = Math.round(
      (l.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    let st: "expired" | "critical" | "warning" | "ok" = "ok";
    if (days < 0) st = "expired";
    else if (days <= 30) st = "critical";
    else if (days <= 90) st = "warning";
    return { ...l, daysToExpiry: days, expiryStatus: st };
  });

  if (status) result = result.filter((l) => l.expiryStatus === status);

  return NextResponse.json({ lots: result });
});

// Crear nuevo lote (recepción de mercancía)
export const POST = withErrorHandler(async (req: NextRequest) => {
  const { session, response } = await requirePermission("inventory:manage");
  if (response) return response;

  const body = await req.json();
  const { productId, lotNumber, expiryDate, quantity } = body;
  if (!productId || !lotNumber || !expiryDate || quantity == null) {
    return NextResponse.json(
      { error: "Faltan campos requeridos" },
      { status: 400 }
    );
  }
  const qtyNum = parseInt(quantity);
  const userName = session!.user?.name ?? "Usuario";

  // Crear lote + registrar movimiento de stock en transacción
  const lot = await db.$transaction(async (tx) => {
    const created = await tx.lot.create({
      data: {
        productId,
        lotNumber,
        expiryDate: new Date(expiryDate),
        quantity: qtyNum,
        initialQty: qtyNum,
      },
    });

    // Calcular balance después de esta entrada
    const allLots = await tx.lot.findMany({ where: { productId }, select: { quantity: true } });
    const balance = allLots.reduce((s, l) => s + l.quantity, 0);

    await tx.stockMovement.create({
      data: {
        productId,
        type: "in",
        quantity: qtyNum,
        balance,
        reference: `Lote ${lotNumber}`,
        lotId: created.id,
        userName,
      },
    });

    return created;
  });

  await auditLog({
    userId: (session!.user as any).id,
    userName: session!.user?.name ?? "Usuario",
    action: "lot.create",
    entityType: "product",
    entityId: productId,
    description: `Lote creado: ${lotNumber} · ${qtyNum} und`,
    metadata: { lotId: lot.id, lotNumber, quantity: qtyNum, productId },
  });

  return NextResponse.json({ lot }, { status: 201 });
});
