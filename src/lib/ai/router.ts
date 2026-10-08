import "server-only";
import type { LanguageModelV2, LanguageModelV2CallOptions } from "@ai-sdk/provider";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { resolveAppUrl } from "@/lib/env";
import { getTier, supportsVision, type ModelCandidate, type TierConfig } from "./models.config";

const providerKeys: Record<ModelCandidate["provider"], string | undefined> = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  groq: process.env.GROQ_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
};

export function isProviderConfigured(provider: ModelCandidate["provider"]) {
  return Boolean(providerKeys[provider]);
}

function instantiate(c: ModelCandidate): LanguageModelV2 {
  switch (c.provider) {
    case "anthropic":
      return createAnthropic({ apiKey: providerKeys.anthropic })(c.modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey: providerKeys.google })(c.modelId);
    case "groq":
      return createGroq({ apiKey: providerKeys.groq })(c.modelId);
    case "openrouter":
      return createOpenRouter({
        apiKey: providerKeys.openrouter,
        headers: { "HTTP-Referer": resolveAppUrl(), "X-Title": "Markethink" },
      }).chat(c.modelId) as unknown as LanguageModelV2;
  }
}

export interface RoutedModel {
  model: LanguageModelV2;
  /** Kandidat yang akhirnya menjawab (terisi setelah request berjalan). */
  resolved: () => ModelCandidate | null;
  candidates: ModelCandidate[];
}

/**
 * Model dengan fallback: mencoba kandidat berurutan. Error saat membuka
 * koneksi (rate limit 429, 5xx, model tidak tersedia) → lanjut ke kandidat berikutnya.
 */
export function createFallbackModel(candidates: ModelCandidate[]): RoutedModel {
  if (!candidates.length) {
    throw new Error("Tidak ada provider LLM yang dikonfigurasi. Isi minimal satu API key LLM di env.");
  }
  let used: ModelCandidate | null = null;

  async function attempt<T>(fn: (m: LanguageModelV2) => PromiseLike<T>): Promise<T> {
    const failures: string[] = [];
    for (const c of candidates) {
      try {
        const result = await fn(instantiate(c));
        used = c;
        return result;
      } catch (err) {
        if (isAbortError(err)) throw err;
        failures.push(`${c.provider}:${c.modelId} → ${errorMessage(err).slice(0, 400)}`);
        console.warn(`[model-router] ${c.provider}:${c.modelId} gagal, coba fallback`, errorMessage(err));
      }
    }
    throw new Error(`Semua model gagal: ${failures.join(" | ")}`);
  }

  const first = candidates[0];
  const model: LanguageModelV2 = {
    specificationVersion: "v2",
    provider: "markethink-router",
    modelId: `${first.provider}:${first.modelId}`,
    supportedUrls: {},
    doGenerate: (options) => attempt((m) => m.doGenerate(forModel(m, options))),
    doStream: (options) => attempt((m) => m.doStream(forModel(m, options))),
  };

  return { model, resolved: () => used, candidates };
}

export function routeTier(tierId: string | null | undefined, opts: { needsVision?: boolean } = {}) {
  const tier: TierConfig = getTier(tierId);
  let candidates = tier.candidates.filter((c) => isProviderConfigured(c.provider));
  if (opts.needsVision) {
    const vision = candidates.filter(supportsVision);
    if (vision.length) candidates = vision;
    else {
      // Tier ini tidak punya model vision — pinjam model vision dari tier lain.
      const anyVision = ["senior", "junior", "associate", "director"]
        .flatMap((t) => getTier(t).candidates)
        .filter((c) => supportsVision(c) && isProviderConfigured(c.provider));
      if (anyVision.length) candidates = [anyVision[0]];
    }
  }
  return { tier, ...createFallbackModel(candidates) };
}

/** Model Claude generasi terbaru menolak parameter sampling (temperature/topP/topK). */
function forModel(m: LanguageModelV2, options: LanguageModelV2CallOptions): LanguageModelV2CallOptions {
  if (!m.provider.startsWith("anthropic")) return options;
  return { ...options, temperature: undefined, topP: undefined, topK: undefined };
}

function isAbortError(err: unknown) {
  return err instanceof Error && (err.name === "AbortError" || err.name === "ResponseAborted");
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
