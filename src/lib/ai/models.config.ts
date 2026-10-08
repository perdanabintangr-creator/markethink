/**
 * Markethink "otak marketing" — 3 tier model.
 *
 * Tier adalah nama brand; model LLM di belakangnya bisa diganti TANPA ubah kode
 * lewat env MODEL_JUNIOR / MODEL_SENIOR / MODEL_ASSOCIATE dengan format:
 *   "provider:model_id,provider:model_id"   (urutan = primary lalu fallback)
 * Provider yang didukung: anthropic | google | groq | openrouter
 * Kandidat yang API key-nya belum diisi otomatis dilewati.
 */

export type TierId = "junior" | "senior" | "associate";
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
  /** Kredit per pesan. */
  creditCost: number;
  maxOutputTokens: number;
  temperature: number;
  /** Primary + fallback, dicoba berurutan. */
  candidates: ModelCandidate[];
}

/** Estimasi harga USD per 1 juta token (input, output). Free tier = 0. */
export const MODEL_PRICING_USD: Record<string, { input: number; output: number }> = {
  "anthropic:claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "anthropic:claude-sonnet-5-5": { input: 2, output: 10 },
  "anthropic:claude-opus-5-5": { input: 4, output: 20 },
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

function parseCandidates(raw: string | undefined, fallback: ModelCandidate[]): ModelCandidate[] {
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

export function estimateCostUsd(c: ModelCandidate, inputTokens: number, outputTokens: number) {
  const price = MODEL_PRICING_USD[`${c.provider}:${c.modelId}`];
  if (!price || c.modelId.endsWith(":free")) return 0;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

export function messageCreditCost(tier: TierConfig, opts: { research: boolean; attachments: number }) {
  return (
    tier.creditCost +
    (opts.research ? EXTRA_CREDIT_COST.research : 0) +
    opts.attachments * EXTRA_CREDIT_COST.attachment
  );
}
