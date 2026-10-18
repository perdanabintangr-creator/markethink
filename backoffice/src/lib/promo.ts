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

/** Diskon add-on & bundel untuk member Pro/Promax (sama dengan aplikasi AI: `src/lib/addons/addon-quota.ts`). */
export const MEMBER_DISCOUNT_PLANS = ["pro", "promax"];
export const memberPrice = (price: number) => Math.round((price * 0.85) / 100) * 100;

/** Perkiraan modal AI per hasil (Rupiah) per add-on, untuk membagi uang bundel (sama dengan aplikasi AI). */
const RUN_COST_IDR: Record<string, number> = { riset_pro: 10_000, kolpr_pro: 8_000 };
const runCost = (id: string) => RUN_COST_IDR[id] ?? 5_000;

/** Bagi uang bundel ke tiap add-on sesuai kebutuhan modalnya (kuota × modal per hasil); total = yang dibayar. */
export function splitBundleAmount(amount: number, addons: { id: string; quota: number }[]) {
  const weights = addons.map((a) => Math.max(1, a.quota) * runCost(a.id));
  const total = weights.reduce((s, w) => s + w, 0);
  const parts = weights.map((w) => Math.floor((amount * w) / total));
  parts[parts.length - 1] += amount - parts.reduce((s, p) => s + p, 0);
  return addons.map((a, i) => ({ id: a.id, amount: parts[i] }));
}
