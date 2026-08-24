import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, withErrorHandlerSimple, validateBody } from "@/lib/api-handler";
import { createCategorySchema } from "@/lib/schemas";

export const GET = withErrorHandlerSimple(async () => {
  const { response } = await requirePermission("inventory:view");
  if (response) return response;
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });
  return NextResponse.json({ categories });
});

export const POST = withErrorHandler(async (req: any) => {
  const { response } = await requirePermission("inventory:manage");
  if (response) return response;
  const data = await validateBody(createCategorySchema, req);
  const existing = await db.category.findUnique({ where: { name: data.name } });
  if (existing) return NextResponse.json({ error: "Ya existe una categoría con este nombre", code: "CONFLICT" }, { status: 409 });
  const category = await db.category.create({ data: { name: data.name, description: data.description || null, color: data.color } });
  return NextResponse.json({ category }, { status: 201 });
});
