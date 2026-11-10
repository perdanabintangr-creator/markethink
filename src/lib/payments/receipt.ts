import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { invoiceEmail, type InvoiceData } from "@/lib/invoice";

/** Kumpulkan data invoice satu pembayaran (hanya untuk pemiliknya bila `userId` diisi). */
export async function loadInvoice(admin: SupabaseClient, orderId: string, userId?: string): Promise<InvoiceData | null> {
  let q = admin
    .from("payments")
    .select("order_id, user_id, kind, item_id, months, amount_idr, payment_type, provider, paid_at, status")
    .eq("order_id", orderId);
  if (userId) q = q.eq("user_id", userId);
  const { data: pay } = await q.maybeSingle();
  if (!pay || pay.status !== "paid") return null;

  const { data: prof } = await admin.from("profiles").select("email, full_name").eq("id", pay.user_id).maybeSingle();
  const months = Number(pay.months ?? 1);
  let itemName = String(pay.item_id);
  let planName: string | null = null;
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  if (pay.kind === "plan") {
    const { data: plan } = await admin.from("plans").select("name").eq("id", pay.item_id).maybeSingle();
    planName = (plan?.name as string | undefined) ?? String(pay.item_id);
    itemName = `Langganan Marqthink ${planName} (${months} bulan)`;
    const { data: sub } = await admin
      .from("subscriptions")
      .select("current_period_start, current_period_end")
      .eq("user_id", pay.user_id)
      .eq("plan_id", pay.item_id)
      .lte("created_at", new Date(Date.parse(pay.paid_at ?? new Date().toISOString()) + 10 * 60_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    periodStart = (sub?.current_period_start as string | undefined) ?? null;
    periodEnd = (sub?.current_period_end as string | undefined) ?? null;
  } else {
    const table = pay.kind === "addon" ? "addons" : "addon_bundles";
    const { data: item } = await admin.from(table).select("name").eq("id", pay.item_id).maybeSingle();
    itemName = `${(item?.name as string | undefined) ?? pay.item_id} (${months * 30} hari)`;
    const { data: sub } = await admin
      .from("addon_subscriptions")
      .select("period_start, period_end")
      .eq("user_id", pay.user_id)
      .like("note", `%${pay.order_id}%`)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    periodStart = (sub?.period_start as string | undefined) ?? null;
    periodEnd = (sub?.period_end as string | undefined) ?? null;
  }

  return {
    orderId: pay.order_id as string,
    customerName: (prof?.full_name as string | null) ?? "",
    customerEmail: (prof?.email as string | null) ?? "",
    itemName,
    planName,
    amount: Number(pay.amount_idr),
    paymentType: (pay.payment_type as string | null) ?? null,
    provider: (pay.provider as string | null) ?? null,
    paidAt: (pay.paid_at as string | null) ?? new Date().toISOString(),
    periodStart,
    periodEnd,
  };
}

/** Kirim email "Pembayaran berhasil" + invoice. Tidak pernah melempar error (pembayaran tetap sukses walau email gagal). */
export async function sendPaymentReceipt(admin: SupabaseClient, orderId: string) {
  try {
    const inv = await loadInvoice(admin, orderId);
    if (!inv?.customerEmail) return;
    const { subject, html } = invoiceEmail(inv, env.appUrl);
    const res = await sendEmail(inv.customerEmail, subject, html);
    if (res.skipped) console.error("[receipt] email invoice gagal", orderId, res.error);
  } catch (err) {
    console.error("[receipt] gagal menyiapkan invoice", orderId, err);
  }
}
