/**
 * Paket Autopilot Konten (ACC founder 22 Nov 2026): Autopilot + Kalender Konten dijual terpisah dari paket Pro/Promax dan bisa
 * dibeli semua user (termasuk Free). Masa aktif 30 hari per pembelian. Biaya AI tetap dicatat di usage_logs (tidak memotong
 * kredit chat). Modul murni (diuji vitest); pengambilan data ada di content-access.ts.
 */
export interface AutopilotAllowance {
  postsPerWeek: number;
  postsPerMonth: number;
  /** Visual isi per carousel selain cover (Visual Director). */
  innerVisuals: number;
  /** Jatah "buat ulang gambar" per 30 hari (ACC founder 27 Nov: menutup celah modal gambar). */
  regensPerMonth: number;
}

export const CONTENT_PLAN_IDS = ["konten_lite", "konten_pro", "konten_bisnis"] as const;
export type ContentPlanId = (typeof CONTENT_PLAN_IDS)[number];

/** Cadangan bila tabel content_plans tidak terbaca (angka sama dengan seed migrasi 071). */
export const CONTENT_PLANS: Record<ContentPlanId, AutopilotAllowance & { name: string; price: number }> = {
  konten_lite: { name: "Konten Lite", price: 149_000, postsPerWeek: 3, postsPerMonth: 12, innerVisuals: 2, regensPerMonth: 6 },
  konten_pro: { name: "Konten Pro", price: 229_000, postsPerWeek: 5, postsPerMonth: 20, innerVisuals: 2, regensPerMonth: 10 },
  konten_bisnis: { name: "Konten Bisnis", price: 589_000, postsPerWeek: 10, postsPerMonth: 40, innerVisuals: 4, regensPerMonth: 15 },
};

/** Admin (founder & tim) selalu boleh, dengan jatah setara paket terbesar + cadangan uji. */
export const ADMIN_ALLOWANCE: AutopilotAllowance = { postsPerWeek: 14, postsPerMonth: 60, innerVisuals: 5, regensPerMonth: 60 };

export const isContentPlanId = (id: string): id is ContentPlanId => (CONTENT_PLAN_IDS as readonly string[]).includes(id);
export const isComboId = (id: string) => /^combo_[a-z_]{2,40}$/.test(id);

export interface ContentAccess extends AutopilotAllowance {
  planId: ContentPlanId | "admin";
  name: string;
  /** Awal periode 30 hari yang sedang berjalan (jatah bulanan dihitung sejak tanggal ini). */
  periodStart: string;
  periodEnd: string | null;
}

/** Brand DNA gratis per 30 hari (lebih dari ini ditolak; menjaga modal paket tetap aman). */
export const DNA_PER_PERIOD = 3;

/** Bagi harga bundel secara proporsional ke harga normal tiap bagian (pembulatan masuk ke bagian terakhir). */
export function splitCombo(total: number, parts: { id: string; list: number }[]) {
  const sum = parts.reduce((a, p) => a + Math.max(0, p.list), 0);
  let used = 0;
  return parts.map((p, i) => {
    const amount = i === parts.length - 1 ? total - used : sum > 0 ? Math.round((total * Math.max(0, p.list)) / sum) : 0;
    used += amount;
    return { id: p.id, amount };
  });
}

/** Awal bulan ini (tanggal 1, 00.00 WIB) sebagai Date UTC. */
export function monthStartWib(now = new Date()) {
  const wib = new Date(now.getTime() + 7 * 3_600_000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1) - 7 * 3_600_000);
}
