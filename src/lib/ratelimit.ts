import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createAdminClient } from "@/lib/supabase/admin";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

/** Batas per jenis: jumlah permintaan per jendela waktu (detik). */
const RULES = {
  user: { limit: 20, window: 60 },
  ip: { limit: 60, window: 60 },
  auth: { limit: 10, window: 600 },
  /** Email reset/undangan ke satu alamat: cegah membanjiri kotak masuk orang lain. */
  email: { limit: 3, window: 3600 },
  /** Aksi ringan (statistik promosi, laporan hasil, feedback). */
  light: { limit: 120, window: 60 },
} as const;

export type LimitKind = keyof typeof RULES;

const limiters = redis
  ? (Object.fromEntries(
      Object.entries(RULES).map(([k, r]) => [
        k,
        new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(r.limit, `${r.window} s`), prefix: `rl:${k}` }),
      ]),
    ) as Record<LimitKind, Ratelimit>)
  : null;

/**
 * Return ok=true jika request diizinkan. Upstash bila terpasang; selain itu pembatas di database Supabase
 * (fungsi rate_limit_hit). Bila pengecekan gagal (database sibuk), permintaan tetap diizinkan agar layanan tidak macet.
 */
export async function checkRateLimit(kind: LimitKind, key: string) {
  const rule = RULES[kind];
  try {
    if (limiters) {
      const res = await limiters[kind].limit(key);
      return { ok: res.success, reset: res.reset };
    }
    const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
      p_key: `${kind}:${key}`.slice(0, 300),
      p_limit: rule.limit,
      p_window_seconds: rule.window,
    });
    if (error) throw error;
    return { ok: data !== false, reset: 0 };
  } catch (err) {
    console.error("[ratelimit] gagal, fail-open", err);
    return { ok: true, reset: 0 };
  }
}

export function clientIp(headers: Headers) {
  return headers.get("x-real-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function guardRequest(userId: string, headers: Headers) {
  const [u, i] = await Promise.all([checkRateLimit("user", userId), checkRateLimit("ip", clientIp(headers))]);
  return u.ok && i.ok;
}
