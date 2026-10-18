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

/** Harga promo bila aktif: diisi, > 0, lebih murah dari harga normal, dan belum lewat tanggal akhirnya (paket & add-on). */
export function promoPrice(
  normal: number | string | null | undefined,
  promoRaw: number | string | null | undefined,
  until: string | null | undefined,
  now = Date.now(),
) {
  const price = Number(normal ?? 0);
  if (promoRaw === null || promoRaw === undefined || promoRaw === "") return null;
  const promo = Number(promoRaw);
  if (!Number.isFinite(promo) || promo <= 0 || promo >= price) return null;
  if (until && new Date(until).getTime() <= now) return null;
  return promo;
}

/** Promo paket yang sedang aktif (lihat promoPrice). */
export function activePromo(row: Pick<PlanRow, "monthly_price_idr" | "promo_price_idr" | "promo_until">, now = Date.now()) {
  return promoPrice(row.monthly_price_idr, row.promo_price_idr, row.promo_until, now);
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
