import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toolInfo } from "./catalog";
import { getToolAccess } from "./access";
import { consumeCredits, creditsForUsd, refundCredits, settleCredits } from "@/lib/credits";
import { RUNNERS, isAiTool } from "./tools";
import type { ToolCtx } from "./runtime";
import { MAX_REVISIONS, TOOL_CREDIT_ESTIMATE, revisionEstimate } from "./format";
import { DEFAULT_TOOL_TIER, type ToolTier } from "./tool-tier";

export type ExecResult =
  | { ok: true; runId: string; title: string; output: unknown; credits: number }
  | { ok: false; status: number; code: string; message?: string; addon?: string };

interface ExecOpts {
  admin: SupabaseClient;
  profile: { id: string; role: string; plan_id: string; language?: string | null };
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
  const en = profile.language === "en";
  const info = toolInfo(tool);
  if (!info || !isAiTool(tool)) return { ok: false, status: 404, code: "unknown_tool" };
  const runner = RUNNERS[tool];
  const userId = profile.id;

  let revision: { root: string; note: string; previous: unknown; source: string } | null = null;
  if (revise) {
    const note = String(revise.note ?? "").trim().slice(0, 3000);
    if (note.length < 5) return { ok: false, status: 400, code: "invalid_input", message: en ? "Write what needs to be fixed first." : "Tulis dulu apa yang perlu diperbaiki." };
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

  // Paket all-in-1: Tools Pro termasuk paket berbayar & memakai kredit bulanan (dipotong perkiraan, lalu disesuaikan ke biaya nyata).
  // Paket yang belum membuka Tools Pro: add-on yang dibeli terpisah (kuota hasil + batas modal, tanpa kredit, otak Senior).
  const access = await getToolAccess(admin, profile, info.addon);
  if (!access.allowed) {
    const offered = Boolean(access.addon);
    return {
      ok: false,
      status: 402,
      code: "plan_required",
      addon: info.addon,
      message: en
        ? `Pro Tools are available from the Starter plan${offered ? ", or buy just this add-on" : ""}.`
        : `Tools Pro tersedia mulai paket Starter${offered ? ", atau beli add-on ini saja" : ""}.`,
    };
  }
  const viaAddon = access.via === "addon";
  if (viaAddon && !(revision ? access.addon?.canRevise : (access.addon?.remaining ?? 0) > 0)) {
    return {
      ok: false,
      status: 402,
      code: "addon_quota_used",
      addon: info.addon,
      message: en
        ? "This month's add-on quota is used up. It resets on the same date next month, or upgrade your plan for a bigger quota."
        : "Kuota add-on bulan ini sudah habis. Kuota terisi lagi di tanggal yang sama bulan depan, atau upgrade paket untuk kuota lebih besar.",
    };
  }
  const useTier = viaAddon ? DEFAULT_TOOL_TIER : (tier ?? DEFAULT_TOOL_TIER);
  const estimate = viaAddon ? 0 : revision ? revisionEstimate(useTier) : TOOL_CREDIT_ESTIMATE[useTier];
  if (!viaAddon) {
    const charge = await consumeCredits(userId, estimate, revision ? `tool_revise:${tool}` : `tool:${tool}`, { tier: useTier });
    if (!charge.ok)
      return {
        ok: false,
        status: 402,
        code: "credits_low",
        message: en
          ? "Not enough quota left this month for this result. Quota resets on the 1st of each month, or upgrade for a bigger quota."
          : "Sisa kuota bulan ini tidak cukup untuk hasil ini. Kuota direset tiap tanggal 1, atau upgrade paket untuk kuota lebih besar.",
      };
  }
  const source = access.isAdmin ? "admin" : viaAddon ? "addon" : "paid";
  const units = 1;

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
  if (runErr || !run) {
    await refundCredits(userId, estimate, `tool_failed:${tool}`);
    return { ok: false, status: 500, code: "run_failed" };
  }

  const ctx: ToolCtx = {
    admin,
    userId,
    runId: run.id,
    cost: { usd: 0, model: null },
    startedAt: startedAt ?? Date.now(),
    tier: useTier,
    lang: profile.language === "en" ? "en" : "id",
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
      .update({
        status: "ok",
        title,
        output: result.output,
        files: result.files,
        cost_usd: ctx.cost.usd,
        cost_breakdown: ctx.breakdown ?? [],
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    // Add-on tidak memakai kredit paket; biaya nyatanya tercatat di tool_runs.cost_usd (batas modal add-on).
    const credits = viaAddon ? 0 : creditsForUsd(ctx.cost.usd);
    if (!viaAddon) await settleCredits(userId, estimate, credits, `tool_settle:${tool}`, { runId: run.id });
    await admin.from("usage_logs").insert({
      user_id: userId,
      tier: `tool:${tool}`,
      provider: ctx.cost.model?.split(":")[0] ?? null,
      model: ctx.cost.model?.split(":").slice(1).join(":") ?? null,
      est_cost_usd: ctx.cost.usd,
      credits,
      latency_ms: Date.now() - started,
      status: "ok",
    });
    return { ok: true, runId: run.id, title, output: result.output, credits };
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).slice(0, 1500);
    console.error(`[tool:${tool}] gagal`, msg);
    // Gagal → kredit dikembalikan penuh (biaya AI ditanggung Markethink).
    await refundCredits(userId, estimate, `tool_failed:${tool}`);
    await admin
      .from("tool_runs")
      .update({ status: "error", error: msg, cost_usd: ctx.cost.usd, cost_breakdown: ctx.breakdown ?? [], finished_at: new Date().toISOString() })
      .eq("id", run.id);
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
            ? "Isi file tidak terbaca. Upload export Excel/CSV, atau screenshot/PDF tabel yang jelas. Kuota tidak terpakai."
            : "Maaf, tool sedang bermasalah. Kuota kamu tidak terpotong, coba lagi sebentar lagi.",
    };
  }
}
