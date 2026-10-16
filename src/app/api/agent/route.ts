import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardRequest } from "@/lib/ratelimit";
import { planMission } from "@/lib/agent/brain";
import { resolveToolTier } from "@/lib/addons/tool-tier";
import { getAllowedTiers } from "@/lib/plan";
import { agentBudget, agentCtx, logAgentCost, profileLine } from "@/lib/agent/server";
import { ADDONS } from "@/lib/addons/catalog";

export const maxDuration = 120;

const body = z.object({
  goal: z.string().trim().min(15, "Ceritakan tujuannya sedikit lebih lengkap (min. 15 karakter).").max(2000),
  context: z.string().trim().max(3000).optional().default(""),
  tier: z.string().optional(),
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
  const tier = resolveToolTier(parsed.data.tier, await getAllowedTiers(s.supabase, s.profile));
  const { access, maxSteps } = await agentBudget(admin, s.profile, tier);
  if (!access.agent) {
    return jsonError(402, "agent_locked", { message: "Markethink Agent tersedia di paket Pro & Promax. Upgrade paket untuk memakainya." });
  }
  if (maxSteps < 1) {
    return jsonError(402, "credits_low", {
      message: "Sisa kuota bulan ini tidak cukup untuk menjalankan Agent. Kuota direset tiap tanggal 1, atau upgrade paket.",
    });
  }
  // Semua Tools Pro tersedia; jumlah langkah dibatasi sisa kredit.
  const quota = Object.fromEntries(ADDONS.map((a) => [a.id, access.isAdmin ? Infinity : maxSteps])) as Record<string, number>;

  const { data: row, error } = await admin
    .from("agent_runs")
    .insert({ user_id: s.user.id, goal: parsed.data.goal, context: parsed.data.context, tier })
    .select("id")
    .single();
  if (error || !row) return jsonError(500, "create_failed");

  const ctx = agentCtx(admin, s.user.id, row.id, startedAt, tier);
  try {
    const planned = await planMission(ctx, { goal: parsed.data.goal, context: parsed.data.context, profileLine: profileLine(s.profile), quota });
    const plan = { ...planned, steps: planned.steps.slice(0, maxSteps) };
    if (!plan.steps.length) {
      await admin.from("agent_runs").delete().eq("id", row.id);
      return jsonError(422, "no_steps", { message: "Agent tidak menemukan langkah yang cocok. Coba tulis tujuannya lebih spesifik." });
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
