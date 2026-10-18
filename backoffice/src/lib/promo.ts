/** Harga promo paket (harga coret). Aturan sama dengan aplikasi AI (`src/lib/plan-offers.ts` → activePromo). */

export interface PromoRow {
  monthly_price_idr: number | string | null;
  promo_price_idr?: number | string | null;
  promo_until?: string | null;
}

/** Harga promo bila aktif: diisi, > 0, lebih murah dari harga normal, dan belum lewat tanggal akhirnya. */
export function activePromo(row: PromoRow, now = Date.now()) {
  const price = Number(row.monthly_price_idr ?? 0);
  if (row.promo_price_idr === null || row.promo_price_idr === undefined || row.promo_price_idr === "") return null;
  const promo = Number(row.promo_price_idr);
  if (!Number.isFinite(promo) || promo <= 0 || promo >= price) return null;
  if (row.promo_until && new Date(row.promo_until).getTime() <= now) return null;
  return promo;
}

/** Harga yang dibayar pelanggan sekarang (promo bila aktif). */
export const effectivePrice = (row: PromoRow, now = Date.now()) => activePromo(row, now) ?? Number(row.monthly_price_idr ?? 0);

/** Tanggal (YYYY-MM-DD, WIB) → akhir hari itu dalam WIB. */
export const endOfDayWIB = (date: string) => new Date(`${date}T23:59:59+07:00`).toISOString();

/** ISO → YYYY-MM-DD dalam WIB (untuk input tanggal). */
export const dateInputWIB = (iso: string | null | undefined) =>
  iso ? new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 10) : "";
