import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/auth";

/**
 * Batas jumlah pemakaian per hari (WIB) per paket, di luar kredit.
 * Diatur lewat feature_flags: key `chat` / `image_gen` / `pptx` dengan value `{"per_day": N}`.
 * Tanpa `per_day` = tidak dibatasi (hanya dibatasi kredit). Admin tidak dibatasi.
 */
export type DailyLimitKind = "chat" | "image" | "pptx";

const FLAG_KEY: Record<DailyLimitKind, string> = { chat: "chat", image: "image_gen", pptx: "pptx" };
const LOG_TIERS: Record<DailyLimitKind, string[]> = {
  chat: ["junior", "senior", "associate", "director"],
  image: ["image"],
  pptx: ["pptx"],
};
export const LIMIT_LABEL: Record<DailyLimitKind, string> = { chat: "chat", image: "gambar", pptx: "PPT" };

/** Awal hari ini dalam WIB (UTC+7), sama dengan reset kredit harian. */
export function wibDayStart(now = Date.now()) {
  const wib = new Date(now + 7 * 3600_000);
  wib.setUTCHours(0, 0, 0, 0);
  return new Date(wib.getTime() - 7 * 3600_000);
}

export async function getDailyLimits(supabase: SupabaseClient, profile: Profile) {
  const limits: Partial<Record<DailyLimitKind, number>> = {};
  if (profile.role === "admin") return limits;
  const { data } = await supabase
    .from("feature_flags")
    .select("key, value")
    .eq("plan_id", profile.plan_id)
    .in("key", Object.values(FLAG_KEY));
  for (const kind of Object.keys(FLAG_KEY) as DailyLimitKind[]) {
    const perDay = (data?.find((f) => f.key === FLAG_KEY[kind])?.value as { per_day?: unknown } | null)?.per_day;
    if (typeof perDay === "number") limits[kind] = perDay;
  }
  return limits;
}

export async function countToday(userId: string, kind: DailyLimitKind) {
  const { count } = await createAdminClient()
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "ok")
    .in("tier", LOG_TIERS[kind])
    .gte("created_at", wibDayStart().toISOString());
  return count ?? 0;
}

/** null = boleh; string = pesan batas tercapai. */
export async function dailyLimitReached(
  limits: Partial<Record<DailyLimitKind, number>>,
  userId: string,
  kind: DailyLimitKind,
): Promise<string | null> {
  const limit = limits[kind];
  if (limit === undefined) return null;
  if (limit <= 0) return `Fitur ${LIMIT_LABEL[kind]} tidak tersedia di paket Free.`;
  const used = await countToday(userId, kind);
  return used >= limit
    ? `Batas ${limit} ${LIMIT_LABEL[kind]} per hari untuk paket Free sudah tercapai. Reset pukul 00.00 WIB, atau upgrade ke Pro.`
    : null;
}
