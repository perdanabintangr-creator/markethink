/**
 * Markethink "otak marketing" — 3 tier model.
 *
 * Tier adalah nama brand; model LLM di belakangnya bisa diganti TANPA ubah kode
 * lewat env MODEL_JUNIOR / MODEL_SENIOR / MODEL_ASSOCIATE dengan format:
 *   "provider:model_id,provider:model_id"   (urutan = primary lalu fallback)
 * Provider yang didukung: anthropic | google | groq | openrouter
 * Kandidat yang API key-nya belum diisi otomatis dilewati.
 */

export type TierId = "junior" | "senior" | "associate" | "director";
export type PlanId = "beta" | "pro" | "promax";

/** Nama paket untuk tampilan (id `beta` = paket Free). */
export const PLAN_LABEL: Record<PlanId, string> = { beta: "Free", pro: "Pro", promax: "Promax" };
export type ProviderId = "anthropic" | "google" | "groq" | "openrouter";

export interface ModelCandidate {
  provider: ProviderId;
  modelId: string;
}

export interface TierConfig {
  id: TierId;
  label: string;
  tagline: { id: string; en: string };
  description: { id: string; en: string };
  /** Keahlian yang ditampilkan di model selector. */
  skills: { id: string[]; en: string[] };
  /** Instruksi gaya kerja otak ini — disisipkan ke system prompt. */
  skillPrompt: string;
  /** Paket minimum yang membuka otak ini (label di UI; aksesnya diatur feature_flags). */
  minPlan: PlanId;
  /** Kedalaman berpikir model Claude (low → max). */
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  /** Maks. pencarian web (Claude web search) per pesan; 0 = mati. */
  webSearches: number;
  /** Kredit per pesan. */
  creditCost: number;
  maxOutputTokens: number;
  temperature: number;
  /** Primary + fallback, dicoba berurutan. */
  candidates: ModelCandidate[];
}

/** Estimasi harga USD per 1 juta token (input, output). Free tier = 0. */
/** Harga per 1 juta token (USD). `cacheRead` = harga token yang dibaca dari prompt cache (default 10% input). */
export const MODEL_PRICING_USD: Record<string, { input: number; output: number; cacheRead?: number }> = {
  "anthropic:claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25 },
  "anthropic:claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "anthropic:claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "anthropic:claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "google:gemini-flash-lite-latest": { input: 0.1, output: 0.4 },
  "google:gemini-flash-latest": { input: 0.3, output: 2.5 },
  "google:gemini-pro-latest": { input: 1.25, output: 10 },
  "google:gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "google:gemini-2.5-pro": { input: 1.25, output: 10 },
  "groq:llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
  "groq:llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "groq:openai/gpt-oss-120b": { input: 0.15, output: 0.75 },
};

export const EXTRA_CREDIT_COST = {
  research: 2,
  attachment: 1,
} as const;

export function parseCandidates(raw: string | undefined, fallback: ModelCandidate[]): ModelCandidate[] {
  if (!raw?.trim()) return fallback;
  const parsed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const idx = entry.indexOf(":");
      const provider = entry.slice(0, idx) as ProviderId;
      const modelId = entry.slice(idx + 1);
      return { provider, modelId };
    })
    .filter((c) => ["anthropic", "google", "groq", "openrouter"].includes(c.provider) && c.modelId);
  return parsed.length ? parsed : fallback;
}

