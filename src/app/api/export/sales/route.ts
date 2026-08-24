import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/format";

export async function GET(req: NextRequest) {
  const { response } = await requirePermission("sales:view");
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "completed";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = {};
  if (status !== "all") where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) { const td = new Date(to); td.setHours(23, 59, 59, 999); where.createdAt.lte = td; }
  }

  const sales = await db.sale.findMany({
    where, orderBy: { createdAt: "desc" }, take: 5000,
    include: {
      customer: { select: { fullName: true, document: true } },
      items: { include: { product: { select: { name: true, dosage: true } } } },
      prescription: { select: { doctorName: true, prescriptionNumber: true } },
    },
  });

  function esc(v: unknown): string {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const headers = ["Factura","Fecha","Cliente","Documento","Cajero","Método","Estado","Subtotal","Impuesto","Descuento","Total","Efectivo","Cambio","Productos","Receta"];
  const rows = sales.map(s => [
    s.invoiceNumber, new Date(s.createdAt).toLocaleString("es-CO"),
    s.customer?.fullName ?? "Consumidor Final", s.customer?.document ?? "",
    s.cashierName, s.paymentMethod, s.status,
    formatCurrency(s.subtotal), formatCurrency(s.taxTotal), formatCurrency(s.discount), formatCurrency(s.total),
    s.cashReceived != null ? formatCurrency(s.cashReceived) : "",
    s.change != null ? formatCurrency(s.change) : "",
    s.items.map(it => `${it.quantity}x ${it.product.name} ${it.product.dosage ?? ""}`.trim()).join(" | "),
    s.prescription ? `${s.prescription.doctorName} (${s.prescription.prescriptionNumber})` : "",
  ]);

  const csv = "\uFEFF" + [headers, ...rows].map(r => r.map(esc).join(",")).join("\r\n");
  return new NextResponse(csv, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8;", "Content-Disposition": `attachment; filename="ventas-${new Date().toISOString().slice(0,10)}.csv"` } });
}
