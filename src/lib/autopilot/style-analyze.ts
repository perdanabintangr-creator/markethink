import "server-only";
import { generateText } from "ai";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractJson } from "@/lib/addons/json-output";
import { estimateCostUsd } from "@/lib/ai/models.config";
import { routeTier } from "@/lib/ai/router";
import { styleDnaSchema, type StyleDna } from "./style";
import { analyzePrompt } from "./style-prompt";

/**
 * Tahap 3: analisis referensi desain pelanggan (3–10 gambar) → DNA Gaya. AI vision membedah latar, huruf, tata letak,
 * gaya visual, ornamen, kepadatan teks. Warna aksen TIDAK diambil dari referensi (tetap warna Brand Kit).
 */

export interface AnalyzeResult {
  dna: StyleDna;
  analysis: string;
  limits: string | null;
}

export async function analyzeReferences(
  admin: SupabaseClient,
  o: { userId: string; images: { bytes: Buffer; mime: string }[]; feedback?: string | null; previous?: StyleDna | null; en?: boolean },
): Promise<AnalyzeResult> {
  const routed = routeTier("senior", { needsVision: true });
  const started = Date.now();
  const imgs = await Promise.all(o.images.map((im) => sharp(im.bytes).rotate().resize({ width: 900, height: 1125, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()));
  const { text, usage } = await generateText({
    model: routed.model,
    maxOutputTokens: 2500,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(120_000),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: analyzePrompt({ count: imgs.length, feedback: o.feedback, previous: o.previous, en: o.en }) },
          ...imgs.map((b) => ({ type: "image" as const, image: b, mediaType: "image/jpeg" })),
        ],
      },
    ],
  });
  const c = routed.resolved() ?? routed.candidates[0];
  const cost = estimateCostUsd(c, usage.inputTokens ?? 0, usage.outputTokens ?? 0);
  const raw = extractJson(text) as { dna?: unknown; analysis?: unknown; limits?: unknown } | null;
  const parsed = styleDnaSchema.safeParse(raw?.dna);
  await admin.from("usage_logs").insert({
    user_id: o.userId,
    tier: "autopilot-style",
    provider: c.provider,
    model: c.modelId,
    latency_ms: Date.now() - started,
    input_tokens: usage.inputTokens ?? 0,
    output_tokens: usage.outputTokens ?? 0,
    est_cost_usd: cost,
    credits: 0,
    status: parsed.success ? "ok" : "error",
    error: parsed.success ? null : `analisis gaya: ${parsed.error.issues[0]?.message ?? "?"}`.slice(0, 500),
  });
  if (!parsed.success) throw new Error("analysis_unreadable");
  return {
    dna: parsed.data,
    analysis: String(raw?.analysis ?? "").slice(0, 1200),
    limits: raw?.limits ? String(raw.limits).slice(0, 300) : null,
  };
}
