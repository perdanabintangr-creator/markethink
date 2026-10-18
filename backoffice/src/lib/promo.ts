/** Harga promo paket (harga coret). Aturan sama dengan aplikasi AI (`src/lib/plan-offers.ts` → activePromo). */

export interface PromoRow {
  monthly_price_idr: number | string | null;
  promo_price_idr?: number | string | null;
  promo_until?: string | null;
}

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

/** Promo paket yang sedang aktif. */
export const activePromo = (row: PromoRow, now = Date.now()) => promoPrice(row.monthly_price_idr, row.promo_price_idr, row.promo_until, now);

/** Harga add-on yang dibayar pelanggan sekarang (promo bila aktif). */
export const addonEffectivePrice = (row: { price_idr: number | string | null; promo_price_idr?: number | string | null; promo_until?: string | null }, now = Date.now()) =>
  promoPrice(row.price_idr, row.promo_price_idr, row.promo_until, now) ?? Number(row.price_idr ?? 0);

/** Harga yang dibayar pelanggan sekarang (promo bila aktif). */
export const effectivePrice = (row: PromoRow, now = Date.now()) => activePromo(row, now) ?? Number(row.monthly_price_idr ?? 0);

/** Tanggal (YYYY-MM-DD, WIB) → akhir hari itu dalam WIB. */
export const endOfDayWIB = (date: string) => new Date(`${date}T23:59:59+07:00`).toISOString();

/** ISO → YYYY-MM-DD dalam WIB (untuk input tanggal). */
export const dateInputWIB = (iso: string | null | undefined) =>
  iso ? new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 10) : "";
