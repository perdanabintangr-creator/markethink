/** Paket all-in-1 untuk halaman harga & ajakan upgrade — aman dipakai di server maupun client. */

export type PaidPlanId = "starter" | "pro" | "promax";

export interface PlanOffer {
  id: string;
  name: string;
  price: number;
  credits: number;
}

/** Paket yang direkomendasikan di halaman harga. */
export const RECOMMENDED_PLAN = "pro";

/** Ubah baris tabel `plans` jadi penawaran. */
export function toPlanOffer(row: { id: string; name: string; monthly_price_idr: number | string | null; monthly_credits: number | string | null }): PlanOffer {
  return { id: row.id, name: row.name, price: Number(row.monthly_price_idr ?? 0), credits: Number(row.monthly_credits ?? 0) };
}
