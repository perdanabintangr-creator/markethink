import "server-only";
import { timingSafeEqual } from "crypto";

/** Vercel Cron mengirim `Authorization: Bearer <CRON_SECRET>`. Tanpa CRON_SECRET, cron dimatikan. */
export function cronAuthorized(req: Request, secret = process.env.CRON_SECRET?.trim()) {
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
