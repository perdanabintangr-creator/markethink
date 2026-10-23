import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_OFFER_COLUMNS, toPlanOffer } from "@/lib/plan-offers";
import { getAddonOffers, getBundleOffers } from "@/lib/addons/access";
import { splitBundleAmount } from "@/lib/addons/addon-quota";
import { getTransactionStatus, paymentStatusOf, type MidtransStatus } from "./midtrans";
import { duitkuStatusOf, getDuitkuStatus } from "./duitku";

export type PaymentKind = "plan" | "addon" | "bundle";
const PAID_PLANS = ["starter", "pro", "promax"];

/** Harga yang dibayar dihitung ulang di server (promo + diskon member), tidak pernah dari browser. */
export async function priceItem(admin: SupabaseClient, planId: string, kind: PaymentKind, id: string): Promise<{ name: string; amount: number } | null> {
  if (kind === "plan") {
    if (!PAID_PLANS.includes(id)) return null;
    const { data } = await admin.from("plans").select(PLAN_OFFER_COLUMNS).eq("id", id).maybeSingle();
    if (!data) return null;
    const offer = toPlanOffer(data);
    return offer.price > 0 ? { name: `Markethink ${offer.name} (1 bulan)`, amount: offer.price } : null;
  }
  if (kind === "addon") {
    const offer = (await getAddonOffers(admin, planId))[id];
    return offer ? { name: `Add-on ${offer.name} (30 hari)`, amount: offer.price } : null;
  }
  const bundle = (await getBundleOffers(admin, planId)).find((b) => b.id === id);
  return bundle ? { name: `${bundle.name} (30 hari)`, amount: bundle.price } : null;
}

interface PaymentRow {
  order_id: string;
  user_id: string;
  kind: PaymentKind;
  item_id: string;
  months: number;
  amount_idr: number;
  payment_type: string | null;
  provider: string | null;
}

/** Status yang sudah diseragamkan dari gateway mana pun. */
export interface GatewayStatus {
  status: "paid" | "pending" | "failed" | "expired" | "canceled";
  /** Nominal yang dilaporkan gateway (untuk dicocokkan dengan tagihan); null bila tidak ada. */
  amount: number | null;
  paymentType: string | null;
  paidAt: string | null;
  notFound?: boolean;
  raw: unknown;
}

export function fromMidtrans(s: MidtransStatus): GatewayStatus {
  return {
    status: paymentStatusOf(s),
    amount: s.gross_amount ? Math.round(Number(s.gross_amount)) : null,
    paymentType: s.payment_type ?? null,
    paidAt: s.settlement_time ? new Date(`${s.settlement_time.replace(" ", "T")}+07:00`).toISOString() : null,
    notFound: s.status_code === "404",
    raw: s,
  };
}

async function fetchStatus(provider: string | null, orderId: string): Promise<GatewayStatus> {
  if (provider === "duitku") {
    const s = await getDuitkuStatus(orderId);
    return {
      status: duitkuStatusOf(s.statusCode),
      amount: s.amount !== undefined && s.amount !== "" ? Math.round(Number(s.amount)) : null,
      paymentType: null,
      paidAt: null,
      notFound: !s.statusCode,
      raw: s,
    };
  }
  return fromMidtrans(await getTransactionStatus(orderId));
}

