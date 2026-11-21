import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { approveDna, loadOnboarding } from "@/lib/brand/server";

/** ACC Brand DNA → versi aktif; Autopilot terbuka & semua agen memakai DNA ini. */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const parsed = z
    .object({
      workspaceId: z.string().uuid(),
      version: z.number().int().min(1),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  const admin = createAdminClient();
  const o = await loadOnboarding(admin, s.user.id, parsed.data.workspaceId);
  if (!o) return jsonError(404, "workspace_not_found");
  if (!o.completeness.requiredDone) return jsonError(400, "onboarding_incomplete");
  const res = await approveDna(admin, {
    userId: s.user.id,
    workspaceId: parsed.data.workspaceId,
    version: parsed.data.version,
  });
  if ("error" in res) return jsonError(404, res.error!);
  return NextResponse.json({ ok: true, version: res.version });
}
