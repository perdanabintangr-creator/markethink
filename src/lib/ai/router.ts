import "server-only";
import type { LanguageModelV2, LanguageModelV2CallOptions } from "@ai-sdk/provider";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { resolveAppUrl } from "@/lib/env";
import { cleanKey } from "./image";
import { getTier, supportsVision, type ModelCandidate, type TierConfig } from "./models.config";

const providerKeys: Record<ModelCandidate["provider"], string | undefined> = {
  anthropic: cleanKey(process.env.ANTHROPIC_API_KEY),
  google: cleanKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
  groq: cleanKey(process.env.GROQ_API_KEY),
  openrouter: cleanKey(process.env.OPENROUTER_API_KEY),
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
  /** Pesan error bila jawaban terpaksa dibuat tanpa tool (mis. web search ditolak). */
  toolFallback: () => string | null;
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
  let toolFallback: string | null = null;

  async function attempt<T>(
    options: LanguageModelV2CallOptions,
    fn: (m: LanguageModelV2, o: LanguageModelV2CallOptions) => PromiseLike<T>,
  ): Promise<T> {
    const failures: string[] = [];
    for (const c of candidates) {
      const m = instantiate(c);
      const opts = forModel(m, options);
      try {
        const result = await fn(m, opts);
        used = c;
        return result;
      } catch (err) {
        if (isAbortError(err)) throw err;
        failures.push(`${c.provider}:${c.modelId} → ${errorMessage(err).slice(0, 400)}`);
        console.warn(`[model-router] ${c.provider}:${c.modelId} gagal`, errorMessage(err));
        // Bila gagal saat membawa tool bawaan provider (mis. web search belum diizinkan), coba model
        // yang sama tanpa tool itu — tool buatan kita (gambar, PPT) tetap dipertahankan.
        const custom = opts.tools?.filter((t) => t.type !== "provider-defined") ?? [];
        if (opts.tools?.length && custom.length < opts.tools.length) {
          try {
            const result = await fn(m, {
              ...opts,
              tools: custom.length ? custom : undefined,
              toolChoice: custom.length ? opts.toolChoice : undefined,
            });
            used = c;
            toolFallback = errorMessage(err).slice(0, 300);
            return result;
          } catch (err2) {
            if (isAbortError(err2)) throw err2;
            failures.push(`${c.provider}:${c.modelId} (tanpa tool) → ${errorMessage(err2).slice(0, 300)}`);
          }
        }
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
    doGenerate: (options) => attempt(options, (m, o) => m.doGenerate(o)),
    doStream: (options) => attempt(options, (m, o) => m.doStream(o)),
  };

  return { model, resolved: () => used, toolFallback: () => toolFallback, candidates };
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

/**
 * Sesuaikan opsi per provider: model Claude terbaru menolak parameter sampling;
 * provider lain tidak mengenal tool bawaan Anthropic (mis. web search) → dibuang.
 */
function forModel(m: LanguageModelV2, options: LanguageModelV2CallOptions): LanguageModelV2CallOptions {
  if (m.provider.startsWith("anthropic")) {
    return { ...options, temperature: undefined, topP: undefined, topK: undefined };
  }
  if (!options.tools?.length) return options;
  const tools = options.tools.filter((t) => !(t.type === "provider-defined" && t.id.startsWith("anthropic.")));
  return { ...options, tools: tools.length ? tools : undefined, toolChoice: tools.length ? options.toolChoice : undefined };
}

function isAbortError(err: unknown) {
  return err instanceof Error && (err.name === "AbortError" || err.name === "ResponseAborted");
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}
