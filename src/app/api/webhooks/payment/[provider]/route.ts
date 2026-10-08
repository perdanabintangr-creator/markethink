import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments/provider";

/**
 * Placeholder webhook payment gateway (Midtrans/Xendit) — diaktifkan di Fase 7.
 * Saat aktif: verifikasi signature → simpan ke payment_events → update subscriptions / credit_ledger.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const impl = getPaymentProvider();
  if (!impl || impl.id !== provider) {
    return NextResponse.json({ error: "payment_not_enabled" }, { status: 501 });
  }
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
