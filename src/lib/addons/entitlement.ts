import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ADDONS, type AddonId } from "./catalog";

/**
 * Hak pakai add-on. Urutan pemakaian kuota: admin (tanpa batas) → jatah Promax bulan ini → add-on yang dibeli → percobaan gratis.
 * - Add-on dibeli: `monthly_quota` per bulan, dihitung sejak tanggal mulai periode pembelian.
 * - Promax: `promax_quota` per bulan kalender WIB.
 * - Percobaan: `trial_quota` sekali seumur akun (semua paket).
 */

export type RunSource = "admin" | "promax" | "paid" | "trial";

export interface AddonStatus {
  id: AddonId;
  name: string;
  price: number;
  quota: number;
  promaxQuota: number;
  trialQuota: number;
  isAdmin: boolean;
  isPromax: boolean;
  /** Paket Free: tanpa percobaan gratis, Tools Pro terkunci sampai beli add-on/upgrade. */
  isFree: boolean;
  paidUntil: string | null;
  paidRemaining: number;
  promaxRemaining: number;
  trialRemaining: number;
  /** Total sisa pemakaian (Infinity untuk admin). */
  remaining: number;
  /** Punya akses penuh (beli/Promax/admin) — untuk tool tanpa kuota seperti kalkulator. */
  hasAccess: boolean;
  nextSource: RunSource | null;
}

const WIB_MS = 7 * 3_600_000;
const STALE_RUNNING_MS = 15 * 60_000;

export function wibMonthStart(now = Date.now()) {
  const d = new Date(now + WIB_MS);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - WIB_MS);
}

function addMonths(date: Date, n: number) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

/** Awal "bulan" berjalan dari sebuah periode pembelian (kuota direset tiap bulan sejak tanggal mulai). */
export function paidWindowStart(periodStart: Date, now = new Date()) {
  let start = new Date(periodStart);
  while (addMonths(start, 1) <= now) start = addMonths(start, 1);
  return start;
}

interface Profileish {
  id: string;
  role: string;
  plan_id: string;
}

export async function getAddonStatuses(admin: SupabaseClient, profile: Profileish): Promise<AddonStatus[]> {
  const nowIso = new Date().toISOString();
  const [{ data: rows }, { data: subs }, { data: runs }] = await Promise.all([
    admin.from("addons").select("id, name, price_idr, monthly_quota, promax_quota, trial_quota, is_active"),
    admin
      .from("addon_subscriptions")
      .select("addon_id, period_start, period_end")
      .eq("user_id", profile.id)
      .is("refunded_at", null)
      .gt("period_end", nowIso),
    admin
      .from("tool_runs")
      .select("addon_id, source, status, created_at, revision_of, quota_units")
      .eq("user_id", profile.id)
      .neq("status", "error")
      .limit(5000),
  ]);

  const now = new Date();
  // Revisi (perbaikan hasil berdasarkan koreksi user) tidak memotong kuota.
  const counted = (runs ?? []).filter(
    (r) => !r.revision_of && (r.status === "ok" || now.getTime() - new Date(r.created_at).getTime() < STALE_RUNNING_MS),
  );
  const monthStart = wibMonthStart();
  const isAdmin = profile.role === "admin";
  const isPromax = profile.plan_id === "promax";
  const isFree = profile.plan_id === "beta";

  return ADDONS.map((info) => {
    const row = (rows ?? []).find((r) => r.id === info.id);
    const quota = row ? Number(row.monthly_quota) : info.quota;
    const promaxQuota = row ? Number(row.promax_quota) : 3;
    const trialQuota = row ? Number(row.trial_quota) : 1;
    const mine = counted.filter((r) => r.addon_id === info.id);
    // Jumlah kuota terpakai (otak Director memakai 2 kuota per hasil).
    const units = (list: typeof mine) => list.reduce((sum, r) => sum + Number(r.quota_units ?? 1), 0);

    // Pembelian yang sedang berjalan (bisa ada antrean perpanjangan sesudahnya).
    const active = (subs ?? [])
      .filter((s) => s.addon_id === info.id)
      .sort((a, b) => a.period_start.localeCompare(b.period_start));
    const current = active.find((s) => new Date(s.period_start) <= now && new Date(s.period_end) > now);
    const paidUntil = active.length ? active[active.length - 1].period_end : null;
    let paidRemaining = 0;
    if (current) {
      const windowStart = paidWindowStart(new Date(current.period_start), now);
      const used = units(mine.filter((r) => r.source === "paid" && new Date(r.created_at) >= windowStart));
      paidRemaining = Math.max(0, quota - used);
    }
    const promaxRemaining = isPromax
      ? Math.max(0, promaxQuota - units(mine.filter((r) => r.source === "promax" && new Date(r.created_at) >= monthStart)))
      : 0;
    // Paket Free tidak mendapat percobaan gratis Tools Pro (keputusan founder): harus beli add-on atau upgrade paket.
    const trialRemaining = isFree ? 0 : Math.max(0, trialQuota - units(mine.filter((r) => r.source === "trial")));

    const nextSource: RunSource | null = isAdmin
      ? "admin"
      : promaxRemaining > 0
        ? "promax"
        : paidRemaining > 0
          ? "paid"
          : trialRemaining > 0
            ? "trial"
            : null;

    return {
      id: info.id,
      name: row?.name ?? info.name,
      price: row ? Number(row.price_idr) : info.price,
      quota,
      promaxQuota,
      trialQuota,
      isAdmin,
      isPromax,
      isFree,
      paidUntil,
      paidRemaining,
      promaxRemaining,
      trialRemaining,
      remaining: isAdmin ? Number.POSITIVE_INFINITY : promaxRemaining + paidRemaining + trialRemaining,
      hasAccess: isAdmin || isPromax || Boolean(current),
      nextSource,
    };
  });
}

export async function getAddonStatus(admin: SupabaseClient, profile: Profileish, addonId: AddonId) {
  return (await getAddonStatuses(admin, profile)).find((s) => s.id === addonId)!;
}

/** Sumber kuota untuk satu hasil yang memakai `units` kuota (Director = 2). null = kuota tidak cukup. */
export function pickSource(status: AddonStatus, units: number): RunSource | null {
  if (status.isAdmin) return "admin";
  if (status.promaxRemaining >= units) return "promax";
  if (status.paidRemaining >= units) return "paid";
  if (status.trialRemaining >= units) return "trial";
  return null;
}
