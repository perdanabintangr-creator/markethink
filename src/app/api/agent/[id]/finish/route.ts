import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { toolInfo } from "@/lib/addons/catalog";
import { resultToMarkdown } from "@/lib/addons/to-markdown";
import { summarizeMission } from "@/lib/agent/brain";
import { agentCtx, loadAgentRun, logAgentCost } from "@/lib/agent/server";

export const maxDuration = 120;

/** Semua langkah selesai → AI menulis ringkasan eksekutif paket (benang merah + rencana eksekusi). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const startedAt = Date.now();
  const s = await apiSession();
  if (s.error) return s.error;
  const { id } = await params;
  const admin = createAdminClient();
  const run = await loadAgentRun(admin, id, s.user.id);
  if (!run) return jsonError(404, "not_found");
  if (run.plan.some((p) => p.status === "pending" || p.status === "running")) return jsonError(409, "not_finished");

  const ids = run.plan.filter((p) => p.status === "ok" && p.run_id).map((p) => p.run_id!) as string[];
  if (!ids.length) {
    await admin.from("agent_runs").update({ status: "error", updated_at: new Date().toISOString() }).eq("id", id);
    return jsonError(422, "no_results", { message: "Belum ada langkah yang berhasil. Ulangi langkah yang gagal dulu." });
  }
  const { data: runs } = await admin.from("tool_runs").select("id, tool, title, output").in("id", ids);
  const results = ids
    .map((rid) => (runs ?? []).find((r) => r.id === rid))
    .filter(Boolean)
    .map((r) => ({ name: toolInfo(r!.tool as string)?.name ?? (r!.tool as string), title: (r!.title as string) ?? "", markdown: resultToMarkdown(r!.output, 12_000) }));
  const failed = run.plan.filter((p) => p.status === "error").map((p) => toolInfo(p.tool)?.name ?? p.tool);

  const ctx = agentCtx(admin, s.user.id, id, startedAt, run.tier ?? undefined, s.profile.language);
  try {
    const summary = await summarizeMission(ctx, { goal: run.goal, title: run.title ?? "Misi Markethink Agent", results, failed });
    await admin.from("agent_runs").update({ summary, status: "done", updated_at: new Date().toISOString() }).eq("id", id);
    await logAgentCost(admin, s.user.id, id, ctx, run.cost_usd);
    return NextResponse.json({ summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logAgentCost(admin, s.user.id, id, ctx, run.cost_usd, msg);
    return jsonError(500, "summary_failed", { message: "Gagal menyusun ringkasan. Coba lagi." });
  }
}
