import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, validateBody } from "@/lib/api-handler";
import { createUserSchema } from "@/lib/schemas";
import { auditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { response } = await requirePermission("users:manage");
  if (response) return response;
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, email: true, name: true, role: true, active: true, createdAt: true, _count: { select: { sales: true, cashShifts: true } } } });
  return NextResponse.json({ users, total: users.length });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { session, response } = await requirePermission("users:manage");
  if (response) return response;
  const data = await validateBody(createUserSchema, req);
  const existing = await db.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Ya existe un usuario con este email", code: "CONFLICT" }, { status: 409 });
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await db.user.create({ data: { email: data.email.toLowerCase(), name: data.name, passwordHash, role: data.role, active: data.active }, select: { id: true, email: true, name: true, role: true, active: true, createdAt: true } });
  await auditLog({
    userId: (session!.user as any).id,
    userName: session!.user?.name ?? "Usuario",
    action: "user.create",
    entityType: "user",
    entityId: user.id,
    description: `Usuario creado: ${data.email} (${data.role})`,
    metadata: { email: data.email, role: data.role, name: data.name },
  });
  return NextResponse.json({ user }, { status: 201 });
});
