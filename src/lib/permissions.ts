import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import type { Role } from "@prisma/client";
export type { Role };

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ["dashboard:view","pos:use","inventory:view","inventory:manage","sales:view","sales:manage","customers:view","customers:manage","reports:view","users:manage","cash:manage","suppliers:manage"],
  SUPERVISOR: ["dashboard:view","pos:use","inventory:view","inventory:manage","sales:view","sales:manage","customers:view","customers:manage","reports:view","cash:manage","suppliers:manage"],
  CASHIER: ["dashboard:view","pos:use","inventory:view","sales:view","customers:view","customers:manage","cash:manage"],
  PHARMACIST: ["dashboard:view","pos:use","inventory:view","inventory:manage","sales:view","customers:view","reports:view","cash:manage","suppliers:manage"],
};

export type Permission = "dashboard:view" | "pos:use" | "inventory:view" | "inventory:manage" | "sales:view" | "sales:manage" | "customers:view" | "customers:manage" | "reports:view" | "users:manage" | "cash:manage" | "suppliers:manage";

export const VIEW_PERMISSIONS: Record<string, Permission> = {
  dashboard: "dashboard:view", pos: "pos:use", inventory: "inventory:view", sales: "sales:view",
  customers: "customers:view", cash: "cash:manage", suppliers: "suppliers:manage",
  users: "users:manage", audit: "users:manage", settings: "users:manage", reports: "reports:view",
};

export const ROLE_LABELS: Record<Role, string> = { ADMIN: "Administrador", SUPERVISOR: "Supervisor", CASHIER: "Cajero/a", PHARMACIST: "Farmacéutico/a" };
export const ROLE_DESCRIPTIONS: Record<Role, string> = { ADMIN: "Acceso total", SUPERVISOR: "Gestión operativa", CASHIER: "POS y consulta", PHARMACIST: "Inventario y dispensación" };

export function hasPermission(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { session: null, response: NextResponse.json({ error: "No autenticado", code: "UNAUTHORIZED" }, { status: 401 }) };
  return { session, response: null };
}

export async function requirePermission(permission: Permission) {
  const { session, response } = await requireSession();
  if (response) return { session: null, response };
  const role = (session!.user as any).role as Role;
  if (!hasPermission(role, permission)) return { session: null, response: NextResponse.json({ error: "No tienes permiso", code: "FORBIDDEN" }, { status: 403 }) };
  return { session: session!, response: null };
}
