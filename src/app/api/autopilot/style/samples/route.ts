import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { existingSamples, generateMissingSamples } from "@/lib/autopilot/sample-images";
import { STYLE_PRESETS } from "@/lib/autopilot/presets";

export const maxDuration = 300;

/** Admin: buat gambar contoh 30 gaya industri (sekali saja, dipakai pratinjau semua pelanggan). */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (s.profile.role !== "admin") return jsonError(403, "forbidden");
  const body = z.object({ force: z.boolean().optional() }).safeParse(await req.json().catch(() => ({})));
  const admin = createAdminClient();
  const r = await generateMissingSamples(admin, s.user.id, { force: body.success ? body.data.force : false });
  const have = await existingSamples(admin);
  return NextResponse.json({ ...r, ready: STYLE_PRESETS.filter((p) => have.has(p.id)).length, total: STYLE_PRESETS.length });
}
