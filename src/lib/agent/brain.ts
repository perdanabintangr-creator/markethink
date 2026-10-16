import "server-only";
import { generateText } from "ai";
import { z } from "zod";
import { toolInfo } from "@/lib/addons/catalog";
import { aiObject, addCost, type ToolCtx } from "@/lib/addons/runtime";
import { EXPERT } from "@/lib/addons/helpers";
import { RUNNERS } from "@/lib/addons/tools";
import { PRO_FORMS } from "@/lib/addons/pro/forms";
import { untrusted } from "@/lib/ai/prompt";
import { routeTier } from "@/lib/ai/router";
import { DEFAULT_TOOL_TIER } from "@/lib/addons/tool-tier";
import { AGENT_MAX_STEPS, AGENT_TOOL_IDS, AGENT_TOOLS, type AgentStep } from "./catalog";

const todayWIB = () => new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

const planSchema = z.object({
  title: z.string().describe("Judul misi singkat, maks 70 karakter, mis. 'Kampanye Ramadan — Toko Hijab Aisyah'"),
  understanding: z.string().describe("1–2 kalimat: apa yang kamu tangkap dari tujuan user"),
  steps: z
    .array(z.object({ tool: z.enum(AGENT_TOOL_IDS), why: z.string().describe("Alasan singkat (maks 140 karakter) kenapa langkah ini perlu & urutannya") }))
    .describe(`2–${AGENT_MAX_STEPS} langkah, urut dari fondasi (riset/strategi) ke eksekusi (konten/iklan/jualan)`),
});

