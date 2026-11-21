import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { extractJson } from "@/lib/addons/json-output";
import { estimateCostUsd } from "@/lib/ai/models.config";
import { routeTier } from "@/lib/ai/router";
import { formatBrandKit, untrusted } from "@/lib/ai/prompt";
import { loadBrand } from "./generate";
import { buildTeamReviewPrompt, mergeFixedSlides, reviewSchema } from "./review";
import { capHashtags, brandHashtag, fixCaption, lintCaption, lintSlides } from "./lint";
import { brandKeywordsOf, voiceRules } from "./voice";
import { createVisual, pool } from "./visuals";
import { isHero, type Look, type Slide } from "./slides";
import { IMAGE_SLIDE_TYPES } from "./render";
import type { ProductRow } from "./products";

interface Row {
  id: string;
  user_id: string;
  workspace_id: string | null;
  kind: "carousel" | "image" | "reel";
  design: Look;
  style: unknown;
  product_id: string | null;
  pillar: string | null;
  title: string;
  slides: Slide[];
  caption: string;
  script: string | null;
  status: string;
}

/** Tim senior memeriksa & memperbaiki draf satu batch, lalu skor + catatan disimpan di `team_review`. */
async function teamReview(admin: SupabaseClient, userId: string, rows: Row[], lang: "id" | "en") {
  if (!rows.length) return;
  const brand = await loadBrand(admin, userId, rows[0].workspace_id);
  const routed = routeTier("senior");
  const started = Date.now();
  let text = "";
  try {
    const out = await generateText({
      model: routed.model,
      maxOutputTokens: 12_000,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(150_000),
      providerOptions: { anthropic: { effort: "low" } },
      prompt: buildTeamReviewPrompt({
        brandBlock: brand.kit ? untrusted("brand_kit", formatBrandKit(brand.kit)) : "",
        voice: voiceRules(brand.kit),
        catalog: null,
        posts: rows.map((r) => ({ kind: r.kind, pillar: r.pillar, title: r.title, slides: r.slides, caption: r.caption, script: r.script })),
        en: lang === "en",
      }),
    });
    text = out.text;
    const c = routed.resolved() ?? routed.candidates[0];
    await admin.from("usage_logs").insert({ user_id: userId, tier: "autopilot-review", provider: c.provider, model: c.modelId, latency_ms: Date.now() - started, input_tokens: out.usage.inputTokens ?? 0, output_tokens: out.usage.outputTokens ?? 0, est_cost_usd: estimateCostUsd(c, out.usage.inputTokens ?? 0, out.usage.outputTokens ?? 0), credits: 0, status: "ok" });
  } catch (err) {
    await admin.from("usage_logs").insert({ user_id: userId, tier: "autopilot-review", latency_ms: Date.now() - started, credits: 0, status: "error", error: `review: ${String(err).slice(0, 500)}` });
    await Promise.all(rows.map((r) => admin.from("social_posts").update({ team_review: { skipped: true } }).eq("id", r.id).eq("user_id", userId)));
    return;
  }
  const parsed = reviewSchema.safeParse(extractJson(text));
  const reviews = parsed.success ? parsed.data.reviews : [];
  const keywords = brandKeywordsOf(brand.kit);
  const tag = brandHashtag(brand.palette.name);
  const at = new Date().toISOString();
  await Promise.all(
    rows.map(async (r, i) => {
      const rv = reviews.find((x) => x.i === i);
      if (!rv) return admin.from("social_posts").update({ team_review: { skipped: true } }).eq("id", r.id).eq("user_id", userId);
      // Hanya draf yang belum disentuh pelanggan yang diperbaiki otomatis.
      const fix = r.status === "draft" ? rv.fix : null;
      const patch: Record<string, unknown> = { team_review: { score: rv.score, issues: rv.issues, fixed: Boolean(fix), at }, updated_at: at };
      if (fix) {
        const slides = r.kind === "reel" ? r.slides : mergeFixedSlides(r.slides, fix.slides);
        const caption = fix.caption ? capHashtags(fixCaption(fix.caption), tag) : r.caption;
        const c = lintCaption(caption, { brandName: brand.palette.name, keywords, forbidden: brand.kit?.voice_dont });
        const s = lintSlides(slides, r.kind, brand.kit?.voice_dont);
        Object.assign(patch, { slides, caption, lint: { fails: [...c.fails, ...s.fails], warns: [...c.warns, ...s.warns] } });
        if (fix.script && r.kind === "reel") patch.script = fixCaption(fix.script);
      }
      return admin.from("social_posts").update(patch).eq("id", r.id).eq("user_id", userId);
    }),
  );
}

/** Batas visual slide isi per carousel (di luar cover) — biaya gambar terkendali. */
export const INNER_VISUALS: Record<string, number> = { pro: 3, promax: 5, admin: 5 };

