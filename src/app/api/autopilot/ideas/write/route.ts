import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { writePendingIdeas } from "@/lib/autopilot/generate";

export const maxDuration = 300;

/** "Tulis semua konten": copywriter menulis post dari ide yang sudah ditinjau. */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = z.object({ batchId: z.string().uuid().optional() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(400, "invalid_body");
  if (!(await checkRateLimit("user", `autopilot-gen:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const res = await writePendingIdeas(createAdminClient(), {
    userId: s.user.id,
    planId: s.profile.plan_id,
    role: s.profile.role,
    language: s.profile.language,
    fullName: s.profile.full_name,
    source: "manual",
    batchId: parsed.data.batchId,
  });
  if (!res.ok) return jsonError(res.error === "plan" || res.error === "no_brand" || res.error === "onboarding" || res.error === "dna_not_approved" ? 403 : res.error === "quota" ? 402 : res.error === "busy" ? 409 : res.error === "no_ideas" ? 404 : 502, res.error);
  return NextResponse.json(res);
}