/** Susun rencana: pilih Tools Pro yang relevan, urut dari fondasi ke eksekusi, sesuai kuota yang tersedia. */
export async function planMission(
  ctx: ToolCtx,
  opts: { goal: string; context: string; profileLine: string; quota: Record<string, number> },
) {
  const catalog = AGENT_TOOLS.map((t) => {
    const left = opts.quota[t.addon] ?? 0;
    return `- ${t.id}: ${t.name} — ${t.short} (sisa kuota grup: ${left === Infinity ? "tanpa batas" : left})`;
  }).join("\n");
  const out = await aiObject(ctx, {
    schema: planSchema,
    system: `${EXPERT}

PERAN: kamu Head of Marketing yang merencanakan pekerjaan tim. User memberi satu tujuan; kamu memilih Tools Pro Markethink yang perlu
dijalankan BERURUTAN agar menghasilkan paket kerja yang lengkap & saling nyambung (hasil langkah awal dipakai langkah berikutnya).

ATURAN
- Pilih hanya tools yang benar-benar dibutuhkan tujuan ini: 2–${AGENT_MAX_STEPS} langkah, jangan memilih tool yang sama dua kali.
- Urutan: riset/strategi dulu (mis. persona, kompetitor, positioning/brand, marketing plan) → rencana kampanye → eksekusi (kalender konten, skrip, iklan, promo, WhatsApp, dll.).
- Jangan memilih tool yang sisa kuota grupnya 0. Langkah-langkah dari grup yang sama tidak boleh melebihi sisa kuota grup itu.
- "why" ditulis untuk pemilik bisnis: konkret, tanpa jargon.

TOOLS YANG TERSEDIA
${catalog}`,
    prompt: [
      `Hari ini: ${todayWIB()} (WIB).`,
      opts.profileLine && `Profil user: ${opts.profileLine}`,
      `Tujuan user:\n${untrusted("tujuan", opts.goal)}`,
      opts.context && `Info bisnis tambahan:\n${untrusted("info-bisnis", opts.context)}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    maxOutputTokens: 3000,
  });
  return { ...out, steps: fitToQuota(out.steps, opts.quota) };
}

/** Buang langkah ganda & langkah yang melebihi kuota grup add-on-nya (aturan diterapkan program, bukan hanya AI). */
export function fitToQuota(steps: { tool: string; why: string }[], quota: Record<string, number>): AgentStep[] {
  const left = { ...quota };
  const seen = new Set<string>();
  const out: AgentStep[] = [];
  for (const s of steps) {
    const info = toolInfo(s.tool);
    if (!info || seen.has(s.tool) || !(AGENT_TOOL_IDS as string[]).includes(s.tool)) continue;
    seen.add(s.tool);
    if ((left[info.addon] ?? 0) <= 0) continue;
    left[info.addon] = (left[info.addon] ?? 0) - 1;
    out.push({ tool: info.id, why: s.why.slice(0, 200), status: "pending", run_id: null, error: null });
    if (out.length >= AGENT_MAX_STEPS) break;
  }
  return out;
}

/** Deskripsi form tool untuk AI pengisi brief (label, pilihan, wajib/tidak). */
function formGuide(tool: string) {
  const form = PRO_FORMS[tool];
  if (!form) return "";
  return form.fields
    .filter((f) => f.type !== "files")
    .map((f) => {
      const req = "required" in f && f.required ? " (WAJIB)" : "";
      const choices = "options" in f && f.options ? ` — pilihan: ${f.options.map((o) => `${o.value}=${o.label}`).join(", ")}` : "";
      return `- ${f.name}: ${f.label}${req}${choices}`;
    })
    .join("\n");
}

/** Isi brief (input) satu tool otomatis dari tujuan user + hasil langkah sebelumnya. */
export async function fillStepInput(
  ctx: ToolCtx,
  opts: { tool: string; goal: string; context: string; profileLine: string; previous: { name: string; title: string; markdown: string }[] },
) {
  const runner = RUNNERS[opts.tool];
  const info = toolInfo(opts.tool);
  const guide = formGuide(opts.tool);
  const prev = opts.previous
    .map((p) => `### ${p.name} — ${p.title}\n${p.markdown}`)
    .join("\n\n")
    .slice(0, 24_000);
  const input = await aiObject(ctx, {
    schema: runner.input,
    system: `${EXPERT}

PERAN: kamu asisten Head of Marketing yang MENGISI FORM BRIEF untuk tool "${info?.name}" atas nama user, berdasarkan tujuan user,
info bisnis, dan hasil langkah sebelumnya. Brief ini akan dikerjakan oleh spesialis, jadi isi selengkap & sespesifik mungkin.

ATURAN
- Pakai fakta dari tujuan/info bisnis user apa adanya (nama brand, produk, kota, harga, budget, periode). Jangan mengarang angka spesifik
  yang tidak ada (harga, omzet, budget); bila field opsional tidak diketahui isi "" — field wajib diisi dengan perkiraan wajar yang dijelaskan sebagai asumsi.
- Manfaatkan hasil langkah sebelumnya: persona/segmen, positioning, pesan kunci, kanal, dan jadwal harus konsisten.
- Field berupa pilihan wajib memakai value yang tersedia. Field file (attachment_ids) isi [] .
- Periode/bulan: pakai yang disebut user; bila tidak ada, bulan depan dari hari ini.
${guide ? `\nFIELD FORM\n${guide}` : ""}`,
    prompt: [
      `Hari ini: ${todayWIB()} (WIB).`,
      opts.profileLine && `Profil user: ${opts.profileLine}`,
      `Tujuan user:\n${untrusted("tujuan", opts.goal)}`,
      opts.context && `Info bisnis tambahan:\n${untrusted("info-bisnis", opts.context)}`,
      prev && `Hasil langkah sebelumnya (ringkas):\n${untrusted("hasil-sebelumnya", prev)}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    maxOutputTokens: 4000,
  });
  return input as Record<string, unknown>;
}

/** Ringkasan eksekutif paket: benang merah semua hasil + langkah eksekusi minggu ini. */
export async function summarizeMission(
  ctx: ToolCtx,
  opts: { goal: string; title: string; results: { name: string; title: string; markdown: string }[]; failed: string[] },
) {
  const routed = routeTier(ctx.tier ?? DEFAULT_TOOL_TIER);
  const body = opts.results.map((r) => `### ${r.name} — ${r.title}\n${r.markdown}`).join("\n\n").slice(0, 60_000);
  const res = await generateText({
    model: routed.model,
    system: `${EXPERT}

Tulis RINGKASAN EKSEKUTIF paket kerja Markethink Agent untuk pemilik bisnis, dalam Markdown (bahasa Indonesia, gaya konsultan senior, ringkas).
Struktur:
## Inti strategi
2–4 kalimat benang merah: untuk siapa, pesan utama, kenapa ini akan berhasil.
## Yang sudah disiapkan
Bullet per hasil (sebut nama tool) + 1 kalimat manfaatnya.
## Rencana eksekusi
Tabel 3 kolom (Kapan | Aksi | Hasil dari tool mana) berisi 6–10 langkah nyata, mulai minggu ini.
## Angka yang dipantau
3–5 metrik + target awal yang wajar (beri label "perkiraan" bila asumsi).
## Catatan & risiko
2–4 bullet jujur (data yang masih asumsi, hal yang perlu divalidasi).
Jangan mengulang isi hasil panjang-panjang; rujuk saja. Jangan menulis kata pembuka/penutup basa-basi.`,
    prompt: [
      `Tujuan user:\n${untrusted("tujuan", opts.goal)}`,
      `Judul misi: ${opts.title}`,
      opts.failed.length ? `Langkah yang gagal/dilewati (sebutkan singkat di catatan): ${opts.failed.join(", ")}` : "",
      `Hasil tiap langkah:\n${untrusted("hasil", body)}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    maxOutputTokens: 3500,
    maxRetries: 2,
  });
  addCost(ctx, routed.resolved(), res.usage, { stage: "Ringkasan Agent", text: res.text });
  return res.text.trim();
}
