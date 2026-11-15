import "server-only";
import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractJson } from "@/lib/addons/json-output";
import { consumeCredits, creditsForUsd } from "@/lib/credits";
import { estimateCostUsd, type TierId } from "@/lib/ai/models.config";
import { createFallbackModel, isProviderConfigured } from "@/lib/ai/router";
import { buildReviewPrompt, reviewSchema, reviewerFor, tidyReview, type ReviewPart } from "@/lib/ai/team-review";

/**
 * Jalankan Pemeriksaan Tim (Kritikus + Pemeriksa Fakta) untuk satu hasil (chat atau Smart Tools).
 * Kredit dipotong sesuai biaya nyata (pilihan A); hasil yang gagal dibaca tidak dipotong. Tidak pernah melempar error.
 */
export async function runTeamReview(o: {
  admin: SupabaseClient;
  userId: string;
  tier: TierId;
  question: string;
  answer: string;
  sources?: { title?: string | null; url: string }[];
  brand?: string | null;
  userNotes?: string | null;
  outcomes?: string | null;
  en: boolean;
  /** Dicatat di usage_logs & credit_ledger. */
  chatId?: string | null;
  reason: string;
}): Promise<{ review: ReviewPart; remaining: number | null } | null> {
  const reviewer = reviewerFor(o.tier);
  if (!reviewer || !isProviderConfigured(reviewer.provider)) return null;
  const started = Date.now();
  const log = (row: Record<string, unknown>) =>
    o.admin.from("usage_logs").insert({
      user_id: o.userId,
      chat_id: o.chatId ?? null,
      tier: "review",
      provider: reviewer.provider,
      model: reviewer.modelId,
      latency_ms: Date.now() - started,
      ...row,
    });
  try {
    const { text, usage } = await generateText({
      model: createFallbackModel([reviewer]).model,
      maxOutputTokens: 3000,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(60_000),
      providerOptions: { anthropic: { effort: "low" } },
      prompt: buildReviewPrompt({
        question: o.question,
        answer: o.answer,
        sources: o.sources ?? [],
        brand: o.brand ?? null,
        userNotes: o.userNotes ?? null,
        outcomes: o.outcomes ?? null,
        en: o.en,
      }),
    });
    const parsed = reviewSchema.safeParse(tidyReview(extractJson(text)));
    const cost = estimateCostUsd(reviewer, usage.inputTokens ?? 0, usage.outputTokens ?? 0);
    const credits = parsed.success ? creditsForUsd(cost) : 0;
    let remaining: number | null = null;
    if (credits > 0) {
      const charged = await consumeCredits(o.userId, credits, o.reason, { chatId: o.chatId ?? null, tier: o.tier });
      remaining = charged.remaining;
    }
    await log({
      input_tokens: usage.inputTokens ?? 0,
      output_tokens: usage.outputTokens ?? 0,
      est_cost_usd: cost,
      credits,
      status: parsed.success ? "ok" : "error",
      error: parsed.success ? null : `hasil pemeriksaan tidak terbaca: ${parsed.error.issues[0]?.message ?? "?"}`.slice(0, 1000),
    });
    return parsed.success ? { review: { ...parsed.data, credits }, remaining } : null;
  } catch (err) {
    console.error("[team-review] gagal", err);
    await log({ credits: 0, status: "error", error: (err instanceof Error ? err.message : String(err)).slice(0, 1000) });
    return null;
  }
}
