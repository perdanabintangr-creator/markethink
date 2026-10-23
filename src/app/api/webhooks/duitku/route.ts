import { createAdminClient } from "@/lib/supabase/admin";
import { duitkuEnabled, validDuitkuCallback, type DuitkuCallback } from "@/lib/payments/duitku";
import { syncPayment } from "@/lib/payments/orders";

/**
 * Callback pembayaran dari Duitku (form-urlencoded). URL ini dikirim otomatis di tiap tagihan.
 * Tanda tangan dicek, lalu status selalu diambil ulang dari API Duitku sebelum mengaktifkan apa pun.
 */
export async function POST(req: Request) {
  if (!duitkuEnabled()) return new Response("disabled", { status: 503 });
  const form = await req.formData().catch(() => null);
  const n = Object.fromEntries([...(form?.entries() ?? [])].map(([k, v]) => [k, String(v)])) as DuitkuCallback;
  if (!n.merchantOrderId || !validDuitkuCallback(n)) return new Response("invalid signature", { status: 401 });
  try {
    await syncPayment(createAdminClient(), n.merchantOrderId);
    return new Response("OK");
  } catch (err) {
    console.error("[pay] callback duitku gagal", n.merchantOrderId, err);
    // 500 → Duitku mengirim ulang callback nanti.
    return new Response("error", { status: 500 });
  }
}
