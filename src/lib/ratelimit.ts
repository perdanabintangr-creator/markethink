import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

const limiters = redis
  ? {
      user: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 m"), prefix: "rl:user" }),
      ip: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 m"), prefix: "rl:ip" }),
      auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "10 m"), prefix: "rl:auth" }),
    }
  : null;

export type LimitKind = "user" | "ip" | "auth";

/** Return true jika request diizinkan. Tanpa Upstash (dev), selalu true. */
export async function checkRateLimit(kind: LimitKind, key: string) {
  if (!limiters) return { ok: true, reset: 0 };
  try {
    const res = await limiters[kind].limit(key);
    return { ok: res.success, reset: res.reset };
  } catch (err) {
    console.error("[ratelimit] gagal, fail-open", err);
    return { ok: true, reset: 0 };
  }
}

export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

export async function guardRequest(userId: string, headers: Headers) {
  const [u, i] = await Promise.all([checkRateLimit("user", userId), checkRateLimit("ip", clientIp(headers))]);
  return u.ok && i.ok;
}