/** Aktifkan paket/add-on/bundel memakai fungsi pencatatan yang sama dengan back office (laporan penjualan ikut tercatat). */
async function fulfill(admin: SupabaseClient, p: PaymentRow) {
  const method = `${p.provider === "duitku" ? "Duitku" : "Midtrans"} ${p.payment_type ?? ""}`.trim();
  const note = `Bayar otomatis ${p.order_id}`;
  if (p.kind === "plan") {
    const { error } = await admin.rpc("bo_record_sale", {
      p_user: p.user_id,
      p_plan: p.item_id,
      p_months: p.months,
      p_amount: p.amount_idr,
      p_method: method,
      p_note: note,
      p_actor: null,
      p_paid_at: new Date().toISOString(),
    });
    if (error) throw new Error(`plan: ${error.message}`);
    return;
  }
  const record = (addonId: string, amount: number, extraNote?: string) =>
    admin.rpc("bo_record_addon_sale", {
      p_user: p.user_id,
      p_addon: addonId,
      p_months: p.months,
      p_amount: amount,
      p_method: method,
      p_note: extraNote ? `${extraNote} · ${note}` : note,
      p_actor: null,
      p_paid_at: new Date().toISOString(),
    });
  if (p.kind === "addon") {
    const { error } = await record(p.item_id, p.amount_idr);
    if (error) throw new Error(`addon: ${error.message}`);
    return;
  }
  const { data: bundle } = await admin.from("addon_bundles").select("id, name, addon_ids").eq("id", p.item_id).maybeSingle();
  if (!bundle) throw new Error("bundle tidak ditemukan");
  const ids = bundle.addon_ids as string[];
  const { data: rows } = await admin.from("addons").select("id, monthly_quota").in("id", ids);
  const parts = splitBundleAmount(
    p.amount_idr,
    ids.map((id) => ({ id, quota: Number(rows?.find((r) => r.id === id)?.monthly_quota ?? 1) })),
  );
  // Aktivasi ulang setelah gagal sebagian: add-on yang sudah tercatat untuk order ini dilewati.
  const { data: done } = await admin.from("addon_subscriptions").select("addon_id").eq("user_id", p.user_id).like("note", `%${p.order_id}%`);
  for (const part of parts) {
    if (done?.some((d) => d.addon_id === part.id)) continue;
    const { data: saleId, error } = await record(part.id, part.amount, bundle.name);
    if (error) throw new Error(`bundle ${part.id}: ${error.message}`);
    if (saleId) await admin.from("addon_subscriptions").update({ bundle_id: bundle.id }).eq("id", saleId);
  }
}

/**
 * Cocokkan status pembayaran dengan gateway-nya lalu aktifkan sekali saja (aman dipanggil berkali-kali: notifikasi & halaman kembali).
 * `known` = status yang sudah diambil dari gateway (opsional).
 */
export async function syncPayment(admin: SupabaseClient, orderId: string, known?: GatewayStatus) {
  const { data: pay } = await admin
    .from("payments")
    .select("order_id, user_id, kind, item_id, months, amount_idr, status, payment_type, provider, fulfilled_at")
    .eq("order_id", orderId)
    .maybeSingle();
  if (!pay) return null;
  if (pay.fulfilled_at) return "paid" as const;
  const s = known ?? (await fetchStatus(pay.provider, orderId));
  if (s.notFound) return pay.status as string;
  const status = s.status;
  // Nominal harus sama dengan tagihan (menolak manipulasi nominal).
  const amountOk = s.amount === null || s.amount === pay.amount_idr;
  await admin
    .from("payments")
    .update({
      status: status === "paid" && !amountOk ? "failed" : status,
      payment_type: s.paymentType ?? pay.payment_type,
      raw: s.raw,
      ...(status === "paid" && { paid_at: s.paidAt ?? new Date().toISOString() }),
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", orderId);
  if (status !== "paid" || !amountOk) return status;

  // Klaim aktivasi (sekali saja walau notifikasi datang bersamaan).
  const { data: claimed } = await admin
    .from("payments")
    .update({ fulfilled_at: new Date().toISOString(), fulfill_error: null })
    .eq("order_id", orderId)
    .is("fulfilled_at", null)
    .select("order_id")
    .maybeSingle();
  if (!claimed) return "paid";
  try {
    await fulfill(admin, { ...(pay as PaymentRow), payment_type: s.paymentType ?? pay.payment_type });
  } catch (err) {
    console.error("[payments] aktivasi gagal", orderId, err);
    await admin
      .from("payments")
      .update({ fulfilled_at: null, fulfill_error: String(err instanceof Error ? err.message : err).slice(0, 500) })
      .eq("order_id", orderId);
    return "pending";
  }
  return "paid";
}
