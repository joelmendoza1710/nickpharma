import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, validateBody } from "@/lib/api-handler";
import { createProductSchema } from "@/lib/schemas";
import { auditLog } from "@/lib/audit";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { response } = await requirePermission("inventory:view");
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const lowStock = searchParams.get("lowStock") === "true";
  const limit = parseInt(searchParams.get("limit") ?? "0") || undefined;

  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { activeIngredient: { contains: q } },
      { barcode: { contains: q } },
      { laboratory: { contains: q } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;

  const products = await db.product.findMany({
    where,
    include: {
      category: { select: { id: true, name: true, color: true } },
      lots: {
        where: { quantity: { gt: 0 } },
        orderBy: { expiryDate: "asc" },
        select: { id: true, lotNumber: true, expiryDate: true, quantity: true },
      },
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  // Calcula stock total y estado
  const now = new Date();
  const result = products.map((p) => {
    const totalStock = p.lots.reduce((s, l) => s + l.quantity, 0);
    const isLowStock = totalStock > 0 && totalStock <= p.minStock;
    const isOutOfStock = totalStock === 0;
    return {
      id: p.id,
      name: p.name,
      activeIngredient: p.activeIngredient,
      presentation: p.presentation,
      dosage: p.dosage,
      barcode: p.barcode,
      laboratory: p.laboratory,
      salePrice: p.salePrice,
      costPrice: p.costPrice,
      minStock: p.minStock,
      requiresPrescription: p.requiresPrescription,
      taxRate: p.taxRate,
      category: p.category,
      totalStock,
      isLowStock,
      isOutOfStock,
      lots: p.lots.map((l) => ({
        ...l,
        daysToExpiry: Math.round(
          (l.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })),
    };
  });

  let filtered = result;
  if (lowStock) {
    filtered = filtered.filter((p) => p.isLowStock || p.isOutOfStock);
  }

  return NextResponse.json({ products: filtered, total: filtered.length });
});

// Crear producto nuevo (con lote inicial opcional)
export const POST = withErrorHandler(async (req: NextRequest) => {
  const { session, response } = await requirePermission("inventory:manage");
  if (response) return response;

  const data = await validateBody(createProductSchema, req);
  const existing = await db.product.findUnique({ where: { barcode: data.barcode } });
  if (existing) return NextResponse.json({ error: "Ya existe un producto con este código de barras", code: "CONFLICT" }, { status: 409 });

  const product = await db.product.create({
    data: {
      name: data.name, activeIngredient: data.activeIngredient || null, presentation: data.presentation || null,
      dosage: data.dosage || null, barcode: data.barcode, laboratory: data.laboratory || null,
      salePrice: data.salePrice, costPrice: data.costPrice, minStock: data.minStock,
      requiresPrescription: data.requiresPrescription, taxRate: data.taxRate, categoryId: data.categoryId,
      cum: data.cum || null,
      invimaRegistration: data.invimaRegistration || null,
      invimaExpiryDate: data.invimaExpiryDate ? new Date(data.invimaExpiryDate) : null,
      therapeuticAction: data.therapeuticAction || null,
      lots: data.initialLot ? { create: { lotNumber: data.initialLot.lotNumber, expiryDate: new Date(data.initialLot.expiryDate), quantity: data.initialLot.quantity, initialQty: data.initialLot.quantity } } : undefined,
    },
    include: { category: { select: { id: true, name: true, color: true } }, lots: { select: { id: true, lotNumber: true, expiryDate: true, quantity: true } } },
  });
  await auditLog({
    userId: (session!.user as any).id,
    userName: session!.user?.name ?? "Usuario",
    action: "product.create",
    entityType: "product",
    entityId: product.id,
    description: `Producto creado: ${data.name}`,
    metadata: { name: data.name, barcode: data.barcode, salePrice: data.salePrice },
  });
  return NextResponse.json({ product }, { status: 201 });
});