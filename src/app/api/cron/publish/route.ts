import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/cron";
import { igEnabled } from "@/lib/instagram";
import { publishDue } from "@/lib/autopilot/publish";

export const maxDuration = 300;

let cachedSecret: { v: string; at: number } | null = null;

/** Rahasia pemicu dibuat acak di database (Vault) — dibaca lewat RPC khusus service role, di-cache 10 menit. */
async function publishSecret() {
  if (cachedSecret && Date.now() - cachedSecret.at < 600_000) return cachedSecret.v;
  const { data } = await createAdminClient().rpc("autopilot_publish_secret");
  cachedSecret = { v: String(data ?? ""), at: Date.now() };
  return cachedSecret.v;
}

async function authorized(req: Request) {
  if (cronAuthorized(req)) return true;
  const got = Buffer.from(req.headers.get("x-publish-secret") ?? "");
  const want = Buffer.from(await publishSecret());
  return want.length > 0 && got.length === want.length && timingSafeEqual(got, want);
}

/** Dipicu pg_cron Supabase tiap 5 menit: posting konten ACC yang sudah jatuh tempo ke Instagram pelanggan. */
export async function POST(req: Request) {
  if (!(await authorized(req))) return NextResponse.json({ ok: false }, { status: 401 });
  if (!igEnabled()) return NextResponse.json({ ok: true, disabled: true });
  return NextResponse.json({ ok: true, ...(await publishDue(createAdminClient())) });
}
