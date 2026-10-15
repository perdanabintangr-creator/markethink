import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toolInfo } from "./catalog";
import { getAddonStatus, pickSource } from "./entitlement";
import { RUNNERS, isAiTool } from "./tools";
import type { ToolCtx } from "./runtime";
import { MAX_REVISIONS } from "./format";
import { DEFAULT_TOOL_TIER, quotaUnits, type ToolTier } from "./tool-tier";

export type ExecResult =
  | { ok: true; runId: string; title: string; output: unknown }
  | { ok: false; status: number; code: string; message?: string; addon?: string };

interface ExecOpts {
  admin: SupabaseClient;
  profile: { id: string; role: string; plan_id: string };
  tool: string;
  rawInput: unknown;
  /** Revisi: jalankan ulang dengan input yang sama + koreksi user, tanpa memotong kuota. */
  revise?: { runId: string; note: string };
  /** Waktu mulai request (ms) — batas waktu AI dihitung dari sini. */
  startedAt?: number;
  /** Hasil dibuat oleh Markethink Agent. */
  agentRunId?: string;
  /** Otak yang dipakai (sudah divalidasi terhadap paket user). */
  tier?: ToolTier;
}

/** Jalankan tool add-on: cek kuota → catat run → AI terstruktur + file PPT/Excel → simpan hasil. Dipakai halaman tools & Agent. */
export async function executeTool({ admin, profile, tool, rawInput, revise, startedAt, agentRunId, tier }: ExecOpts): Promise<ExecResult> {
  const info = toolInfo(tool);
  if (!info || !isAiTool(tool)) return { ok: false, status: 404, code: "unknown_tool" };
  const runner = RUNNERS[tool];
  const userId = profile.id;

  let revision: { root: string; note: string; previous: unknown; source: string } | null = null;
  if (revise) {
    const note = String(revise.note ?? "").trim().slice(0, 3000);
    if (note.length < 5) return { ok: false, status: 400, code: "invalid_input", message: "Tulis dulu apa yang perlu diperbaiki." };
    const { data: orig } = await admin
      .from("tool_runs")
      .select("id, tool, status, input, output, source, revision_of")
      .eq("id", String(revise.runId ?? ""))
      .eq("user_id", userId)
      .maybeSingle();
    if (!orig || orig.tool !== tool || orig.status !== "ok") return { ok: false, status: 404, code: "run_not_found" };
    const root = (orig.revision_of as string | null) ?? orig.id;
    const { count } = await admin.from("tool_runs").select("id", { count: "exact", head: true }).eq("revision_of", root).neq("status", "error");
    if ((count ?? 0) >= MAX_REVISIONS)
      return {
        ok: false,
        status: 429,
        code: "revision_limit",
        message: `Batas ${MAX_REVISIONS}× perbaikan gratis untuk hasil ini sudah habis. Buat hasil baru dengan data yang sudah dikoreksi.`,
      };
    revision = { root, note, previous: orig.output, source: orig.source as string };
    rawInput = orig.input;
  }

  const parsed = runner.input.safeParse(rawInput);
  if (!parsed.success) return { ok: false, status: 400, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Data belum lengkap." };

  const useTier = tier ?? DEFAULT_TOOL_TIER;
  const units = revision ? 1 : quotaUnits(useTier);
  let source = revision?.source ?? null;
  if (!revision) {
    const status = await getAddonStatus(admin, profile, info.addon);
    if (!status.nextSource) return { ok: false, status: 402, code: "addon_required", addon: info.addon };
    source = pickSource(status, units);
    if (!source)
      return {
        ok: false,
        status: 402,
        code: "quota_short",
        message: "Otak Director memakai 2 kuota, sisa kuota add-on ini tinggal 1. Pilih otak Senior/Associate atau tambah kuota.",
      };
  }

  const { data: run, error: runErr } = await admin
    .from("tool_runs")
    .insert({
      user_id: userId,
      addon_id: info.addon,
      tool,
      source,
      input: parsed.data,
      title: info.name,
      ...(revision ? { revision_of: revision.root, revision_note: revision.note } : {}),
      ...(agentRunId ? { agent_run_id: agentRunId } : {}),
      quota_units: units,
    })
    .select("id")
    .single();
  if (runErr || !run) return { ok: false, status: 500, code: "run_failed" };

  const ctx: ToolCtx = {
    admin,
    userId,
    runId: run.id,
    cost: { usd: 0, model: null },
    startedAt: startedAt ?? Date.now(),
    tier: useTier,
    ...(revision ? { revision: { note: revision.note, previous: revision.previous } } : {}),
  };
  const started = Date.now();
  try {
    // Revisi tidak riset ulang → temuan riset & sumber dari hasil sebelumnya ikut dipakai (halaman, Excel).
    const prev = revision?.previous as { research_notes?: unknown; sources?: { title: string; url: string }[] } | null;
    if (typeof prev?.research_notes === "string") {
      ctx.researchNotes = prev.research_notes;
      ctx.researchSources = Array.isArray(prev.sources) ? prev.sources : [];
    }
    const result = await runner.run(ctx, parsed.data);
    // Temuan riset lengkap ikut disimpan di hasil.
    const notes = ctx.researchNotes;
    if (notes && result.output && typeof result.output === "object") (result.output as Record<string, unknown>).research_notes = notes.slice(0, 40_000);
    const title = `${result.title}${revision ? " · revisi" : ""}`.slice(0, 200);
    await admin
      .from("tool_runs")
      .update({ status: "ok", title, output: result.output, files: result.files, cost_usd: ctx.cost.usd, finished_at: new Date().toISOString() })
      .eq("id", run.id);
    await admin.from("usage_logs").insert({
      user_id: userId,
      tier: `tool:${tool}`,
      provider: ctx.cost.model?.split(":")[0] ?? null,
      model: ctx.cost.model?.split(":").slice(1).join(":") ?? null,
      est_cost_usd: ctx.cost.usd,
      latency_ms: Date.now() - started,
      status: "ok",
    });
    return { ok: true, runId: run.id, title, output: result.output };
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).slice(0, 1500);
    console.error(`[tool:${tool}] gagal`, msg);
    await admin.from("tool_runs").update({ status: "error", error: msg, cost_usd: ctx.cost.usd, finished_at: new Date().toISOString() }).eq("id", run.id);
    await admin.from("usage_logs").insert({ user_id: userId, tier: `tool:${tool}`, est_cost_usd: ctx.cost.usd, status: "error", error: msg });
    return {
      ok: false,
      status: 500,
      code: "tool_failed",
      message: msg.startsWith("USER:")
        ? msg.slice(5)
        : msg === "FILE_NOT_FOUND"
          ? "File laporan tidak ditemukan. Upload ulang filenya."
          : msg === "FILE_UNREADABLE"
            ? "Isi file tidak terbaca. Upload export Excel/CSV, atau screenshot/PDF tabel yang jelas. Kuota tidak terpotong."
            : "Maaf, tool sedang bermasalah. Kuota kamu tidak terpotong — coba lagi sebentar lagi.",
    };
  }
}
