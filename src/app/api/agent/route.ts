import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardRequest } from "@/lib/ratelimit";
import { planMission } from "@/lib/agent/brain";
import { agentCtx, logAgentCost, profileLine, quotaByAddon } from "@/lib/agent/server";

export const maxDuration = 120;

const body = z.object({
  goal: z.string().trim().min(15, "Ceritakan tujuannya sedikit lebih lengkap (min. 15 karakter).").max(2000),
  context: z.string().trim().max(3000).optional().default(""),
});

/** Buat misi Agent: AI menyusun rencana langkah (Tools Pro berurutan) sesuai tujuan & kuota user. */
export async function POST(req: Request) {
  const startedAt = Date.now();
  const s = await apiSession();
  if (s.error) return s.error;
  if (!(await guardRequest(s.user.id, req.headers))) return jsonError(429, "rate_limited");
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_input", { message: parsed.error.issues[0]?.message });

  const admin = createAdminClient();
  const quota = await quotaByAddon(admin, s.profile);
  if (!Object.values(quota).some((n) => n > 0)) {
    return jsonError(402, "agent_locked", {
      message: "Markethink Agent memakai kuota Tools Pro. Beli add-on atau upgrade paket untuk memakainya.",
    });
  }

  const { data: row, error } = await admin
    .from("agent_runs")
    .insert({ user_id: s.user.id, goal: parsed.data.goal, context: parsed.data.context })
    .select("id")
    .single();
  if (error || !row) return jsonError(500, "create_failed");

  const ctx = agentCtx(admin, s.user.id, row.id, startedAt);
  try {
    const plan = await planMission(ctx, { goal: parsed.data.goal, context: parsed.data.context, profileLine: profileLine(s.profile), quota });
    if (!plan.steps.length) {
      await admin.from("agent_runs").delete().eq("id", row.id);
      return jsonError(422, "no_steps", { message: "Kuota Tools Pro yang dibutuhkan misi ini sudah habis. Cek kuota di halaman Tools Pro." });
    }
    await admin.from("agent_runs").update({ title: plan.title.slice(0, 120), plan: plan.steps, summary: null }).eq("id", row.id);
    await logAgentCost(admin, s.user.id, row.id, ctx, 0);
    return NextResponse.json({ id: row.id, understanding: plan.understanding });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[agent] gagal menyusun rencana", msg);
    await logAgentCost(admin, s.user.id, row.id, ctx, 0, msg);
    await admin.from("agent_runs").delete().eq("id", row.id);
    return jsonError(500, "plan_failed", { message: "Agent gagal menyusun rencana. Coba lagi sebentar lagi." });
  }
}
