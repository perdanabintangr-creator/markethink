import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";

const schema = z.object({ id: z.string().uuid(), kind: z.enum(["view", "click"]) });

/** Catat tayangan / klik promosi sidebar (statistik harian untuk laporan sponsor). */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  await s.supabase.rpc("promo_track", { p_promo: parsed.data.id, p_kind: parsed.data.kind });
  return NextResponse.json({ ok: true });
}
