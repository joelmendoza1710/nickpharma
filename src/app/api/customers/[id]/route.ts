import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandler } from "@/lib/api-handler";
import { requirePermission } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

// GET /api/customers/[id] — detalle con historial de compras
export const GET = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { response } = await requirePermission("customers:view");
  if (response) return response;

  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      _count: { select: { sales: true } },
      sales: {
        where: { status: "completed" },
        select: { total: true },
        take: 1000,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) return NextResponse.json({ error: "Cliente no encontrado", code: "NOT_FOUND" }, { status: 404 });

  const totalSpent = customer.sales.reduce((s, x) => s + x.total, 0);
  const { sales, _count, ...rest } = customer;
  return NextResponse.json({
    customer: { ...rest, salesCount: _count.sales, totalSpent: +totalSpent.toFixed(2) },
  });
});

const patchSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  document: z.string().max(50).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  address: z.string().max(300).nullable().optional(),
  loyaltyPoints: z.number().int().min(0).optional(),
  allergies: z.string().max(500).nullable().optional(),
  chronicConditions: z.string().max(500).nullable().optional(),
  bloodType: z.string().max(10).nullable().optional(),
  emergencyContact: z.string().max(100).nullable().optional(),
}).refine((d) => Object.keys(d).length > 0, "Debe incluir al menos un campo");

// PATCH /api/customers/[id] — actualizar cliente
export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { session, response } = await requirePermission("customers:manage");
  if (response) return response;

  const { id } = await params;
  const body = await req.json();
  const data = patchSchema.parse(body);

  // Normalizar nulls
  const updateData: any = { ...data };
  if ("email" in updateData) updateData.email = updateData.email || null;

  const updated = await db.customer.update({ where: { id }, data: updateData });
  await auditLog({
    userId: (session!.user as any).id,
    userName: session!.user?.name ?? "Usuario",
    action: "customer.update",
    entityType: "customer",
    entityId: id,
    description: `Cliente actualizado: ${updated.fullName}`,
    metadata: { fields: Object.keys(updateData) },
  });
  return NextResponse.json({ customer: updated });
});
