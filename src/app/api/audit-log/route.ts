import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler } from "@/lib/api-handler";

// GET /api/audit-log — bitácora con filtros, paginación y búsqueda
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { response } = await requirePermission("users:manage");
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType") ?? undefined;
  const action = searchParams.get("action") ?? undefined;
  const userName = searchParams.get("userName") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;
  if (userName) where.userName = { contains: userName };
  if (q) where.description = { contains: q };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) { const td = new Date(to); td.setHours(23, 59, 59, 999); where.createdAt.lte = td; }
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, limit, offset });
});
