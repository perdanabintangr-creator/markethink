import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContentAccess } from "@/lib/autopilot/content-access";
import { researchBrand } from "@/lib/autopilot/brand-research";

export const maxDuration = 180;

/** Riset brand otomatis untuk satu project (Google web + gambar + IG bila terhubung) → profil & KV. */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  if (!(await getContentAccess(createAdminClient(), s.user.id, s.profile.role))) return jsonError(403, "plan");
  const parsed = z.object({ workspaceId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  if (!(await checkRateLimit("user", `autopilot-research:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const { data: ws } = await s.supabase.from("workspaces").select("id").eq("id", parsed.data.workspaceId).maybeSingle();
  if (!ws) return jsonError(404, "workspace_not_found");
  try {
    const research = await researchBrand(createAdminClient(), { userId: s.user.id, workspaceId: parsed.data.workspaceId, en: s.profile.language === "en" });
    return NextResponse.json({ research });
  } catch (err) {
    console.error("[autopilot] riset brand gagal", err);
    return jsonError(502, "research_failed");
  }
}
