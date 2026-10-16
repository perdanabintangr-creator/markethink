import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth";
import { getToolAccess } from "@/lib/addons/access";
import { TOOL_CREDIT_ESTIMATE } from "@/lib/addons/format";
import { creditsForUsd, settleCredits } from "@/lib/credits";
import { AGENT_MAX_STEPS } from "./catalog";
import { roleLabel } from "@/lib/personas";
import type { ToolCtx } from "@/lib/addons/runtime";
import type { AgentRunLite } from "./catalog";
import { DEFAULT_TOOL_TIER, type ToolTier } from "@/lib/addons/tool-tier";

export const AGENT_SELECT = "id, goal, context, title, plan, status, summary, chat_id, created_at, cost_usd, tier";

export async function loadAgentRun(admin: SupabaseClient, id: string, userId: string) {
  const { data } = await admin.from("agent_runs").select(AGENT_SELECT).eq("id", id).eq("user_id", userId).maybeSingle();
  return data as (AgentRunLite & { cost_usd: number; tier: ToolTier | null }) | null;
}

export function profileLine(p: Profile) {
  return [p.persona_role && `peran ${roleLabel(p.persona_role)}`, p.industry && `industri ${p.industry}`, p.goal && `tujuan utama ${p.goal}`]
    .filter(Boolean)
    .join(", ");
}

/** Hak pakai Agent + perkiraan jumlah langkah yang muat di sisa kredit (paket all-in-1). */
export async function agentBudget(admin: SupabaseClient, profile: Profile, tier: ToolTier) {
  const access = await getToolAccess(admin, profile);
  const perStep = TOOL_CREDIT_ESTIMATE[tier] + 5;
  const maxSteps = access.isAdmin ? AGENT_MAX_STEPS : Math.min(AGENT_MAX_STEPS, Math.floor(access.remaining / perStep));
  return { access, perStep, maxSteps };
}

/** Konteks biaya AI untuk langkah perencanaan/pengisian brief/ringkasan Agent. */
export function agentCtx(admin: SupabaseClient, userId: string, agentId: string, startedAt: number, tier?: ToolTier): ToolCtx {
  return { admin, userId, runId: agentId, cost: { usd: 0, model: null }, startedAt, tier: tier ?? DEFAULT_TOOL_TIER };
}

/** Catat biaya AI Agent (di luar biaya tiap tool) ke usage_logs & total misi, lalu potong kredit sesuai biaya nyata. */
export async function logAgentCost(admin: SupabaseClient, userId: string, agentId: string, ctx: ToolCtx, prevCost: number, error?: string) {
  if (!ctx.cost.usd && !error) return;
  if (ctx.cost.usd > 0) await settleCredits(userId, 0, creditsForUsd(ctx.cost.usd), "agent", { agentId });
  await Promise.all([
    admin.from("usage_logs").insert({
      user_id: userId,
      tier: "tool:agent",
      provider: ctx.cost.model?.split(":")[0] ?? null,
      model: ctx.cost.model?.split(":").slice(1).join(":") ?? null,
      est_cost_usd: ctx.cost.usd,
      status: error ? "error" : "ok",
      ...(error ? { error: error.slice(0, 1500) } : {}),
    }),
    admin.from("agent_runs").update({ cost_usd: Number(prevCost) + ctx.cost.usd }).eq("id", agentId),
  ]);
}
