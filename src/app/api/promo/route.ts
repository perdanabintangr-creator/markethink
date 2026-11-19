import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ id: z.string().uuid(), kind: z.enum(["view", "click"]) });

/**
 * Catat tayangan / klik promosi sidebar (statistik harian untuk laporan sponsor).
 * Dihitung di server, maksimal sekali per user per hari per jenis — angka tidak bisa digelembungkan.
 */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  if (!(await checkRateLimit("light", `promo:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  await createAdminClient().rpc("promo_track", { p_promo: parsed.data.id, p_kind: parsed.data.kind, p_user: s.user.id });
  return NextResponse.json({ ok: true });
}
