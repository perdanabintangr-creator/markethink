/** Paket all-in-1 untuk halaman harga & ajakan upgrade — aman dipakai di server maupun client. */

export type PaidPlanId = "starter" | "pro" | "promax";

export interface PlanOffer {
  id: string;
  name: string;
  price: number;
  credits: number;
}

/** Keunggulan tiap paket (selaras dengan feature flag di database). */
export const PLAN_FEATURES: Record<string, string[]> = {
  beta: ["Chat AI otak Junior", "Riset web, baca file & link", "Penyimpanan 50 MB"],
  starter: ["Chat otak Junior & Senior", "Semua Tools Pro (otak Senior)", "Riset web, gambar AI, PPT (foto cover)", "Penyimpanan 1 GB"],
  pro: ["Semua di Starter", "Otak Associate (lebih tajam)", "Markethink Agent (kerja otomatis)", "Visual premium: PPT penuh foto AI", "Penyimpanan 5 GB"],
  promax: ["Semua di Pro", "Otak Director (paling cerdas)", "Kuota terbesar", "Penyimpanan 10 GB"],
};

/** Paket yang direkomendasikan di halaman harga. */
export const RECOMMENDED_PLAN = "pro";

/** Ubah baris tabel `plans` jadi penawaran. */
export function toPlanOffer(row: { id: string; name: string; monthly_price_idr: number | string | null; monthly_credits: number | string | null }): PlanOffer {
  return { id: row.id, name: row.name, price: Number(row.monthly_price_idr ?? 0), credits: Number(row.monthly_credits ?? 0) };
}
