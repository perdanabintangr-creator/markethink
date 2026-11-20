import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWeek } from "@/lib/autopilot/generate";

export const maxDuration = 300;

const schema = z.object({ start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

/** Buat konten satu minggu sekarang (mode bulanan: halaman memanggil ini beberapa kali berurutan). */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(400, "invalid_body");
  if (!(await checkRateLimit("user", `autopilot-gen:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const res = await generateWeek(createAdminClient(), {
    userId: s.user.id,
    planId: s.profile.plan_id,
    role: s.profile.role,
    language: s.profile.language,
    fullName: s.profile.full_name,
    start: parsed.data.start,
    source: "manual",
  });
  if (!res.ok) {
    const status = res.error === "plan" ? 403 : res.error === "quota" ? 402 : res.error === "busy" ? 409 : res.error === "no_slots" ? 400 : 502;
    return jsonError(status, res.error);
  }
  return NextResponse.json(res);
}
