import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandler, validateBody } from "@/lib/api-handler";
import { createCustomerSchema } from "@/lib/schemas";
import { requirePermission } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

// Listar clientes con resumen de compras
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { response } = await requirePermission("customers:view");
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const where: any = {};
  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { document: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
    ];
  }

  const customers = await db.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { sales: true } },
      sales: {
        where: { status: "completed" },
        select: { total: true },
        take: 1000,
      },
    },
  });

  const result = customers.map((c) => {
    const totalSpent = c.sales.reduce((s, x) => s + x.total, 0);
    const { sales, ...rest } = c;
    return {
      ...rest,
      salesCount: c._count.sales,
      totalSpent: +totalSpent.toFixed(2),
    };
  });

  return NextResponse.json({ customers: result });
});

// Crear cliente
export const POST = withErrorHandler(async (req: NextRequest) => {
  const { session, response } = await requirePermission("customers:manage");
  if (response) return response;

  const body = await req.json();
  const { fullName, document, phone, email, address } = body;
  if (!fullName) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }
  const customer = await db.customer.create({
    data: { fullName, document, phone, email, address },
  });
  await auditLog({
    userId: (session!.user as any).id,
    userName: session!.user?.name ?? "Usuario",
    action: "customer.create",
    entityType: "customer",
    entityId: customer.id,
    description: `Cliente creado: ${body.fullName}`,
    metadata: { fullName: body.fullName, document: body.document },
  });
  return NextResponse.json({ customer }, { status: 201 });
});
