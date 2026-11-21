import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { autopilotAllowance } from "@/lib/autopilot/quota";
import { generateBrandDna, saveDnaEdit } from "@/lib/brand/server";

export const maxDuration = 300;

/** Riset + tim AI → Brand DNA versi baru (draft untuk ditinjau & di-ACC). */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (!autopilotAllowance(s.profile.plan_id, s.profile.role)) return jsonError(403, "plan");
  const parsed = z.object({ workspaceId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  if (!(await checkRateLimit("user", `brand-dna:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const { data: ws } = await s.supabase.from("workspaces").select("id, onboarding_status").eq("id", parsed.data.workspaceId).maybeSingle();
  if (!ws) return jsonError(404, "workspace_not_found");
  if (ws.onboarding_status === "researching") return jsonError(409, "busy");
  try {
    const res = await generateBrandDna(createAdminClient(), {
      userId: s.user.id,
      workspaceId: parsed.data.workspaceId,
      en: s.profile.language === "en",
    });
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "dna_failed";
    return jsonError(msg === "onboarding_incomplete" ? 400 : 502, msg === "onboarding_incomplete" ? msg : "dna_failed");
  }
}

/** Simpan editan Brand DNA (versi ACC tidak diubah: editan menjadi versi baru). */
export async function PUT(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = z
    .object({
      workspaceId: z.string().uuid(),
      version: z.number().int().min(1),
      dna: z.unknown(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  if (!(await checkRateLimit("light", `brand-dna-edit:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const res = await saveDnaEdit(createAdminClient(), {
    userId: s.user.id,
    workspaceId: parsed.data.workspaceId,
    version: parsed.data.version,
    dna: parsed.data.dna,
  });
  if ("error" in res) return jsonError(res.error === "not_found" ? 404 : 400, res.error!);
  return NextResponse.json({ ok: true, version: res.version });
}
