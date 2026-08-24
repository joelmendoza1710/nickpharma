import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, validateBody } from "@/lib/api-handler";
import { z } from "zod";
import { auditLog } from "@/lib/audit";

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  activeIngredient: z.string().max(200).nullable().optional(),
  presentation: z.string().max(100).nullable().optional(),
  dosage: z.string().max(50).nullable().optional(),
  barcode: z.string().min(1).max(50).optional(),
  laboratory: z.string().max(100).nullable().optional(),
  salePrice: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
  requiresPrescription: z.boolean().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  categoryId: z.string().min(1).optional(),
  cum: z.string().max(50).nullable().optional(),
  invimaRegistration: z.string().max(50).nullable().optional(),
  invimaExpiryDate: z.string().nullable().optional(),
  therapeuticAction: z.string().max(200).nullable().optional(),
}).refine((d) => Object.keys(d).length > 0, "Debe incluir al menos un campo");

export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { response } = await requirePermission("inventory:view");
  if (response) return response;
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, include: { category: true, lots: { orderBy: { expiryDate: "asc" } } } });
  if (!product) return NextResponse.json({ error: "Producto no encontrado", code: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ product });
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { session, response } = await requirePermission("inventory:manage");
  if (response) return response;
  const { id } = await params;
  const data = await validateBody(updateProductSchema, req);
  // Convertir invimaExpiryDate de string a Date si viene
  const updateData: any = { ...data };
  if (data.invimaExpiryDate) updateData.invimaExpiryDate = new Date(data.invimaExpiryDate);
  const updated = await db.product.update({ where: { id }, data: updateData });
  await auditLog({
    userId: (session!.user as any).id,
    userName: session!.user?.name ?? "Usuario",
    action: "product.update",
    entityType: "product",
    entityId: id,
    description: `Producto actualizado: ${updated.name}`,
    metadata: { fields: Object.keys(data) },
  });
  return NextResponse.json({ product: updated });
});

export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { response } = await requirePermission("inventory:manage");
  if (response) return response;
  const { id } = await params;
  await db.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
