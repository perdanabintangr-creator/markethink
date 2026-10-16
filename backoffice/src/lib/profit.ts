/**
 * Laba rugi per akun: klasifikasi status & pengecekan "pengaman laba".
 * Murni (tanpa DB) supaya bisa diuji. Angka rupiah; biaya AI sudah dikonversi dari USD oleh pemanggil.
 */

/** Target margin minimum per akun berbayar (laba ÷ pendapatan). */
export const TARGET_MARGIN = 0.3;
/** Margin dianggap "sangat menguntungkan" mulai angka ini. */
export const GREAT_MARGIN = 0.7;
/** Nilai modal AI per kredit (sama dengan aplikasi AI: 1 kredit ≈ Rp100). */
export const IDR_PER_CREDIT = 100;

export type PnlStatus = "loss" | "thin" | "profit" | "great" | "idle";

export const PNL_STATUS: Record<PnlStatus, { label: string; hint: string }> = {
  loss: { label: "Rugi", hint: "Biaya AI lebih besar dari pendapatan" },
  thin: { label: "Untung tipis", hint: `Margin di bawah ${Math.round(TARGET_MARGIN * 100)}%` },
  profit: { label: "Untung", hint: `Margin ${Math.round(TARGET_MARGIN * 100)}–${Math.round(GREAT_MARGIN * 100)}%` },
  great: { label: "Sangat untung", hint: `Margin ≥ ${Math.round(GREAT_MARGIN * 100)}%` },
  idle: { label: "Tanpa aktivitas", hint: "Belum ada pendapatan maupun biaya" },
};

export function pnlStatus(revenue: number, cost: number): PnlStatus {
  if (revenue <= 0 && cost <= 0) return "idle";
  const profit = revenue - cost;
  if (profit < 0) return "loss";
  const margin = revenue > 0 ? profit / revenue : 0;
  if (margin >= GREAT_MARGIN) return "great";
  if (margin >= TARGET_MARGIN) return "profit";
  return "thin";
}

export const marginPct = (revenue: number, cost: number) => (revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100) : null);

export interface PnlAccount {
  plan_id: string;
  internal: boolean;
  revenue: number;
  cost: number;
  month_limit: number | null;
  plan_credits: number;
  plan_price_idr: number;
  credit_override: number | null;
  bonus_credits: number;
  active_until: string | null;
}

export interface Risk {
  key: "unpaid_plan" | "big_override" | "bonus" | "loss";
  label: string;
  fix: string;
}

/**
 * Risiko yang membuat akun bisa merugikan + saran perbaikannya.
 * Prinsip pengaman: biaya AI maksimum akun = jatah kredit × Rp100, jadi selama jatah kredit
 * ≤ harga paket × (1 − target margin), akun berbayar tidak mungkin rugi.
 */
export function accountRisks(a: PnlAccount, now = Date.now()): Risk[] {
  if (a.internal) return [];
  const risks: Risk[] = [];
  const paidPlan = a.plan_id !== "beta";
  const activeUntil = a.active_until ? new Date(a.active_until).getTime() : null;
  if (paidPlan && (activeUntil === null || activeUntil < now)) {
    risks.push({
      key: "unpaid_plan",
      label: activeUntil === null ? "Paket berbayar tanpa catatan bayar" : "Masa aktif sudah lewat, paket masih berbayar",
      fix: "Catat pembayaran, atau turunkan ke Free",
    });
  }
  // Free: jatah paket Free sudah jadi biaya promosi yang disengaja; lebih dari itu = rugi tambahan.
  const safeCredits = paidPlan ? maxSafeCredits(a.plan_price_idr) : a.plan_credits;
  if (a.credit_override !== null && a.credit_override > safeCredits) {
    risks.push({
      key: "big_override",
      label: `Kuota khusus ${a.credit_override} kredit/bln (maks aman ${safeCredits})`,
      fix: "Kecilkan kuota khusus atau hapus agar ikut paket",
    });
  }
  if (a.bonus_credits > 0) {
    risks.push({ key: "bonus", label: `Bonus kredit ${a.bonus_credits} bulan ini`, fix: "Pastikan bonus memang disengaja (promo/kompensasi)" });
  }
  if (paidPlan && a.cost > a.revenue && a.revenue > 0) {
    risks.push({ key: "loss", label: "Biaya AI melebihi pendapatan akun ini", fix: "Cek kuota khusus/bonus; tawarkan upgrade paket" });
  }
  return risks;
}

/** Jatah kredit maksimum agar margin paket tetap ≥ target. */
export function maxSafeCredits(priceIdr: number, target = TARGET_MARGIN) {
  return Math.max(0, Math.floor((priceIdr * (1 - target)) / IDR_PER_CREDIT));
}

/** Margin terjamin paket: walau user menghabiskan seluruh kredit, laba minimum sebesar ini. */
export function guaranteedMargin(priceIdr: number, credits: number, idrPerCredit = IDR_PER_CREDIT) {
  if (priceIdr <= 0) return null;
  return (priceIdr - credits * idrPerCredit) / priceIdr;
}
