import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCreditStatus, IDR_PER_USD } from "@/lib/credits";
import { promoPrice } from "@/lib/plan-offers";
import { ADDONS, addonInfo } from "./catalog";
import { computeAddonQuota, type AddonQuota } from "./addon-quota";
import type { AddonAccessLite, AddonOffer, ToolAccessLite } from "./format";

type Profile = { id: string; role: string; plan_id: string };

/**
 * Hak pakai Tools Pro & Markethink Agent: ditentukan paket (feature flag `tools_pro` / `agent`) dan saldo kredit bulanan.
 * Bila paket belum membuka Tools Pro, add-on yang dibeli terpisah (untuk `addonId`) membuka tool kelompok itu.
 * Admin selalu boleh.
 */
export async function getToolAccess(admin: SupabaseClient, profile: Profile, addonId?: string): Promise<ToolAccessLite> {
  const isAdmin = profile.role === "admin";
  const [{ data: flags }, credits] = await Promise.all([
    admin.from("feature_flags").select("key, enabled").eq("plan_id", profile.plan_id).in("key", ["tools_pro", "agent"]),
    getCreditStatus(profile.id),
  ]);
  const flag = (k: string) => isAdmin || Boolean(flags?.find((f) => f.key === k)?.enabled);
  const base: ToolAccessLite = {
    allowed: flag("tools_pro"),
    agent: flag("agent"),
    isAdmin,
    isFree: profile.plan_id === "beta" && !isAdmin,
    planId: profile.plan_id,
    remaining: credits.remaining,
    monthLimit: credits.monthLimit,
  };
  if (base.allowed) return { ...base, via: "plan" };
  if (!addonId || !addonInfo(addonId)) return base;
  const q = (await getAddonQuotas(admin, profile.id, [addonId]))[addonId];
  const addon = toAddonLite(addonId, q);
  return addon.active ? { ...base, allowed: true, via: "addon", addon } : { ...base, addon };
}

export const toAddonLite = (id: string, q: AddonQuota): AddonAccessLite => ({
  id,
  active: q.active,
  remaining: q.remaining,
  quota: q.quota,
  paidUntil: q.paidUntil,
  canRevise: q.canRevise,
});

/** Status kuota add-on milik user (per add-on). */
export async function getAddonQuotas(admin: SupabaseClient, userId: string, addonIds: string[] = ADDONS.map((a) => a.id)) {
  const nowIso = new Date().toISOString();
  const [{ data: rows }, { data: subs }] = await Promise.all([
    admin.from("addons").select("id, price_idr, monthly_quota").in("id", addonIds),
    admin
      .from("addon_subscriptions")
      .select("addon_id, period_start, period_end, amount_idr, months")
      .eq("user_id", userId)
      .in("addon_id", addonIds)
      .is("refunded_at", null)
      .gt("period_end", nowIso),
  ]);
  const now = new Date();
  const current = new Map<string, NonNullable<typeof subs>[number]>();
  const until = new Map<string, string>();
  for (const s of subs ?? []) {
    if (!until.has(s.addon_id) || s.period_end > until.get(s.addon_id)!) until.set(s.addon_id, s.period_end);
    if (new Date(s.period_start) <= now) {
      const prev = current.get(s.addon_id);
      if (!prev || s.period_start > prev.period_start) current.set(s.addon_id, s);
    }
  }
  // Hasil add-on hanya perlu sejak awal pembelian berjalan yang paling awal.
  const since = [...current.values()].reduce<string | null>((a, s) => (!a || s.period_start < a ? s.period_start : a), null);
  const { data: runs } = since
    ? await admin
        .from("tool_runs")
        .select("addon_id, created_at, status, revision_of, cost_usd")
        .eq("user_id", userId)
        .eq("source", "addon")
        .gte("created_at", since)
        .limit(2000)
    : { data: [] };

  const out: Record<string, AddonQuota> = {};
  for (const id of addonIds) {
    const row = (rows ?? []).find((r) => r.id === id);
    const info = addonInfo(id);
    const cur = current.get(id) ?? null;
    out[id] = computeAddonQuota(
      {
        addonId: id,
        quota: row ? Number(row.monthly_quota) : (info?.quota ?? 0),
        listPrice: row ? Number(row.price_idr) : (info?.price ?? 0),
        current: cur && { period_start: cur.period_start, period_end: cur.period_end, amount_idr: Number(cur.amount_idr), months: Number(cur.months) },
        paidUntil: until.get(id) ?? null,
        runs: (runs ?? [])
          .filter((r) => r.addon_id === id)
          .map((r) => ({ created_at: r.created_at, status: r.status, revision_of: r.revision_of, cost_idr: Number(r.cost_usd) * IDR_PER_USD })),
      },
      now,
    );
  }
  return out;
}

/** Harga add-on yang ditawarkan (harga coret saat promo aktif). Add-on nonaktif tidak ditawarkan. */
export async function getAddonOffers(admin: SupabaseClient): Promise<Record<string, AddonOffer>> {
  const { data } = await admin.from("addons").select("id, name, price_idr, monthly_quota, is_active, promo_price_idr, promo_label, promo_until");
  const out: Record<string, AddonOffer> = {};
  for (const r of data ?? []) {
    if (!r.is_active || !addonInfo(r.id)) continue;
    const price = Number(r.price_idr);
    if (price <= 0) continue;
    const promo = promoPrice(price, r.promo_price_idr, r.promo_until);
    out[r.id] = {
      id: r.id,
      name: r.name,
      price: promo ?? price,
      quota: Number(r.monthly_quota),
      ...(promo !== null && {
        originalPrice: price,
        ...(r.promo_label?.trim() && { promoLabel: r.promo_label.trim() }),
        ...(r.promo_until && { promoUntil: r.promo_until }),
      }),
    };
  }
  return out;
}
