import "server-only";
import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { routeTier } from "@/lib/ai/router";
import { untrusted } from "@/lib/ai/prompt";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { executeTool } from "./execute";
import { toolInfo } from "./catalog";
import { DEFAULT_TOOL_TIER, TOOL_TIERS, type ToolTier } from "./tool-tier";

/**
 * Pantau mingguan: hasil Smart Tools tertentu dijalankan ulang otomatis tiap 7 hari (riset web terbaru),
 * lalu AI merangkum apa yang berubah dibanding minggu lalu & user diberi tahu lewat email.
 * Memotong kuota paket seperti menjalankan tool biasa. Paket Pro ke atas.
 */
export const WATCHABLE_TOOLS = ["competitor", "audit"] as const;
export const MAX_WATCHERS = 3;
export const WATCH_INTERVAL_DAYS = 7;

export const isWatchable = (tool: string) => (WATCHABLE_TOOLS as readonly string[]).includes(tool);
export const nextWeek = (from = Date.now()) => new Date(from + WATCH_INTERVAL_DAYS * 86_400_000).toISOString();

/** Ringkasan isi hasil untuk dibandingkan (teks utama saja, tanpa file & catatan riset panjang). */
function digest(output: unknown) {
  if (!output || typeof output !== "object") return "";
  const o = { ...(output as Record<string, unknown>) };
  delete o.research_notes;
  delete o.sources;
  delete o.lab_tests;
  delete o.watch_changes;
  return JSON.stringify(o).slice(0, 12_000);
}

/** Bandingkan hasil minggu lalu vs sekarang → 3-5 poin perubahan yang perlu ditindaklanjuti (otak Junior, murah). */
export async function summarizeChanges(prev: unknown, next: unknown, lang: "id" | "en") {
  const routed = routeTier("junior");
  const res = await generateText({
    model: routed.model,
    maxOutputTokens: 900,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(45_000),
    system: `Kamu analis marketing. Bandingkan dua hasil analisis yang sama dari minggu lalu dan minggu ini.
Tulis 3-5 poin perubahan PALING PENTING yang perlu ditindaklanjuti user (harga/promo kompetitor, posisi, kanal, temuan baru, skor naik/turun),
masing-masing satu kalimat dan diawali "- ". Jika hampir tidak ada perubahan berarti, tulis satu poin yang menyatakannya dengan jujur.
Tanpa pembuka/penutup, tanpa tanda pisah panjang. ${lang === "en" ? "Write in English." : "Tulis dalam bahasa Indonesia."}`,
    prompt: `MINGGU LALU:\n${untrusted("minggu-lalu", digest(prev))}\n\nMINGGU INI:\n${untrusted("minggu-ini", digest(next))}`,
  });
  return res.text
    .split("\n")
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

interface WatcherRow {
  id: string;
  user_id: string;
  tool: string;
  input: unknown;
  title: string;
  tier: string;
  last_run_id: string | null;
  source_run_id: string | null;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Jalankan satu pemantauan yang sudah jatuh tempo (dipanggil cron). */
export async function runWatcher(admin: SupabaseClient, id: string) {
  const { data: w } = await admin.from("tool_watchers").select("id, user_id, tool, input, title, tier, last_run_id, source_run_id, active").eq("id", id).maybeSingle();
  if (!w?.active) return { ok: false, reason: "inactive" };
  const row = w as WatcherRow;
  const { data: profile } = await admin.from("profiles").select("id, role, plan_id, language, email, full_name, banned").eq("id", row.user_id).maybeSingle();
  if (!profile || profile.banned) {
    await admin.from("tool_watchers").update({ active: false, last_status: "akun tidak aktif" }).eq("id", id);
    return { ok: false, reason: "no_profile" };
  }
  const lang = profile.language === "en" ? "en" : "id";
  const tier = (TOOL_TIERS as readonly string[]).includes(row.tier) ? (row.tier as ToolTier) : DEFAULT_TOOL_TIER;
  const res = await executeTool({ admin, profile, tool: row.tool, rawInput: row.input, startedAt: Date.now(), tier });
  const now = new Date().toISOString();
  const name = toolInfo(row.tool)?.name ?? row.title;

  if (!res.ok) {
    // Kuota habis / akses hilang → coba lagi minggu depan & beri tahu user; error lain → coba lagi besok.
    const userIssue = res.status === 402;
    await admin
      .from("tool_watchers")
      .update({ last_status: res.message ?? res.code, next_run_at: userIssue ? nextWeek() : new Date(Date.now() + 86_400_000).toISOString() })
      .eq("id", id);
    if (userIssue && profile.email)
      await sendEmail(
        profile.email,
        lang === "en" ? `Weekly monitoring paused: ${name}` : `Pantau mingguan tertunda: ${name}`,
        `<p>${esc(res.message ?? "")}</p><p><a href="${env.appUrl}/pricing">${lang === "en" ? "See plans" : "Lihat paket"}</a></p>`,
      );
    return { ok: false, reason: res.code };
  }

  const prevId = row.last_run_id ?? row.source_run_id;
  let changes: string[] = [];
  if (prevId) {
    const { data: prev } = await admin.from("tool_runs").select("output").eq("id", prevId).maybeSingle();
    try {
      changes = prev ? await summarizeChanges(prev.output, res.output, lang) : [];
    } catch (err) {
      console.error("[watch] ringkasan perubahan gagal", err);
    }
  }
  if (changes.length) await admin.from("tool_runs").update({ output: { ...(res.output as object), watch_changes: changes } }).eq("id", res.runId);
  await admin.from("tool_watchers").update({ last_run_id: res.runId, last_run_at: now, next_run_at: nextWeek(), last_status: "ok" }).eq("id", id);

  if (profile.email) {
    const url = `${env.appUrl}/tools/${row.tool}/${res.runId}`;
    await sendEmail(
      profile.email,
      lang === "en" ? `Weekly update: ${row.title}` : `Update mingguan: ${row.title}`,
      `<h2>${esc(row.title)}</h2>
<p>${lang === "en" ? "This week's changes:" : "Yang berubah minggu ini:"}</p>
<ul>${(changes.length ? changes : [lang === "en" ? "The new analysis is ready." : "Analisis terbaru sudah siap."]).map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
<p><a href="${url}" style="display:inline-block;background:#1e5bff;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${lang === "en" ? "Open the full result" : "Buka hasil lengkap"}</a></p>`,
    );
  }
  return { ok: true, runId: res.runId };
}
