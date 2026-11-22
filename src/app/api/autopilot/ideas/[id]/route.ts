import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContentAccess } from "@/lib/autopilot/content-access";
import { replaceIdea } from "@/lib/autopilot/generate";

export const maxDuration = 120;

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("replace"), note: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal("drop") }),
]);

/** Ganti satu ide (dengan masukan opsional) atau hapus ide dari rencana minggu ini. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (!(await getContentAccess(createAdminClient(), s.user.id, s.profile.role))) return jsonError(403, "plan");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError(400, "invalid_id");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const admin = createAdminClient();
  if (parsed.data.action === "drop") {
    const { error } = await admin.from("autopilot_ideas").update({ status: "dropped", updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", s.user.id).eq("status", "pending");
    if (error) return jsonError(500, "save_failed");
    return NextResponse.json({ ok: true });
  }
  if (!(await checkRateLimit("user", `autopilot-idea:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const idea = await replaceIdea(admin, {
    userId: s.user.id,
    planId: s.profile.plan_id,
    role: s.profile.role,
    language: s.profile.language,
    fullName: s.profile.full_name,
    source: "manual",
    ideaId: id,
    note: parsed.data.note ?? null,
  });
  if (!idea) return jsonError(502, "idea_failed");
  return NextResponse.json({ idea });
}
