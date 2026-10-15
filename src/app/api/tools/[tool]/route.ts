import { NextResponse } from "next/server";
import { apiSession, jsonError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardRequest } from "@/lib/ratelimit";
import { toolInfo } from "@/lib/addons/catalog";
import { getAddonStatus } from "@/lib/addons/entitlement";
import { RUNNERS, isAiTool } from "@/lib/addons/tools";
import type { ToolCtx } from "@/lib/addons/runtime";
import { PRO_FORMS } from "@/lib/addons/pro/forms";
import { MAX_REVISIONS } from "@/lib/addons/format";

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
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const admin = createAdminClient();

  // Revisi: jalankan ulang dengan input yang sama + koreksi user, tanpa memotong kuota.
  const revise = body?.__revise as { runId?: unknown; note?: unknown } | undefined;
  let revision: { root: string; note: string; previous: unknown; source: string } | null = null;
  let rawInput: unknown = body;
  if (revise) {
    const note = String(revise.note ?? "").trim().slice(0, 3000);
    if (!PRO_FORMS[tool]) return jsonError(400, "revision_unsupported", { message: "Tool ini belum mendukung perbaikan otomatis." });
    if (note.length < 5) return jsonError(400, "invalid_input", { message: "Tulis dulu apa yang perlu diperbaiki." });
    const { data: orig } = await admin
      .from("tool_runs")
      .select("id, tool, status, input, output, source, revision_of")
      .eq("id", String(revise.runId ?? ""))
      .eq("user_id", s.user.id)
      .maybeSingle();
    if (!orig || orig.tool !== tool || orig.status !== "ok") return jsonError(404, "run_not_found");
    const root = (orig.revision_of as string | null) ?? orig.id;
    const { count } = await admin.from("tool_runs").select("id", { count: "exact", head: true }).eq("revision_of", root).neq("status", "error");
    if ((count ?? 0) >= MAX_REVISIONS)
      return jsonError(429, "revision_limit", { message: `Batas ${MAX_REVISIONS}× perbaikan gratis untuk hasil ini sudah habis. Buat hasil baru dengan data yang sudah dikoreksi.` });
    revision = { root, note, previous: orig.output, source: orig.source as string };
    rawInput = orig.input;
  }

  const parsed = runner.input.safeParse(rawInput);
  if (!parsed.success) return jsonError(400, "invalid_input", { message: parsed.error.issues[0]?.message ?? "Data belum lengkap." });

  let source = revision?.source ?? null;
  if (!revision) {
    const status = await getAddonStatus(admin, s.profile, info.addon);
    if (!status.nextSource) return jsonError(402, "addon_required", { addon: info.addon });
    source = status.nextSource;
  }

  const { data: run, error: runErr } = await admin
    .from("tool_runs")
    .insert({
      user_id: s.user.id,
      addon_id: info.addon,
      tool,
      source,
      input: parsed.data,
      title: info.name,
      ...(revision ? { revision_of: revision.root, revision_note: revision.note } : {}),
    })
    .select("id")
    .single();
  if (runErr || !run) return jsonError(500, "run_failed");

  const ctx: ToolCtx = {
    admin,
    userId: s.user.id,
    runId: run.id,
    cost: { usd: 0, model: null },
    startedAt: Date.now(),
    ...(revision ? { revision: { note: revision.note, previous: revision.previous } } : {}),
  };
  const started = Date.now();
  try {
    const result = await runner.run(ctx, parsed.data);
    await admin
      .from("tool_runs")
      .update({
        status: "ok",
        title: `${result.title}${revision ? " · revisi" : ""}`.slice(0, 200),
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
      message: msg.startsWith("USER:")
        ? msg.slice(5)
        : msg === "FILE_NOT_FOUND"
          ? "File laporan tidak ditemukan. Upload ulang filenya."
          : msg === "FILE_UNREADABLE"
            ? "Isi file tidak terbaca. Upload export Excel/CSV, atau screenshot/PDF tabel yang jelas. Kuota tidak terpotong."
            : "Maaf, tool sedang bermasalah. Kuota kamu tidak terpotong — coba lagi sebentar lagi.",
    });
  }
}
