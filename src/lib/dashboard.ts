/**
 * Perhitungan untuk halaman Dashboard (tanpa akses DB — mudah dites).
 */

export type UsageCategory = "chat" | "tools" | "media";

/** Kelompok pemakaian dari `credit_ledger.reason` (mis. "chat_settle", "tool:calendar", "deck_images"). */
export function usageCategory(reason: string | null | undefined): UsageCategory | null {
  const r = (reason ?? "").toLowerCase();
  if (!r || r.startsWith("admin") || r.startsWith("manual") || r.startsWith("topup") || r.startsWith("purchase")) return null;
  if (r.startsWith("chat") || r.startsWith("llm_error") || r.startsWith("credits_low")) return "chat";
  if (r.startsWith("image") || r.startsWith("presentation") || r.startsWith("deck") || r.startsWith("carousel")) return "media";
  return "tools";
}

const WIB_MS = 7 * 3_600_000;
/** "YYYY-MM-DD" menurut WIB. */
export const wibDay = (ms: number) => new Date(ms + WIB_MS).toISOString().slice(0, 10);

export interface UsageDay {
  day: string;
  chat: number;
  tools: number;
  media: number;
}

/** Pemakaian kredit bersih per hari (WIB) untuk `days` hari terakhir; refund mengurangi pemakaian hari itu. */
export function usageByDay(rows: { delta: number; reason: string | null; created_at: string }[], days = 7, now = Date.now()): UsageDay[] {
  const out: UsageDay[] = [];
  for (let i = days - 1; i >= 0; i--) out.push({ day: wibDay(now - i * 86_400_000), chat: 0, tools: 0, media: 0 });
  const byDay = new Map(out.map((d) => [d.day, d]));
  for (const r of rows) {
    const cat = usageCategory(r.reason);
    const d = byDay.get(wibDay(Date.parse(r.created_at)));
    if (cat && d) d[cat] -= r.delta;
  }
  for (const d of out) {
    d.chat = Math.max(0, d.chat);
    d.tools = Math.max(0, d.tools);
    d.media = Math.max(0, d.media);
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
