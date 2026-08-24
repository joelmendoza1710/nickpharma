import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, validateBody } from "@/lib/api-handler";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const supplierSchema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().max(200).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  address: z.string().max(300).nullable().optional(),
  taxId: z.string().max(50).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  active: z.boolean().default(true),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { response } = await requirePermission("suppliers:manage");
  if (response) return response;
  const suppliers = await db.supplier.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { purchaseOrders: true } } } });
  return NextResponse.json({ suppliers, total: suppliers.length });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { session, response } = await requirePermission("suppliers:manage");
  if (response) return response;
  const data = await validateBody(supplierSchema, req);
  const existing = await db.supplier.findUnique({ where: { name: data.name } });
  if (existing) return NextResponse.json({ error: "Ya existe un proveedor con este nombre", code: "CONFLICT" }, { status: 409 });
  const supplier = await db.supplier.create({ data: { ...data, email: data.email || null, contactName: data.contactName || null, phone: data.phone || null, address: data.address || null, taxId: data.taxId || null, notes: data.notes || null } });
  await auditLog({ userId: (session!.user as any).id, userName: session!.user?.name ?? "Usuario", action: "supplier.create", entityType: "supplier", entityId: supplier.id, description: `Proveedor creado: ${data.name}`, metadata: { name: data.name } });
  return NextResponse.json({ supplier }, { status: 201 });
});
