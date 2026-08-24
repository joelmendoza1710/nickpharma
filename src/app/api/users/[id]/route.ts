import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler, validateBody } from "@/lib/api-handler";
import { auditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "SUPERVISOR", "CASHIER", "PHARMACIST"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).max(100).optional(),
});

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { session, response } = await requirePermission("users:manage");
  if (response) return response;
  const { id } = await params;
  const data = await validateBody(updateSchema, req);
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Usuario no encontrado", code: "NOT_FOUND" }, { status: 404 });
  if (data.email && data.email.toLowerCase() !== existing.email) {
    const emailExists = await db.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (emailExists) return NextResponse.json({ error: "Email ya existe", code: "CONFLICT" }, { status: 409 });
  }
  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email.toLowerCase();
  if (data.role) updateData.role = data.role;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);
  const updated = await db.user.update({ where: { id }, data: updateData, select: { id: true, email: true, name: true, role: true, active: true, createdAt: true } });
  await auditLog({
    userId: (session!.user as any).id,
    userName: session!.user?.name ?? "Usuario",
    action: "user.update",
    entityType: "user",
    entityId: id,
    description: `Usuario actualizado: ${updated.email}`,
    metadata: { fields: Object.keys(data) },
  });
  return NextResponse.json({ user: updated });
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { session, response } = await requirePermission("users:manage");
  if (response) return response;
  const { id } = await params;
  const currentUserId = (session!.user as any).id as string;
  if (id === currentUserId) return NextResponse.json({ error: "No puedes desactivar tu propia cuenta", code: "SELF_DEACTIVATE" }, { status: 400 });
  await db.user.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
});