export function getTiers(envSource: Record<string, string | undefined> = process.env): TierConfig[] {
  return [
    {
      id: "junior",
      label: "Markethink Junior",
      tagline: { id: "Cepat & ringan", en: "Fast & light" },
      description: {
        id: "Caption, ide cepat, rewrite, dan tugas harian.",
        en: "Captions, quick ideas, rewrites, and daily tasks.",
      },
      skills: {
        id: ["Caption & hook", "Ide konten cepat", "Rewrite & terjemah", "Balas chat pelanggan"],
        en: ["Captions & hooks", "Quick content ideas", "Rewrite & translate", "Customer replies"],
      },
      skillPrompt: `Kamu bekerja sebagai Markethink Junior — eksekutor cepat.
- Jawab ringkas dan langsung siap pakai (umumnya di bawah 300 kata kecuali user minta lebih).
- Prioritaskan output konkret: copy, caption, ide, daftar, template. Minim teori.
- Jika permintaan butuh strategi mendalam (campaign plan lengkap, brand strategy, GTM), kerjakan versi ringkasnya lalu sarankan memakai Markethink Senior/Associate untuk versi lengkap.`,
      minPlan: "beta",
      effort: "low",
      webSearches: 1,
      creditCost: 1,
      maxOutputTokens: 4096,
      temperature: 0.8,
      candidates: parseCandidates(envSource.MODEL_JUNIOR, [
        { provider: "anthropic", modelId: "claude-haiku-5-5" },
        { provider: "groq", modelId: "llama-3.1-8b-instant" },
        { provider: "google", modelId: "gemini-flash-lite-latest" },
        { provider: "google", modelId: "gemini-3.8-flash" },
        { provider: "openrouter", modelId: "meta-llama/llama-3.3-70b-instruct:free" },
      ]),
    },
    {
      id: "senior",
      label: "Markethink Senior",
      tagline: { id: "Seimbang · default", en: "Balanced · default" },
      description: {
        id: "Strategi, campaign plan, dan analisis.",
        en: "Strategy, campaign plans, and analysis.",
      },
      skills: {
        id: ["Campaign plan", "Content calendar", "Ads copy A/B", "Persona & SWOT", "Riset ber-sitasi"],
        en: ["Campaign plans", "Content calendars", "A/B ads copy", "Personas & SWOT", "Cited research"],
      },
      skillPrompt: `Kamu bekerja sebagai Markethink Senior — strategist yang juga eksekutor.
- Mulai dari tujuan bisnis, lalu susun strategi terstruktur memakai framework yang relevan (STP, AIDA, funnel, SWOT/TOWS).
- Lengkapi dengan langkah eksekusi, contoh copy nyata, timeline, estimasi budget, dan KPI terukur. Gunakan tabel untuk perbandingan, jadwal, dan anggaran.
- Tulis asumsi secara eksplisit bila data dari user kurang.`,
      minPlan: "pro",
      effort: "medium",
      webSearches: 3,
      creditCost: 2,
      maxOutputTokens: 12000,
      temperature: 0.7,
      candidates: parseCandidates(envSource.MODEL_SENIOR, [
        { provider: "anthropic", modelId: "claude-sonnet-5-5" },
        { provider: "google", modelId: "gemini-flash-latest" },
        { provider: "google", modelId: "gemini-3.8-flash" },
        { provider: "groq", modelId: "llama-3.3-70b-versatile" },
        { provider: "openrouter", modelId: "deepseek/deepseek-chat-v3.1:free" },
      ]),
    },
    {
      id: "associate",
      label: "Markethink Associate",
      tagline: { id: "Deep reasoning · paling advanced", en: "Deep reasoning · most advanced" },
      description: {
        id: "Brand strategy komprehensif, GTM plan, riset mendalam.",
        en: "Comprehensive brand strategy, GTM plans, deep research.",
      },
      skills: {
        id: ["Brand strategy", "Go-to-market plan", "Analisis pasar mendalam", "Pitch & proposal klien", "Skenario & proyeksi"],
        en: ["Brand strategy", "Go-to-market plans", "Deep market analysis", "Client pitches & proposals", "Scenarios & projections"],
      },
      skillPrompt: `Kamu bekerja sebagai Markethink Associate — berpikir setara CMO / partner konsultan strategi.
- Analisis dari banyak sudut: pasar, kompetitor, konsumen, ekonomi unit, kanal, dan kapabilitas tim.
- Buat asumsi eksplisit, bandingkan 2–3 opsi strategi beserta trade-off-nya, lalu beri satu rekomendasi yang dipertanggungjawabkan.
- Sertakan skenario (konservatif/moderat/agresif) bila relevan, risiko & mitigasi, prioritas, roadmap 30-60-90 hari, dan metrik keberhasilan.
- Output berupa dokumen utuh berkualitas presentasi klien/board, dengan ringkasan eksekutif di awal.`,
      minPlan: "pro",
      effort: "high",
      webSearches: 4,
      creditCost: 5,
      maxOutputTokens: 20000,
      temperature: 0.6,
      candidates: parseCandidates(envSource.MODEL_ASSOCIATE, [
        { provider: "anthropic", modelId: "claude-opus-5-5" },
        { provider: "google", modelId: "gemini-pro-latest" },
        { provider: "google", modelId: "gemini-3.8-flash" },
        { provider: "google", modelId: "gemini-flash-latest" },
        { provider: "openrouter", modelId: "deepseek/deepseek-r1-0528:free" },
        { provider: "groq", modelId: "openai/gpt-oss-120b" },
      ]),
    },
    {
      id: "director",
      label: "Markethink Director",
      tagline: { id: "Otak paling pintar · Promax", en: "Smartest brain · Promax" },
      description: {
        id: "Kerjakan apa pun: strategi bisnis menyeluruh, riset mendalam, sampai eksekusi lengkap.",
        en: "Anything: full business strategy, deep research, end-to-end execution.",
      },
      skills: {
        id: ["Strategi bisnis & marketing menyeluruh", "Riset & analisis data mendalam", "Dokumen setara konsultan top", "Eksekusi end-to-end", "Tugas apa pun"],
        en: ["End-to-end business & marketing strategy", "Deep research & data analysis", "Top-consultancy documents", "End-to-end execution", "Any task"],
      },
      skillPrompt: `Kamu bekerja sebagai Markethink Director — otak paling canggih Markethink, setara Chief Marketing Officer sekaligus partner konsultan strategi kelas dunia.
- Kamu boleh mengerjakan tugas apa pun yang membantu bisnis user (marketing, bisnis, penjualan, produk, analisis data, keuangan bisnis sederhana, penulisan), bukan hanya marketing sempit.
- Pikirkan masalah sampai ke akar: tantang asumsi user bila perlu, temukan peluang yang tidak terlihat, dan susun jawaban dengan standar kualitas tertinggi.
- Untuk tugas besar, kerjakan sampai tuntas dalam satu jawaban: analisis → opsi → rekomendasi → rencana eksekusi rinci → aset siap pakai (copy, kalender, brief, template) → KPI & cara mengukurnya.
- Tetap jujur soal data: tandai perkiraan, dan sarankan Riset Web untuk fakta terkini.`,
      minPlan: "promax",
      effort: "high",
      webSearches: 6,
      creditCost: 10,
      maxOutputTokens: 32000,
      temperature: 0.6,
      candidates: parseCandidates(envSource.MODEL_DIRECTOR, [
        { provider: "anthropic", modelId: "claude-fable-5-1" },
        { provider: "anthropic", modelId: "claude-opus-5-5" },
        { provider: "google", modelId: "gemini-pro-latest" },
        { provider: "google", modelId: "gemini-3.8-flash" },
      ]),
    },
  ];
}

