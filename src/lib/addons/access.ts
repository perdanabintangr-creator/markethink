import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCreditStatus, IDR_PER_USD } from "@/lib/credits";
import { promoPrice } from "@/lib/plan-offers";
import { ADDONS, addonInfo } from "./catalog";
import { computeAddonQuota, hasMemberDiscount, memberPrice, type AddonQuota } from "./addon-quota";
import type { AddonAccessLite, AddonOffer, BundleOffer, ToolAccessLite } from "./format";

type Profile = { id: string; role: string; plan_id: string };

/**
 * Hak pakai Smart Tools & Marqthink Agent: ditentukan paket (feature flag `tools_pro` / `agent`) dan saldo kredit bulanan.
 * Add-on yang dibeli terpisah (untuk `addonId`) dipakai lebih dulu di semua paket; untuk Free, add-on satu-satunya pembuka tool.
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
  if (!addonId || !addonInfo(addonId) || isAdmin) return base.allowed ? { ...base, via: "plan", planAllowed: true } : base;
  // Add-on yang dibeli dipakai dulu (semua paket); habis → kuota paket (bila paket membuka Smart Tools).
  const q = (await getAddonQuotas(admin, profile.id, [addonId]))[addonId];
  const addon = toAddonLite(addonId, q);
  if (addon.active && addon.remaining > 0) return { ...base, allowed: true, via: "addon", addon, planAllowed: base.allowed };
  if (base.allowed) return { ...base, via: "plan", addon, planAllowed: true };
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

type PromoRow = { price_idr: number | string; promo_price_idr: number | null; promo_label: string | null; promo_until: string | null };

/** Harga yang dibayar: harga promo (bila aktif), lalu diskon member Pro/Promax. Harga normal dicoret bila ada potongan. */
function priceOf(r: PromoRow, planId?: string): Pick<AddonOffer, "price" | "originalPrice" | "promoLabel" | "promoUntil" | "memberDiscount"> {
  const price = Number(r.price_idr);
  const promo = promoPrice(price, r.promo_price_idr, r.promo_until);
  const member = hasMemberDiscount(planId);
  const paid = member ? memberPrice(promo ?? price) : (promo ?? price);
  return {
    price: paid,
    ...(paid < price && { originalPrice: price }),
    ...(promo !== null && {
      ...(r.promo_label?.trim() && { promoLabel: r.promo_label.trim() }),
      ...(r.promo_until && { promoUntil: r.promo_until }),
    }),
    ...(member && { memberDiscount: true }),
  };
}

/** Harga add-on yang ditawarkan ke user (promo + diskon member Pro/Promax). Add-on nonaktif tidak ditawarkan. */
export async function getAddonOffers(admin: SupabaseClient, planId?: string): Promise<Record<string, AddonOffer>> {
  const { data } = await admin.from("addons").select("id, name, price_idr, monthly_quota, is_active, promo_price_idr, promo_label, promo_until");
  const out: Record<string, AddonOffer> = {};
  for (const r of data ?? []) {
    if (!r.is_active || !addonInfo(r.id)) continue;
    if (Number(r.price_idr) <= 0) continue;
    out[r.id] = { id: r.id, name: r.name, quota: Number(r.monthly_quota), ...priceOf(r, planId) };
  }
  return out;
}

/** Bundel add-on yang ditawarkan (harga lebih murah dari jumlah eceran; promo + diskon member berlaku). */
export async function getBundleOffers(admin: SupabaseClient, planId?: string): Promise<BundleOffer[]> {
  const [{ data: bundles }, offers] = await Promise.all([
    admin.from("addon_bundles").select("id, name, tagline, addon_ids, price_idr, promo_price_idr, promo_label, promo_until, is_active").order("sort_order"),
    getAddonOffers(admin),
  ]);
  return (bundles ?? [])
    .filter((b) => b.is_active && (b.addon_ids as string[]).every((id) => offers[id]))
    .map((b) => {
      const ids = b.addon_ids as string[];
      return {
        id: b.id,
        name: b.name,
        tagline: b.tagline ?? "",
        addons: ids.map((id) => ({ id, quota: offers[id].quota })),
        retailPrice: ids.reduce((sum, id) => sum + (offers[id].originalPrice ?? offers[id].price), 0),
        ...priceOf(b, planId),
      };
    });
}
