import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toolInfo } from "./catalog";
import { getToolAccess } from "./access";
import { consumeCredits, creditsForUsd, refundCredits, settleCredits } from "@/lib/credits";
import { RUNNERS, isAiTool } from "./tools";
import type { ToolCtx } from "./runtime";
import { MAX_REVISIONS, TOOL_CREDIT_ESTIMATE, revisionEstimate } from "./format";
import { DEFAULT_TOOL_TIER, type ToolTier } from "./tool-tier";
import { resultToMarkdown } from "./to-markdown";
import { runTeamReview } from "@/lib/ai/team-review-run";
import { quotaMessage, weekStartWib } from "@/lib/quota";
import { formatOutcomes, type OutcomeRow } from "@/lib/ai/outcomes";

/** Porsi mingguan tool termahal per paket (jumlah hasil baru per minggu; revisi tidak dihitung). */
const WEEKLY_TOOL_CAP: Record<string, Record<string, number>> = { sizing: { starter: 1, pro: 1, promax: 2 } };

/** Tool strategi yang hasilnya diperiksa Tim Otak (founder ACC rancangan tahap 2). */
const REVIEWED_TOOLS = new Set(["campaign", "persona", "competitor", "calendar"]);
/** Pemeriksaan hanya dijalankan bila waktu request masih cukup (batas fungsi 300 dtk). */
const REVIEW_TIME_BUDGET_MS = 220_000;

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
  /** Hasil dibuat oleh Marqthink Agent. */
  agentRunId?: string;
  /** Otak yang dipakai (sudah divalidasi terhadap paket user). */
  tier?: ToolTier;
}

/** Jalankan tool add-on: cek kuota → catat run → AI terstruktur + file PPT/Excel → simpan hasil. Dipakai halaman tools & Agent. */
/** Smart Tools kreatif yang disusun otak Senior hemat (Qwen 3.7 Plus); analisis, angka & CS tetap Claude. */
const CREATIVE_TOOLS = new Set(["calendar", "adcopy", "persona", "competitor", "listing", "kol"]);

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
    return {
      ok: false,
      status: 402,
      code: "plan_required",
      addon: info.addon,
      message: en
        ? "Smart Tools are available on the Pro & Promax plans."
        : "Smart Tools tersedia di paket Pro & Promax.",
    };
  }
  // Otak di atas Senior (Head/Director) dipilih → pakai kuota paket bila paket membuka Smart Tools (add-on selalu otak Senior).
  const viaAddon = access.via === "addon" && !(access.planAllowed && tier && tier !== DEFAULT_TOOL_TIER);
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
  // Tool termahal (Ukuran Pasar) punya porsi mingguan sendiri (ACC founder 15 Nov): Starter & Pro 1×, Promax 2×.
  const weeklyCap = WEEKLY_TOOL_CAP[tool]?.[profile.plan_id];
  if (!access.isAdmin && !revision && weeklyCap !== undefined) {
    const { count } = await admin
      .from("tool_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("tool", tool)
      .is("revision_of", null)
      .neq("status", "error")
      .gte("created_at", weekStartWib().toISOString());
    if ((count ?? 0) >= weeklyCap) {
      return {
        ok: false,
        status: 429,
        code: "weekly_tool_limit",
        message: en
          ? `${info.name} can be used ${weeklyCap}× per week on your plan. It refills on Monday at 00:00 WIB. You can still revise last week's result for free.`
          : `${info.name} bisa dipakai ${weeklyCap}× per minggu di paket kamu. Terisi lagi Senin pukul 00.00 WIB. Hasil sebelumnya tetap bisa diperbaiki gratis.`,
      };
    }
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
        message: quotaMessage(charge.reason, en),
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
    await refundCredits(userId, estimate, `tool_failed:${tool}`, { tier: useTier });
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
    creative: useTier === "senior" && CREATIVE_TOOLS.has(tool),
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
    if (!viaAddon) await settleCredits(userId, estimate, credits, `tool_settle:${tool}`, { runId: run.id, tier: useTier });
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
    // Tim Otak: Pemeriksaan Tim untuk tool strategi (bukan add-on terpisah & bukan revisi; kredit dipotong sesuai biaya nyata).
    let reviewCredits = 0;
    if (!viaAddon && !revision && !agentRunId && REVIEWED_TOOLS.has(tool) && Date.now() - (ctx.startedAt ?? started) < REVIEW_TIME_BUDGET_MS) {
      const { data: pref } = await admin.from("profiles").select("team_review").eq("id", userId).maybeSingle();
      if (pref?.team_review !== false) {
        const { data: outcomeRows } = await admin
          .from("strategy_outcomes")
          .select("result, topic, note, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(8);
        const reviewed = await runTeamReview({
          admin,
          userId,
          tier: useTier,
          question: `${info.name}. Data dari user: ${JSON.stringify(parsed.data).slice(0, 2500)}`,
          answer: resultToMarkdown(result.output, 30_000),
          sources: (result.output as { sources?: { title: string; url: string }[] } | null)?.sources ?? [],
          outcomes: formatOutcomes((outcomeRows ?? []) as OutcomeRow[]),
          en,
          reason: `team_review:${tool}`,
        });
        if (reviewed) {
          reviewCredits = reviewed.review.credits;
          await admin.from("tool_runs").update({ review: reviewed.review }).eq("id", run.id);
        }
      }
    }
    return { ok: true, runId: run.id, title, output: result.output, credits: credits + reviewCredits };
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).slice(0, 1500);
    console.error(`[tool:${tool}] gagal`, msg);
    // Gagal → kredit dikembalikan penuh (biaya AI ditanggung Marqthink).
    await refundCredits(userId, estimate, `tool_failed:${tool}`, { tier: useTier });
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
