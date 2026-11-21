import "server-only";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/cron";

let cached: { v: string; at: number } | null = null;

/** Rahasia pemicu dari database (Vault) — dibaca lewat RPC khusus service role, di-cache 10 menit. */
async function vaultSecret() {
  if (cached && Date.now() - cached.at < 600_000) return cached.v;
  const { data } = await createAdminClient().rpc("autopilot_publish_secret");
  cached = { v: String(data ?? ""), at: Date.now() };
  return cached.v;
}

/** Permintaan dari pg_cron/pg_net (header x-publish-secret) atau Vercel Cron (CRON_SECRET). */
export async function internalAuthorized(req: Request) {
  if (cronAuthorized(req)) return true;
  const got = Buffer.from(req.headers.get("x-publish-secret") ?? "");
  const want = Buffer.from(await vaultSecret());
  return want.length > 0 && got.length === want.length && timingSafeEqual(got, want);
}
