/**
 * Perhitungan untuk halaman Dashboard (tanpa akses DB — mudah dites).
 */

const WIB_MS = 7 * 3_600_000;
/** "YYYY-MM-DD" menurut WIB. */
export const wibDay = (ms: number) => new Date(ms + WIB_MS).toISOString().slice(0, 10);

export interface ActivityDay {
  day: string;
  /** Jawaban AI di chat. */
  chat: number;
  /** Hasil Smart Tools & Agent. */
  tools: number;
}

/** Jumlah aktivitas per hari (WIB) untuk `days` hari terakhir. */
export function activityByDay(chatTimes: string[], toolTimes: string[], days = 7, now = Date.now()): ActivityDay[] {
  const out: ActivityDay[] = [];
  for (let i = days - 1; i >= 0; i--) out.push({ day: wibDay(now - i * 86_400_000), chat: 0, tools: 0 });
  const byDay = new Map(out.map((d) => [d.day, d]));
  for (const at of chatTimes) {
    const d = byDay.get(wibDay(Date.parse(at)));
    if (d) d.chat += 1;
  }
  for (const at of toolTimes) {
    const d = byDay.get(wibDay(Date.parse(at)));
    if (d) d.tools += 1;
  }
  return out;
}

/** Persentase Brand Kit yang sudah terisi (field teks utama + warna/logo). */
export const BRAND_KIT_KEYS = ["products", "target_audience", "brand_voice", "usp", "competitors", "channels", "color_primary", "logo_id"] as const;
export function brandKitCompleteness(kit: unknown): number {
  const k = kit && typeof kit === "object" ? (kit as Record<string, unknown>) : {};
  const filled = BRAND_KIT_KEYS.filter((key) => typeof k[key] === "string" && (k[key] as string).trim()).length;
  return Math.round((filled / BRAND_KIT_KEYS.length) * 100);
}

/** Skala sumbu Y yang "bulat" (5, 6, 8, 10, 20, 30, 40, 50, 60, 80, 100, …): setengahnya juga bilangan bulat untuk label tengah. */
export function niceMax(v: number) {
  if (v <= 5) return 5;
  const pow = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 3, 4, 5, 6, 8, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
}
