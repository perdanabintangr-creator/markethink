import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSnapTransaction, newOrderId } from "@/lib/payments/midtrans";
import { createDuitkuInvoice } from "@/lib/payments/duitku";
import { createMayarPayment } from "@/lib/payments/mayar";
import { activeProvider } from "@/lib/payments/gateway";
import { priceItem } from "@/lib/payments/orders";

const schema = z.object({
  kind: z.enum(["plan", "addon", "bundle"]),
  id: z.string().regex(/^[a-z_]{2,40}$/),
});

/** Mulai pembayaran: harga dihitung di server, tagihan dibuat di gateway aktif (Mayar/Duitku/Midtrans), user diarahkan ke halaman bayar. */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const provider = activeProvider();
  if (!provider) return jsonError(503, "payments_disabled");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const { kind, id } = parsed.data;
  const admin = createAdminClient();
  const item = await priceItem(admin, s.profile.plan_id, kind, id);
  if (!item) return jsonError(400, "unknown_item");

  const orderId = newOrderId(kind);
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
  const back = kind === "plan" ? "/pricing" : "/tools";
  const { error } = await admin.from("payments").insert({
    order_id: orderId,
    user_id: s.user.id,
    kind,
    item_id: id,
    item_name: item.name,
    amount_idr: item.amount,
    provider,
  });
  if (error) return jsonError(500, "save_failed");
  try {
    const customer = { name: s.profile.full_name, email: s.profile.email ?? s.user.email };
    const returnUrl = `${origin}${back}?paid=${encodeURIComponent(orderId)}`;
    const pay =
      provider === "mayar"
        ? await createMayarPayment({ orderId, amount: item.amount, item: { name: item.name }, customer, redirectUrl: returnUrl })
        : provider === "duitku"
        ? await createDuitkuInvoice({
            orderId,
            amount: item.amount,
            item: { name: item.name },
            customer,
            callbackUrl: `${origin}/api/webhooks/duitku`,
            returnUrl,
          })
        : await createSnapTransaction({ orderId, amount: item.amount, item: { id, name: item.name }, customer, finishUrl: returnUrl });
    await admin
      .from("payments")
      .update({ redirect_url: pay.redirectUrl, gateway_ref: "reference" in pay ? pay.reference : null, updated_at: new Date().toISOString() })
      .eq("order_id", orderId);
    return NextResponse.json({ orderId, redirectUrl: pay.redirectUrl });
  } catch (err) {
    console.error(`[pay] ${provider} gagal`, err);
    await admin.from("payments").update({ status: "failed", fulfill_error: String(err).slice(0, 500) }).eq("order_id", orderId);
    return jsonError(502, "gateway_error");
  }
}
