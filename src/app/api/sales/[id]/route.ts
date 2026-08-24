import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler } from "@/lib/api-handler";

export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { response } = await requirePermission("sales:view");
    if (response) return response;
    const { id } = await params;
    const sale = await db.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        prescription: true,
        items: {
          include: {
            product: { select: { name: true, dosage: true, presentation: true, barcode: true, requiresPrescription: true } },
            lotAllocations: { include: { lot: { select: { id: true, lotNumber: true, expiryDate: true } } } },
          },
        },
      },
    });
    if (!sale) return NextResponse.json({ error: "Venta no encontrada", code: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ sale });
  }
);
