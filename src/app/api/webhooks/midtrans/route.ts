import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTransactionStatus, paymentsEnabled, validSignature, type MidtransStatus } from "@/lib/payments/midtrans";
import { syncPayment } from "@/lib/payments/orders";

/**
 * Notifikasi pembayaran dari Midtrans (atur URL ini di dashboard Midtrans → Payment Notification URL).
 * Tanda tangan dicek, lalu status selalu diambil ulang dari API Midtrans sebelum mengaktifkan apa pun.
 */
export async function POST(req: Request) {
  if (!paymentsEnabled()) return NextResponse.json({ ok: false }, { status: 503 });
  const n = (await req.json().catch(() => null)) as MidtransStatus | null;
  if (!n?.order_id || !validSignature(n)) return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  try {
    const status = await syncPayment(createAdminClient(), n.order_id, await getTransactionStatus(n.order_id));
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("[pay] notifikasi gagal", n.order_id, err);
    // 500 → Midtrans mengirim ulang notifikasi nanti.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
