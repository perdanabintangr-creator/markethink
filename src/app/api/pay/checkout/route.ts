import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSnapTransaction, newOrderId, paymentsEnabled } from "@/lib/payments/midtrans";
import { priceItem } from "@/lib/payments/orders";

const schema = z.object({
  kind: z.enum(["plan", "addon", "bundle"]),
  id: z.string().regex(/^[a-z_]{2,40}$/),
});

/** Mulai pembayaran: harga dihitung di server, transaksi Midtrans dibuat, user diarahkan ke halaman bayar. */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (!paymentsEnabled()) return jsonError(503, "payments_disabled");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const { kind, id } = parsed.data;
  const admin = createAdminClient();
  const item = await priceItem(admin, s.profile.plan_id, kind, id);
  if (!item) return jsonError(400, "unknown_item");

  const orderId = newOrderId(kind);
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
  const back = kind === "plan" ? "/pricing" : "/tools/addons";
  const { error } = await admin.from("payments").insert({
    order_id: orderId,
    user_id: s.user.id,
    kind,
    item_id: id,
    item_name: item.name,
    amount_idr: item.amount,
  });
  if (error) return jsonError(500, "save_failed");
  try {
    const snap = await createSnapTransaction({
      orderId,
      amount: item.amount,
      item: { id, name: item.name },
      customer: { name: s.profile.full_name, email: s.profile.email ?? s.user.email },
      finishUrl: `${origin}${back}?paid=${encodeURIComponent(orderId)}`,
    });
    await admin.from("payments").update({ redirect_url: snap.redirectUrl, updated_at: new Date().toISOString() }).eq("order_id", orderId);
    return NextResponse.json({ orderId, redirectUrl: snap.redirectUrl, token: snap.token });
  } catch (err) {
    console.error("[pay] snap gagal", err);
    await admin.from("payments").update({ status: "failed", fulfill_error: String(err).slice(0, 500) }).eq("order_id", orderId);
    return jsonError(502, "gateway_error");
  }
}
