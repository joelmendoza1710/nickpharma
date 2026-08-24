import { NextResponse } from "next/server";
import { getTypedSettings } from "@/lib/settings";

// GET /api/settings/pharmacy — endpoint público (sin auth)
// Retorna info de la farmacia + loyalty rates para facturas/recibos y POS
export async function GET() {
  const settings = await getTypedSettings();
  return NextResponse.json({
    pharmacy: settings.pharmacy,
    loyalty: {
      pointsRate: settings.loyalty.pointsRate,
      pointsEarnRate: settings.loyalty.pointsEarnRate,
    },
  });
}
