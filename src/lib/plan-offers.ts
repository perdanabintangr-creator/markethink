/** Paket all-in-1 untuk halaman harga & ajakan upgrade — aman dipakai di server maupun client. */

export type PaidPlanId = "starter" | "pro" | "promax";

export interface PlanOffer {
  id: string;
  name: string;
  /** Harga yang dibayar sekarang (harga promo bila promo aktif). */
  price: number;
  credits: number;
  /** Harga normal yang dicoret — hanya ada saat promo aktif. */
  originalPrice?: number;
  promoLabel?: string;
  /** Akhir promo (ISO) bila dibatasi tanggal. */
  promoUntil?: string;
}

export interface PlanRow {
  id: string;
  name: string;
  monthly_price_idr: number | string | null;
  monthly_credits: number | string | null;
  promo_price_idr?: number | string | null;
  promo_label?: string | null;
  promo_until?: string | null;
}

/** Kolom `plans` yang dibutuhkan penawaran (termasuk promo). */
export const PLAN_OFFER_COLUMNS = "id, name, monthly_price_idr, monthly_credits, promo_price_idr, promo_label, promo_until";

/** Promo aktif: diisi, lebih murah dari harga normal, dan belum lewat tanggal akhirnya. */
export function activePromo(row: Pick<PlanRow, "monthly_price_idr" | "promo_price_idr" | "promo_until">, now = Date.now()) {
  const price = Number(row.monthly_price_idr ?? 0);
  if (row.promo_price_idr === null || row.promo_price_idr === undefined || row.promo_price_idr === "") return null;
  const promo = Number(row.promo_price_idr);
  if (!Number.isFinite(promo) || promo <= 0 || promo >= price) return null;
  if (row.promo_until && new Date(row.promo_until).getTime() <= now) return null;
  return promo;
}

/** Paket yang direkomendasikan di halaman harga. */
export const RECOMMENDED_PLAN = "pro";

/** Ubah baris tabel `plans` jadi penawaran. */
export function toPlanOffer(row: PlanRow, now = Date.now()): PlanOffer {
  const price = Number(row.monthly_price_idr ?? 0);
  const offer: PlanOffer = { id: row.id, name: row.name, price, credits: Number(row.monthly_credits ?? 0) };
  const promo = activePromo(row, now);
  if (promo === null) return offer;
  return {
    ...offer,
    price: promo,
    originalPrice: price,
    ...(row.promo_label?.trim() && { promoLabel: row.promo_label.trim() }),
    ...(row.promo_until && { promoUntil: row.promo_until }),
  };
}
