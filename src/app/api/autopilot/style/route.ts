import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContentAccess } from "@/lib/autopilot/content-access";
import { INDUSTRIES, presetById } from "@/lib/autopilot/presets";

const schema = z.object({
  mode: z.enum(["auto", "preset", "custom"]),
  industry: z.enum(INDUSTRIES.map((i) => i.id) as [string, ...string[]]).nullable().optional(),
  presetId: z.string().max(40).optional(),
  styleId: z.string().uuid().optional(),
});

/** Pilih gaya desain Autopilot: otomatis (bergantian), gaya industri, atau gaya dari referensi sendiri. */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (!(await getContentAccess(createAdminClient(), s.user.id, s.profile.role))) return jsonError(403, "plan");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  if (!(await checkRateLimit("light", `autopilot-style:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const b = parsed.data;
  const patch: Record<string, unknown> = { user_id: s.user.id, updated_at: new Date().toISOString() };
  if (b.industry !== undefined) patch.industry = b.industry;
  if (b.mode === "auto") Object.assign(patch, { style_preset: null, style_id: null });
  if (b.mode === "preset") {
    if (!presetById(b.presetId)) return jsonError(404, "preset_not_found");
    Object.assign(patch, { style_preset: b.presetId, style_id: null });
  }
  if (b.mode === "custom") {
    const { data: st } = await s.supabase.from("brand_styles").select("id").eq("id", b.styleId ?? "").maybeSingle();
    if (!st) return jsonError(404, "style_not_found");
    Object.assign(patch, { style_id: b.styleId, style_preset: null });
  }
  const { error } = await createAdminClient().from("autopilot_settings").upsert(patch);
  if (error) return jsonError(500, "save_failed");
  return NextResponse.json({ ok: true });
}