/**
 * Visual AI: cover gaya studio (foto produk asli bila ada) + slide isi yang diberi "visual" oleh copywriter
 * (tampil layar penuh ±80%). Cover dulu, lalu slide isi sampai batas paket.
 */
async function visuals(admin: SupabaseClient, userId: string, batchId: string, budgetMs: number) {
  const started = Date.now();
  const { data } = await admin.from("social_posts").select("id, workspace_id, kind, design, style, slides, product_id").eq("user_id", userId).eq("batch_id", batchId);
  const rows = (data ?? []) as Row[];
  if (!rows.length) return;
  const { data: prof } = await admin.from("profiles").select("plan_id, role").eq("id", userId).maybeSingle();
  const cap = prof?.role === "admin" ? INNER_VISUALS.admin : (INNER_VISUALS[String(prof?.plan_id)] ?? 0);
  const brand = await loadBrand(admin, userId, rows[0].workspace_id);
  const ids = rows.map((r) => r.product_id).filter(Boolean) as string[];
  const { data: prods } = ids.length ? await admin.from("brand_products").select("id, name, photo_paths").in("id", ids).eq("user_id", userId) : { data: [] };
  const products = (prods ?? []) as Pick<ProductRow, "id" | "name" | "photo_paths">[];

  type Job = { r: Row; k: number; cover: boolean };
  const jobs: Job[] = [];
  for (const r of rows) {
    if (r.design === "classic" || r.kind === "reel") continue;
    const sl = r.slides ?? [];
    const prod = products.find((x) => x.id === r.product_id);
    if (sl[0] && isHero(sl[0], 0) && !sl[0].image && (sl[0].visual || prod?.photo_paths.length)) jobs.push({ r, k: 0, cover: true });
  }
  for (const r of rows) {
    if (r.design === "classic" || r.kind !== "carousel") continue;
    let n = 0;
    (r.slides ?? []).forEach((s, k) => {
      if (k > 0 && n < cap && s.visual && !s.image && IMAGE_SLIDE_TYPES.has(s.type)) {
        jobs.push({ r, k, cover: false });
        n++;
      }
    });
  }
  // Satu penulis per post agar slide tidak saling menimpa.
  const locks = new Map<string, Promise<unknown>>();
  await pool(jobs, 4, async ({ r, k, cover }) => {
    if (Date.now() - started > budgetMs) return;
    const prod = cover ? (products.find((x) => x.id === r.product_id) ?? null) : null;
    const path = await createVisual(admin, {
      userId,
      postId: r.id,
      look: r.design,
      visual: r.slides[k].visual || `${prod?.name ?? "product"} hero shot`,
      brand: brand.palette,
      style: r.style,
      product: prod?.photo_paths.length ? prod : null,
      frame: cover ? "cover" : "slide",
      timeoutMs: 60_000,
    });
    if (!path) return;
    const prev = locks.get(r.id) ?? Promise.resolve();
    const next = prev.then(async () => {
      // Ambil slide terbaru (mungkin sudah diperbaiki tim senior) lalu pasang visual.
      const { data: cur } = await admin.from("social_posts").select("slides").eq("id", r.id).single();
      const sl = ((cur?.slides as Slide[]) ?? r.slides).slice();
      if (sl[k]) sl[k] = { ...sl[k], image: path };
      // updated_at ikut berubah → URL pratinjau berganti, cache browser lama tidak dipakai lagi.
      await admin.from("social_posts").update({ slides: sl, updated_at: new Date().toISOString() }).eq("id", r.id).eq("user_id", userId);
    });
    locks.set(r.id, next);
    await next;
  });
}

/** Tahap akhir satu batch: tim senior memeriksa (bila paket mendukung), lalu visual dibuat. */
export async function finishBatch(admin: SupabaseClient, userId: string, batchId: string) {
  const started = Date.now();
  const { data: p } = await admin.from("profiles").select("language").eq("id", userId).maybeSingle();
  const { data } = await admin
    .from("social_posts")
    .select("id, user_id, workspace_id, kind, design, style, product_id, pillar, title, slides, caption, script, status")
    .eq("user_id", userId)
    .eq("batch_id", batchId)
    .is("team_review", null);
  const rows = (data ?? []) as Row[];
  // Dibagi per 5 post agar pemeriksaan cepat & detail.
  const chunks: Row[][] = [];
  for (let k = 0; k < rows.length; k += 5) chunks.push(rows.slice(k, k + 5));
  await Promise.all(chunks.map((c) => teamReview(admin, userId, c, (p?.language as "id" | "en") ?? "id")));
  await visuals(admin, userId, batchId, Math.max(60_000, 270_000 - (Date.now() - started)));
}
