/**
 * Add-on Tools Pro (dijual terpisah dari paket, untuk paket yang belum membuka Tools Pro).
 * Murni (tanpa DB) supaya bisa diuji. Aman dipakai di server maupun client.
 *
 * Dua batas per bulan pemakaian (dihitung dari tanggal mulai pembelian):
 * 1. Jumlah hasil = `monthly_quota` add-on (revisi tidak dihitung).
 * 2. Modal AI = 60% dari uang yang dibayar per bulan → laba minimal 40% walau semua hasil memakai riset berat (founder 18 Okt).
 * Sisa hasil yang ditampilkan = yang lebih kecil dari keduanya.
 */

/** Bagian uang add-on yang boleh habis untuk biaya AI (sisanya laba minimum 40%). */
export const ADDON_COST_SHARE = 0.6;
/** Perkiraan modal AI per hasil (Rupiah, otak Senior); riset web lebih mahal. */
export const ADDON_RUN_COST_IDR: Record<string, number> = { riset_pro: 10_000, kolpr_pro: 8_000 };
export const DEFAULT_ADDON_RUN_COST_IDR = 5_000;
export const addonRunCost = (addonId: string) => ADDON_RUN_COST_IDR[addonId] ?? DEFAULT_ADDON_RUN_COST_IDR;
/** Revisi tanpa riset ulang: ±60% biaya hasil baru. */
export const addonRevisionCost = (addonId: string) => Math.ceil(addonRunCost(addonId) * 0.6);

export interface AddonQuotaInput {
  addonId: string;
  quota: number;
  /** Harga normal add-on (dipakai bila pembelian dicatat Rp0, mis. hadiah). */
  listPrice: number;
  /** Pembelian yang sedang berjalan. */
  current: { period_start: string; period_end: string; amount_idr: number; months: number } | null;
  /** Akhir masa aktif terjauh (termasuk perpanjangan yang mengantre). */
  paidUntil: string | null;
  /** Hasil add-on (source 'addon') sejak awal bulan pemakaian berjalan. */
  runs: { created_at: string; status: string; revision_of: string | null; cost_idr: number }[];
}

export interface AddonQuota {
  active: boolean;
  paidUntil: string | null;
  windowStart: string | null;
  quota: number;
  usedRuns: number;
  budgetIdr: number;
  usedIdr: number;
  /** Sisa hasil baru bulan ini (0 bila tidak aktif). */
  remaining: number;
  /** Cukup modal untuk 1 revisi. */
  canRevise: boolean;
}

function addMonths(date: Date, n: number) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

/** Awal bulan pemakaian berjalan dari sebuah pembelian (kuota direset tiap bulan sejak tanggal mulai). */
export function addonWindowStart(periodStart: string, now = new Date()) {
  let start = new Date(periodStart);
  while (addMonths(start, 1) <= now) start = addMonths(start, 1);
  return start;
}

/** Hasil yang masih diproses dihitung dengan perkiraan biayanya (biaya nyata baru tercatat saat selesai). */
const RUNNING_STALE_MS = 15 * 60_000;

export function computeAddonQuota(i: AddonQuotaInput, now = new Date()): AddonQuota {
  const empty: AddonQuota = {
    active: false,
    paidUntil: i.paidUntil,
    windowStart: null,
    quota: i.quota,
    usedRuns: 0,
    budgetIdr: 0,
    usedIdr: 0,
    remaining: 0,
    canRevise: false,
  };
  if (!i.current) return empty;
  const windowStart = addonWindowStart(i.current.period_start, now);
  const perMonth = i.current.amount_idr > 0 ? i.current.amount_idr / Math.max(1, i.current.months) : i.listPrice;
  const budgetIdr = Math.floor(perMonth * ADDON_COST_SHARE);
  const runCost = addonRunCost(i.addonId);
  const inWindow = i.runs.filter((r) => {
    if (new Date(r.created_at) < windowStart) return false;
    if (r.status === "error") return false;
    return r.status === "ok" || now.getTime() - new Date(r.created_at).getTime() < RUNNING_STALE_MS;
  });
  const usedRuns = inWindow.filter((r) => !r.revision_of).length;
  const usedIdr = inWindow.reduce(
    (sum, r) => sum + (r.status === "running" ? (r.revision_of ? addonRevisionCost(i.addonId) : runCost) : Math.max(0, r.cost_idr)),
    0,
  );
  const budgetLeft = Math.max(0, budgetIdr - usedIdr);
  const remaining = Math.max(0, Math.min(i.quota - usedRuns, Math.floor(budgetLeft / runCost)));
  return {
    active: true,
    paidUntil: i.paidUntil,
    windowStart: windowStart.toISOString(),
    quota: i.quota,
    usedRuns,
    budgetIdr,
    usedIdr: Math.round(usedIdr),
    remaining,
    canRevise: budgetLeft >= addonRevisionCost(i.addonId),
  };
}

/** Diskon add-on & bundel untuk member paket Pro dan Promax (Free & Starter harga normal). */
export const MEMBER_DISCOUNT = 0.15;
export const MEMBER_DISCOUNT_PLANS = ["pro", "promax"];
export const hasMemberDiscount = (planId: string | null | undefined) => MEMBER_DISCOUNT_PLANS.includes(planId ?? "");
/** Harga setelah diskon member (dibulatkan ke ratusan rupiah). */
export const memberPrice = (price: number) => Math.round((price * (1 - MEMBER_DISCOUNT)) / 100) * 100;

/**
 * Bagi uang pembelian bundel ke tiap add-on sesuai kebutuhan modalnya (kuota × perkiraan modal per hasil),
 * supaya batas modal 60% tiap add-on cukup untuk kuotanya. Total bagian = jumlah yang dibayar.
 */
export function splitBundleAmount(amount: number, addons: { id: string; quota: number }[]) {
  const weights = addons.map((a) => Math.max(1, a.quota) * addonRunCost(a.id));
  const total = weights.reduce((s, w) => s + w, 0);
  const parts = weights.map((w) => Math.floor((amount * w) / total));
  parts[parts.length - 1] += amount - parts.reduce((s, p) => s + p, 0);
  return addons.map((a, i) => ({ id: a.id, amount: parts[i] }));
}

/** Harga minimal supaya kuota muat di batas modal (laba ≥ 40%). */
export const minPriceForQuota = (addonId: string, quota: number) => Math.ceil((quota * addonRunCost(addonId)) / ADDON_COST_SHARE);
