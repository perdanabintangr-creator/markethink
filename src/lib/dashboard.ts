/**
 * Perhitungan untuk halaman Beranda (tanpa akses DB — mudah dites).
 */

/** Persentase Brand Kit yang sudah terisi (field teks utama + warna/logo). */
export const BRAND_KIT_KEYS = ["products", "target_audience", "brand_voice", "usp", "competitors", "channels", "color_primary", "logo_id"] as const;
export function brandKitCompleteness(kit: unknown): number {
  const k = kit && typeof kit === "object" ? (kit as Record<string, unknown>) : {};
  const filled = BRAND_KIT_KEYS.filter((key) => typeof k[key] === "string" && (k[key] as string).trim()).length;
  return Math.round((filled / BRAND_KIT_KEYS.length) * 100);
}
