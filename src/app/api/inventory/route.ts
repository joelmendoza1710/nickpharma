import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";
import { withErrorHandler } from "@/lib/api-handler";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { response } = await requirePermission("inventory:view");
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter"); // "low" | "expiring" | "expired" | "out"

  const products = await db.product.findMany({
    include: {
      category: { select: { name: true, color: true } },
      lots: {
        where: { quantity: { gt: 0 } },
        orderBy: { expiryDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  const rows = products
    .map((p) => {
      const totalStock = p.lots.reduce((s, l) => s + l.quantity, 0);
      const isLowStock = totalStock > 0 && totalStock <= p.minStock;
      const isOutOfStock = totalStock === 0;
      const stockValue = totalStock * p.costPrice;
      const retailValue = totalStock * p.salePrice;

      // Vencimiento más próximo
      const nextLot = p.lots[0];
      const daysToExpiry = nextLot
        ? Math.round(
            (nextLot.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

      let expiryStatus: "ok" | "warning" | "critical" | "expired" | "none" = "none";
      if (nextLot) {
        if (daysToExpiry! < 0) expiryStatus = "expired";
        else if (daysToExpiry! <= 30) expiryStatus = "critical";
        else if (daysToExpiry! <= 90) expiryStatus = "warning";
        else expiryStatus = "ok";
      }

      return {
        id: p.id,
        name: p.name,
        activeIngredient: p.activeIngredient,
        dosage: p.dosage,
        presentation: p.presentation,
        barcode: p.barcode,
        laboratory: p.laboratory,
        categoryName: p.category.name,
        categoryColor: p.category.color,
        salePrice: p.salePrice,
        costPrice: p.costPrice,
        minStock: p.minStock,
        requiresPrescription: p.requiresPrescription,
        totalStock,
        isLowStock,
        isOutOfStock,
        stockValue: +stockValue.toFixed(2),
        retailValue: +retailValue.toFixed(2),
        nextExpiry: nextLot?.expiryDate ?? null,
        daysToExpiry,
        expiryStatus,
        lotCount: p.lots.length,
      };
    })
    .filter((r) => {
      if (filter === "low") return r.isLowStock;
      if (filter === "out") return r.isOutOfStock;
      if (filter === "expiring")
        return r.expiryStatus === "critical" || r.expiryStatus === "warning";
      if (filter === "expired") return r.expiryStatus === "expired";
      return true;
    });

  // Resumen
  const summary = {
    totalProducts: products.length,
    totalStock: rows.reduce((s, r) => s + r.totalStock, 0),
    stockValue: +rows.reduce((s, r) => s + r.stockValue, 0).toFixed(2),
    retailValue: +rows.reduce((s, r) => s + r.retailValue, 0).toFixed(2),
    potentialProfit: +rows.reduce((s, r) => s + (r.retailValue - r.stockValue), 0).toFixed(2),
    lowStockCount: rows.filter((r) => r.isLowStock && !r.isOutOfStock).length,
    outOfStockCount: rows.filter((r) => r.isOutOfStock).length,
    expiringCritical: rows.filter((r) => r.expiryStatus === "critical").length,
    expiringWarning: rows.filter((r) => r.expiryStatus === "warning").length,
    expiredCount: rows.filter((r) => r.expiryStatus === "expired").length,
  };

  return NextResponse.json({ items: rows, summary });
});
