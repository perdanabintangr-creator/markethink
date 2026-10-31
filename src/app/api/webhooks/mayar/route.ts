import { createAdminClient } from "@/lib/supabase/admin";
import { mayarEnabled, verifyMayarToken, webhookHints } from "@/lib/payments/mayar";
import { syncPayment } from "@/lib/payments/orders";

/**
 * Webhook Mayar (daftarkan URL ini di dashboard Mayar → Integration → Webhook).
 * Tagihan dicari dari nomor order di deskripsi / id Mayar, lalu status selalu dicek ulang ke API Mayar.
 * Bila API belum menunjukkan lunas, webhook "payment.received" hanya dipercaya kalau token callback cocok
 * (MAYAR_WEBHOOK_TOKEN) dan nominalnya tidak kurang dari tagihan.
 */
export async function POST(req: Request) {
  if (!mayarEnabled()) return new Response("disabled", { status: 503 });
  const token = verifyMayarToken(req.headers.get("x-callback-token"));
  if (token === false) return new Response("invalid token", { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return new Response("invalid body", { status: 400 });

  const h = webhookHints(body);
  const admin = createAdminClient();
  const cols = "order_id, amount_idr";
  let pay: { order_id: string; amount_idr: number } | null = null;
  if (h.orderId) {
    const { data } = await admin.from("payments").select(cols).eq("provider", "mayar").eq("order_id", h.orderId).maybeSingle();
    pay = data;
  }
  if (!pay && h.ids.length) {
    const { data } = await admin.from("payments").select(cols).eq("provider", "mayar").in("gateway_ref", h.ids).limit(1).maybeSingle();
    pay = data;
  }
  // Event untuk produk Mayar lain (bukan tagihan Marqthink) → cukup dibalas OK.
  if (!pay) return new Response("ignored");

  const trustedPaid = token === true && h.event === "payment.received" && h.paidFlag && h.amount !== null && h.amount >= pay.amount_idr;
  try {
    let result: string | null = null;
    try {
      result = await syncPayment(admin, pay.order_id);
    } catch (err) {
      if (!trustedPaid) throw err;
      console.warn("[pay] cek status Mayar gagal, memakai webhook bertoken", pay.order_id, err);
    }
    if (result !== "paid" && trustedPaid) {
      await syncPayment(admin, pay.order_id, { status: "paid", amount: pay.amount_idr, paymentType: null, paidAt: null, raw: body });
    }
    return new Response("OK");
  } catch (err) {
    console.error("[pay] webhook mayar gagal", pay.order_id, err);
    return new Response("error", { status: 500 });
  }
}
