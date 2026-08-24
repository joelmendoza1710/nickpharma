import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler } from "@/lib/api-handler";
import { z } from "zod";

const querySchema = z.object({
  productId: z.string().min(1).optional(),
  type: z.enum(["in", "out", "adjustment", "return"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
}).passthrough();

// GET /api/stock-movements — listar movimientos de stock con filtros y resumen
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { response } = await requirePermission("inventory:view");
  if (response) return response;

  const query = Object.fromEntries(new URL(req.url).searchParams.entries());
  const parsed = querySchema.safeParse(query);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { productId, type, from, to } = parsed.data;
  const limit = Math.min(parseInt(parsed.data.limit ?? "100"), 500);
  const offset = parseInt(parsed.data.offset ?? "0");

  const where: any = {};
  if (productId) where.productId = productId;
  if (type) where.type = type;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) { const td = new Date(to); td.setHours(23, 59, 59, 999); where.createdAt.lte = td; }
  }

  const [movements, total, summary] = await Promise.all([
    db.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        product: { select: { id: true, name: true, dosage: true, barcode: true } },
      },
    }),
    db.stockMovement.count({ where }),
    db.stockMovement.groupBy({
      by: ["type"],
      where,
      _count: true,
      _sum: { quantity: true },
    }),
  ]);

  const typeSummary: Record<string, { count: number; quantity: number }> = {
    in: { count: 0, quantity: 0 },
    out: { count: 0, quantity: 0 },
    adjustment: { count: 0, quantity: 0 },
    return: { count: 0, quantity: 0 },
  };
  for (const s of summary) {
    typeSummary[s.type] = { count: s._count, quantity: s._sum.quantity ?? 0 };
  }

  return NextResponse.json({ movements, total, limit, offset, summary: typeSummary });
});
