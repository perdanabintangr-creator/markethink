import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { autopilotAllowance } from "@/lib/autopilot/quota";

const schema = z.object({
  workspaceId: z.string().uuid().nullable(),
  enabled: z.boolean(),
  cadence: z.enum(["weekly", "monthly"]),
  postsPerWeek: z.number().int().min(3).max(14),
  slotTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).min(1).max(3),
  focus: z.string().trim().max(600).nullable(),
  design: z.enum(["auto", "glossy", "bold", "photo", "classic"]).default("auto"),
  autoPublish: z.boolean().default(false),
});

/** Simpan pengaturan Autopilot Konten (project/brand, mingguan/bulanan, jumlah post, jam tayang, fokus). */
export async function POST(req: Request) {
  const s = await apiSession();
  if (s.error) return s.error;
  const allowance = autopilotAllowance(s.profile.plan_id, s.profile.role);
  if (!allowance) return jsonError(403, "plan");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_body");
  if (!(await checkRateLimit("light", `autopilot-settings:${s.user.id}`)).ok) return jsonError(429, "rate_limited");
  const b = parsed.data;
  if (b.workspaceId) {
    // RLS: hanya project milik user yang terbaca.
    const { data: ws } = await s.supabase.from("workspaces").select("id").eq("id", b.workspaceId).maybeSingle();
    if (!ws) return jsonError(404, "workspace_not_found");
  }
  const { error } = await createAdminClient()
    .from("autopilot_settings")
    .upsert({
      user_id: s.user.id,
      workspace_id: b.workspaceId,
      enabled: b.enabled,
      cadence: b.cadence,
      posts_per_week: Math.min(b.postsPerWeek, allowance.postsPerWeek),
      slot_times: [...new Set(b.slotTimes)].sort(),
      focus: b.focus || null,
      design: b.design,
      auto_publish: b.autoPublish,
      updated_at: new Date().toISOString(),
    });
  if (error) return jsonError(500, "save_failed");
  return NextResponse.json({ ok: true });
}
