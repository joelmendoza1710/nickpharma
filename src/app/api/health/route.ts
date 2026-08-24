import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "healthy", checks: { database: "ok" }, timestamp: new Date().toISOString(), version: "2.0.0" });
  } catch {
    return NextResponse.json({ status: "degraded", checks: { database: "error" }, timestamp: new Date().toISOString() }, { status: 503 });
  }
}
