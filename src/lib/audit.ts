import { db } from "@/lib/db";

export async function auditLog(params: {
  userId?: string | null;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId ?? null,
        userName: params.userName,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        description: params.description,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (e) {
    console.error("[auditLog] Error:", e);
  }
}
