import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, validateBody } from "@/lib/api-handler";
import { createSaleSchema } from "@/lib/schemas";
import { getTypedSettings } from "@/lib/settings";
import { auditLog } from "@/lib/audit";

// Listar ventas con filtros y paginación
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { response } = await requirePermission("sales:view");
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const customerId = searchParams.get("customerId") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const statusFilter = searchParams.get("status") ?? "completed";

  const where: any = {};
  if (statusFilter !== "all") where.status = statusFilter;
  if (customerId) where.customerId = customerId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) { const td = new Date(to); td.setHours(23,59,59,999); where.createdAt.lte = td; }
  }

  const [sales, total] = await Promise.all([
    db.sale.findMany({
      where, orderBy: { createdAt: "desc" }, take: limit, skip: offset,
      include: {
        customer: { select: { id: true, fullName: true, document: true } },
        items: { include: { product: { select: { name: true, dosage: true, presentation: true } } } },
      },
    }),
    db.sale.count({ where }),
  ]);

  return NextResponse.json({ sales, total, limit, offset });
});

// Procesar una venta nueva (transaccional, decrementa inventario FIFO, multi-lote trazable)
export const POST = withErrorHandler(async (req: NextRequest) => {
  const { session, response } = await requirePermission("pos:use");
  if (response) return response;

  const userId = (session!.user as any).id as string;
  const cashierName = session!.user?.name ?? "Cajero";
  const body = await validateBody(createSaleSchema, req);
  const { items, customerId, paymentMethod, cashReceived, discount, pointsToRedeem, prescription: prescriptionData } = body;

  // Obtener todos los productos en una sola consulta (evitar N+1)
  const productIds = items.map((i) => i.productId);
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    include: { lots: { where: { quantity: { gt: 0 } }, orderBy: { expiryDate: "asc" } } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Validar recetas médicas
  const hasRxProducts = products.some((p) => p.requiresPrescription);
  if (hasRxProducts && !prescriptionData) {
    return NextResponse.json(
      { error: "Esta venta incluye productos que requieren receta médica.", code: "PRESCRIPTION_REQUIRED" },
      { status: 400 }
    );
  }

  // Validar productos, stock y calcular totales
  let subtotal = 0, taxTotal = 0;
  const saleItemsData: any[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) return NextResponse.json({ error: `Producto no encontrado: ${item.productId}`, code: "NOT_FOUND" }, { status: 404 });
    const available = product.lots.reduce((s, l) => s + l.quantity, 0);
    if (available < item.quantity) return NextResponse.json({ error: `Stock insuficiente para ${product.name}. Disponible: ${available}`, code: "INSUFFICIENT_STOCK" }, { status: 400 });
    const lineTotal = +(product.salePrice * item.quantity).toFixed(2);
    const lineTax = +(lineTotal * product.taxRate).toFixed(2);
    subtotal += lineTotal; taxTotal += lineTax;

    // Distribuir entre lotes FIFO
    let remaining = item.quantity;
    const allocations: { lotId: string; qty: number }[] = [];
    for (const lot of product.lots) {
      if (remaining <= 0) break;
      const take = Math.min(lot.quantity, remaining);
      allocations.push({ lotId: lot.id, qty: take });
      remaining -= take;
    }
    saleItemsData.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.salePrice, lineTotal, allocations });
  }

  // Canje de puntos (configurable via settings)
  const settings = await getTypedSettings();
  const POINTS_RATE = settings.loyalty.pointsRate;
  const POINTS_EARN_RATE = settings.loyalty.pointsEarnRate;
  let pointsRedeemed = 0, pointsDiscount = 0;
  if (pointsToRedeem && pointsToRedeem > 0) {
    if (!customerId) return NextResponse.json({ error: "Para canjear puntos se requiere un cliente", code: "VALIDATION_ERROR" }, { status: 400 });
    const customer = await db.customer.findUnique({ where: { id: customerId }, select: { loyaltyPoints: true } });
    if (!customer) return NextResponse.json({ error: "Cliente no encontrado", code: "NOT_FOUND" }, { status: 404 });
    if (pointsToRedeem > customer.loyaltyPoints) return NextResponse.json({ error: `Puntos insuficientes. Tiene ${customer.loyaltyPoints}`, code: "INSUFFICIENT_POINTS" }, { status: 400 });
    pointsRedeemed = pointsToRedeem;
    pointsDiscount = Math.min(+(pointsRedeemed / POINTS_RATE).toFixed(2), subtotal);
  }

  const total = +(subtotal + taxTotal - discount - pointsDiscount).toFixed(2);
  const change = paymentMethod === "cash" && cashReceived != null ? +(cashReceived - total).toFixed(2) : 0;

  if (paymentMethod === "cash" && cashReceived != null && cashReceived < total) {
    return NextResponse.json({ error: `Efectivo insuficiente. Total: ${total}`, code: "INSUFFICIENT_CASH" }, { status: 400 });
  }

  // Generar número de factura
  const lastSale = await db.sale.findFirst({ orderBy: { invoiceNumber: "desc" } });
  let nextNum = 1001;
  if (lastSale?.invoiceNumber) { const m = lastSale.invoiceNumber.match(/(\d+)/); if (m) nextNum = parseInt(m[1]) + 1; }
  const invoiceNumber = `FAC-${nextNum}`;

  // Transacción: crear venta + lotes + decrementar stock + puntos
  const sale = await db.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        invoiceNumber, customerId: customerId || null, userId,
        subtotal: +subtotal.toFixed(2), taxTotal: +taxTotal.toFixed(2),
        discount: +discount.toFixed(2), total,
        pointsRedeemed, pointsDiscount: +pointsDiscount.toFixed(2),
        paymentMethod, cashReceived: cashReceived != null ? +Number(cashReceived).toFixed(2) : null,
        change: +change.toFixed(2), status: "completed", cashierName,
        prescription: prescriptionData ? { create: { doctorName: prescriptionData.doctorName, doctorLicense: prescriptionData.doctorLicense, prescriptionNumber: prescriptionData.prescriptionNumber, prescriptionDate: new Date(prescriptionData.prescriptionDate), notes: prescriptionData.notes ?? null } } : undefined,
        items: {
          create: saleItemsData.map((it) => ({
            productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice, lineTotal: it.lineTotal,
            lotId: it.allocations[0]?.lotId ?? null,
            // Trazabilidad multi-lote: un SaleItemLot por cada lote consumido
            lotAllocations: { create: it.allocations.map((alloc) => ({ lotId: alloc.lotId, quantity: alloc.qty, unitPrice: it.unitPrice, lineTotal: +(alloc.qty * it.unitPrice).toFixed(2) })) },
          })),
        },
      },
      include: {
        items: { include: { product: { select: { name: true, dosage: true, presentation: true } }, lotAllocations: { include: { lot: { select: { id: true, lotNumber: true, expiryDate: true } } } } } },
        customer: { select: { id: true, fullName: true, document: true } },
        prescription: true,
      },
    });

    // Decrementar stock + registrar movimientos
    for (const it of saleItemsData) {
      let runningBalance = 0;
      const product = productMap.get(it.productId);
      if (product) {
        runningBalance = product.lots.reduce((s, l) => s + l.quantity, 0) - it.quantity;
      }
      for (const alloc of it.allocations) {
        await tx.lot.update({ where: { id: alloc.lotId }, data: { quantity: { decrement: alloc.qty } } });
      }
      // Registrar movimiento de stock (salida por venta)
      await tx.stockMovement.create({
        data: {
          productId: it.productId,
          type: "out",
          quantity: it.quantity,
          balance: runningBalance,
          reference: created.invoiceNumber,
          lotId: it.allocations[0]?.lotId ?? null,
          userId,
          userName: cashierName,
        },
      });
    }

    // Puntos de lealtad
    if (customerId) {
      if (pointsRedeemed > 0) await tx.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { decrement: pointsRedeemed } } });
      const ptsEarned = Math.floor(total / POINTS_EARN_RATE);
      if (ptsEarned > 0) await tx.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { increment: ptsEarned } } });
    }

    return created;
  });

  // Registrar en auditoría
  await auditLog({
    userId,
    userName: cashierName,
    action: "sale.create",
    entityType: "sale",
    entityId: sale.id,
    description: `Venta ${sale.invoiceNumber} · ${formatCurrency(total)} · ${paymentMethod}`,
    metadata: { invoiceNumber: sale.invoiceNumber, total, paymentMethod, itemCount: items.length },
  });

  return NextResponse.json({ sale }, { status: 201 });
});

// formatCurrency needs to be imported or inlined
function formatCurrency(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(v);
}