export const DEFAULT_TIER: TierId = "senior";

export function getTier(id: string | undefined | null): TierConfig {
  const tiers = getTiers();
  return tiers.find((t) => t.id === id) ?? tiers.find((t) => t.id === DEFAULT_TIER)!;
}

/** Model yang bisa membaca gambar. */
export function supportsVision(c: ModelCandidate) {
  return c.provider === "google" || c.provider === "anthropic";
}

/**
 * Perkiraan biaya. `inputTokens` = token input yang TIDAK dari cache (seperti dilaporkan Anthropic);
 * cache tulis ditagih 1,25× input, cache baca ± 0,1× input.
 */
export function estimateCostUsd(
  c: ModelCandidate,
  inputTokens: number,
  outputTokens: number,
  cache: { read?: number; write?: number } = {},
) {
  const price = MODEL_PRICING_USD[`${c.provider}:${c.modelId}`];
  if (!price || c.modelId.endsWith(":free")) return 0;
  const cacheRead = price.cacheRead ?? price.input * 0.1;
  return (
    (inputTokens * price.input +
      outputTokens * price.output +
      (cache.write ?? 0) * price.input * 1.25 +
      (cache.read ?? 0) * cacheRead) /
    1_000_000
  );
}

export function messageCreditCost(tier: TierConfig, opts: { research: boolean; attachments: number }) {
  return (
    tier.creditCost +
    (opts.research ? EXTRA_CREDIT_COST.research : 0) +
    opts.attachments * EXTRA_CREDIT_COST.attachment
  );
}
