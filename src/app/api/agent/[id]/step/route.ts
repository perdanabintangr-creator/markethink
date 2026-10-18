import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { toolInfo } from "@/lib/addons/catalog";
import { executeTool } from "@/lib/addons/execute";
import { resultToMarkdown } from "@/lib/addons/to-markdown";
import { fillStepInput } from "@/lib/agent/brain";
import { agentCtx, loadAgentRun, logAgentCost, profileLine } from "@/lib/agent/server";
import type { AgentStep } from "@/lib/agent/catalog";

export const maxDuration = 300;

const STALE_MS = 6 * 60_000;

/**
 * Jalankan SATU langkah misi (satu Tools Pro). Browser memanggil ini berulang sampai semua langkah selesai,
 * sehingga tiap permintaan tetap di bawah batas waktu server. `retry` = ulang langkah yang gagal.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const startedAt = Date.now();
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { retry?: number };
  const admin = createAdminClient();
  const run = await loadAgentRun(admin, id, s.user.id);
  if (!run) return jsonError(404, "not_found");

  const plan: AgentStep[] = run.plan.map((p) => ({ ...p }));
  // Langkah "berjalan" yang macet (tab ditutup / server terputus) dianggap gagal agar bisa diulang.
  for (const p of plan) {
    if (p.status === "running" && Date.now() - Date.parse(p.started_at ?? "0") > STALE_MS) {
      p.status = "error";
      p.error = "Proses terputus. Coba ulangi langkah ini.";
    }
  }
  if (plan.some((p) => p.status === "running")) return jsonError(409, "busy", { message: "Langkah sebelumnya masih berjalan." });

  const index =
    typeof body.retry === "number" ? (plan[body.retry]?.status === "error" ? body.retry : -1) : plan.findIndex((p) => p.status === "pending");
  if (index === -1) return NextResponse.json({ done: true });

  const step = plan[index];
  step.status = "running";
  step.error = null;
  step.started_at = new Date().toISOString();
  await admin.from("agent_runs").update({ plan, status: "running", updated_at: new Date().toISOString() }).eq("id", id);

  const save = async () => {
    const left = plan.some((p) => p.status === "pending");
    await admin.from("agent_runs").update({ plan, updated_at: new Date().toISOString() }).eq("id", id);
    return left;
  };

  const ctx = agentCtx(admin, s.user.id, id, startedAt, run.tier ?? undefined, s.profile.language);
  try {
    // Hasil langkah sebelumnya jadi bahan brief langkah ini (konsisten antar tools).
    const prevIds = plan.filter((p, i) => i < index && p.status === "ok" && p.run_id).map((p) => p.run_id!) as string[];
    const { data: prevRuns } = prevIds.length
      ? await admin.from("tool_runs").select("id, tool, title, output").in("id", prevIds)
      : { data: [] };
    const previous = prevIds
      .map((rid) => (prevRuns ?? []).find((r) => r.id === rid))
      .filter(Boolean)
      .map((r) => ({ name: toolInfo(r!.tool as string)?.name ?? (r!.tool as string), title: (r!.title as string) ?? "", markdown: resultToMarkdown(r!.output, 6000) }));

    const input = await fillStepInput(ctx, { tool: step.tool, goal: run.goal, context: run.context, profileLine: profileLine(s.profile), previous });
    await logAgentCost(admin, s.user.id, id, ctx, run.cost_usd);

    const res = await executeTool({ admin, profile: s.profile, tool: step.tool, rawInput: input, startedAt, agentRunId: id, tier: run.tier ?? undefined });
    if (res.ok) {
      step.status = "ok";
      step.run_id = res.runId;
    } else {
      step.status = "error";
      step.error =
        res.code === "addon_required"
          ? "Kuota add-on untuk tool ini habis. Beli add-on/upgrade lalu ulangi langkah ini."
          : (res.message ?? "Tool sedang bermasalah. Kuota tidak terpotong, silakan coba ulangi.");
    }
    const more = await save();
    return NextResponse.json({ index, ok: res.ok, runId: res.ok ? res.runId : null, error: step.error, more });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[agent] langkah ${step.tool} gagal`, msg);
    await logAgentCost(admin, s.user.id, id, ctx, run.cost_usd, msg);
    step.status = "error";
    step.error = "Agent gagal menyiapkan brief untuk langkah ini. Kuota tidak terpotong, silakan coba ulangi.";
    const more = await save();
    return NextResponse.json({ index, ok: false, runId: null, error: step.error, more });
  }
}
