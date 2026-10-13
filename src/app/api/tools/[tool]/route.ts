import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardRequest } from "@/lib/ratelimit";
import { toolInfo } from "@/lib/addons/catalog";
import { getAddonStatus } from "@/lib/addons/entitlement";
import { RUNNERS, isAiTool } from "@/lib/addons/tools";
import type { ToolCtx } from "@/lib/addons/runtime";

export const maxDuration = 300;

/** Jalankan tool add-on: cek kuota → catat run → AI terstruktur + file PPT/Excel → simpan hasil. */
export async function POST(req: Request, { params }: { params: Promise<{ tool: string }> }) {
  const s = await apiSession();
  if (s.error) return s.error;
  const { tool } = await params;
  const info = toolInfo(tool);
  if (!info || !isAiTool(tool)) return jsonError(404, "unknown_tool");
  if (!(await guardRequest(s.user.id, req.headers))) return jsonError(429, "rate_limited");

  const runner = RUNNERS[tool];
  const parsed = runner.input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_input", { message: parsed.error.issues[0]?.message ?? "Data belum lengkap." });

  const admin = createAdminClient();
  const status = await getAddonStatus(admin, s.profile, info.addon);
  if (!status.nextSource) return jsonError(402, "addon_required", { addon: info.addon });

  const { data: run, error: runErr } = await admin
    .from("tool_runs")
    .insert({ user_id: s.user.id, addon_id: info.addon, tool, source: status.nextSource, input: parsed.data, title: info.name })
    .select("id")
    .single();
  if (runErr || !run) return jsonError(500, "run_failed");

  const ctx: ToolCtx = { admin, userId: s.user.id, runId: run.id, cost: { usd: 0, model: null } };
  const started = Date.now();
  try {
    const result = await runner.run(ctx, parsed.data);
    await admin
      .from("tool_runs")
      .update({
        status: "ok",
        title: result.title.slice(0, 200),
        output: result.output,
        files: result.files,
        cost_usd: ctx.cost.usd,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    await admin.from("usage_logs").insert({
      user_id: s.user.id,
      tier: `tool:${tool}`,
      provider: ctx.cost.model?.split(":")[0] ?? null,
      model: ctx.cost.model?.split(":").slice(1).join(":") ?? null,
      est_cost_usd: ctx.cost.usd,
      latency_ms: Date.now() - started,
      status: "ok",
    });
    return NextResponse.json({ runId: run.id });
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).slice(0, 1500);
    console.error(`[tool:${tool}] gagal`, msg);
    await admin.from("tool_runs").update({ status: "error", error: msg, cost_usd: ctx.cost.usd, finished_at: new Date().toISOString() }).eq("id", run.id);
    await admin.from("usage_logs").insert({
      user_id: s.user.id,
      tier: `tool:${tool}`,
      est_cost_usd: ctx.cost.usd,
      status: "error",
      error: msg,
    });
    return jsonError(500, "tool_failed", {
      message:
        msg === "FILE_NOT_FOUND"
          ? "File laporan tidak ditemukan. Upload ulang filenya."
          : "Maaf, tool sedang bermasalah. Kuota kamu tidak terpotong — coba lagi sebentar lagi.",
    });
  }
}
