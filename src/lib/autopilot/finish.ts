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
import { generateSlideImage, pool, productRefs } from "./visuals";
import type { Look, Slide } from "./slides";
import type { ProductRow } from "./products";
import { buildDirectorPrompt, directorSchema, finalImagePrompt, selectJobs, type PostPlan } from "./director";
import { imageAspectFor, parseDna, visualPromptFor } from "./style";
import { latestResearch } from "./brand-research";
import { visualSubjectsBlock } from "./research-shape";
import { approvedDna } from "@/lib/brand/server";
import { getContentAccess } from "./content-access";
import { dnaBlock, visualGuide } from "@/lib/brand/dna";

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
  const dnaRow = await approvedDna(admin, userId, rows[0].workspace_id);
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
        voice: [voiceRules(brand.kit), dnaRow ? dnaBlock(dnaRow.dna, dnaRow.version) : null].filter(Boolean).join("\n\n") || null,
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
  if (!parsed.success) await admin.from("usage_logs").insert({ user_id: userId, tier: "autopilot-review", credits: 0, status: "error", error: `review tidak terbaca: ${JSON.stringify(parsed.error.issues.slice(0, 3)).slice(0, 600)}` });
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

/** Batas gambar slide isi per carousel (di luar cover) — ACC founder 21 Nov: Pro 3, Promax 5. */


type DirectorRow = Row & { visual_plan?: unknown };

/** Visual Director: rencana visual per slide untuk beberapa post sekaligus (1 panggilan AI). */
async function planVisuals(admin: SupabaseClient, userId: string, rows: DirectorRow[], ctx: { brandBlock: string; research: string | null; palette: { primary: string; secondary: string }; realPhotos: string[] }, products: Pick<ProductRow, "id" | "name" | "photo_paths">[]) {
  const routed = routeTier("senior");
  const started = Date.now();
  try {
    const out = await generateText({
      model: routed.model,
      maxOutputTokens: 9000,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(120_000),
      providerOptions: { anthropic: { effort: "low" } },
      prompt: buildDirectorPrompt({
        brandBlock: ctx.brandBlock,
        research: ctx.research,
        dna: parseDna(rows[0]?.style),
        palette: ctx.palette,
        posts: rows.map((r) => ({
          kind: r.kind,
          title: r.title,
          pillar: r.pillar,
          slides: r.slides,
          hasProductPhoto: Boolean(products.find((x) => x.id === r.product_id)?.photo_paths.length) || ctx.realPhotos.length > 0,
        })),
      }),
    });
    const c = routed.resolved() ?? routed.candidates[0];
    await admin.from("usage_logs").insert({ user_id: userId, tier: "autopilot-director", provider: c.provider, model: c.modelId, latency_ms: Date.now() - started, input_tokens: out.usage.inputTokens ?? 0, output_tokens: out.usage.outputTokens ?? 0, est_cost_usd: estimateCostUsd(c, out.usage.inputTokens ?? 0, out.usage.outputTokens ?? 0), credits: 0, status: "ok" });
    const parsed = directorSchema.safeParse(extractJson(out.text));
    if (!parsed.success) await admin.from("usage_logs").insert({ user_id: userId, tier: "autopilot-director", credits: 0, status: "error", error: `director: rencana tidak terbaca: ${JSON.stringify(parsed.error.issues.slice(0, 3)).slice(0, 600)}` });
    return parsed.success ? parsed.data.posts : [];
  } catch (err) {
    await admin.from("usage_logs").insert({ user_id: userId, tier: "autopilot-director", latency_ms: Date.now() - started, credits: 0, status: "error", error: `director: ${String(err).slice(0, 500)}` });
    return [];
  }
}

/**
 * Visual Director + pembuatan gambar BARU per slide terpilih (cover + slide isi paling visual sampai kuota paket).
 * Foto produk asli dipakai sebagai acuan bila slide menampilkan produk; talent dijaga konsisten dengan memakai
 * gambar orang pertama di carousel sebagai acuan. Gagal → slide tetap layout teks (tidak memakai foto lain).
 */
export async function directVisuals(admin: SupabaseClient, userId: string, rows: DirectorRow[], o: { innerCap: number; budgetMs: number }) {
  const started = Date.now();
  const targets = rows.filter((r) => r.design !== "classic" && r.kind !== "reel" && r.slides?.length);
  if (!targets.length) return [];
  const brand = await loadBrand(admin, userId, targets[0].workspace_id);
  // Panduan visual Designer (Brand DNA yang sudah di-ACC) ikut dibaca Visual Director.
  const dnaRow = await approvedDna(admin, userId, targets[0].workspace_id);
  const research = [visualSubjectsBlock(await latestResearch(admin, userId, targets[0].workspace_id)), dnaRow ? visualGuide(dnaRow.dna) : null].filter(Boolean).join("\n\n") || null;
  // Foto asli brand (onboarding) = acuan produk/tempat bila post tidak terkait SKU katalog.
  const { data: realRows } = targets[0].workspace_id
    ? await admin.from("brand_assets").select("storage_path").eq("user_id", userId).eq("workspace_id", targets[0].workspace_id).eq("kind", "real_photo").order("created_at").limit(10)
    : { data: [] as { storage_path: string }[] };
  const realPhotos = (realRows ?? []).map((x) => String(x.storage_path));
  const ids = targets.map((r) => r.product_id).filter(Boolean) as string[];
  const { data: prods } = ids.length ? await admin.from("brand_products").select("id, name, photo_paths").in("id", ids).eq("user_id", userId) : { data: [] };
  const products = (prods ?? []) as Pick<ProductRow, "id" | "name" | "photo_paths">[];
  const palette = { primary: brand.palette.royal, secondary: brand.palette.cyan };
  const brandBlock = brand.kit ? untrusted("brand_kit", formatBrandKit(brand.kit)) : "";

  // Rencana visual: 3 post per panggilan AI.
  const plans = new Map<string, PostPlan>();
  const chunks: DirectorRow[][] = [];
  for (let k = 0; k < targets.length; k += 3) chunks.push(targets.slice(k, k + 3));
  await Promise.all(
    chunks.map(async (chunk) => {
      const out = await planVisuals(admin, userId, chunk, { brandBlock, research, palette, realPhotos }, products);
      for (const p of out) if (chunk[p.post]) plans.set(chunk[p.post].id, p);
    }),
  );
  await Promise.all([...plans.entries()].map(([id, plan]) => admin.from("social_posts").update({ visual_plan: plan }).eq("id", id).eq("user_id", userId)));

  // Gambar: antar-post paralel (3), dalam satu post berurutan (talent konsisten lewat acuan).
  const results: { postId: string; slide: number; ok: boolean }[] = [];
  await pool(
    targets.filter((r) => plans.has(r.id)),
    3,
    async (r) => {
      const plan = plans.get(r.id)!;
      const dna = parseDna(r.style);
      const full = !dna || dna.hero === "full" || dna.bg === "photo";
      const jobs = selectJobs(plan, { innerCap: r.kind === "carousel" ? o.innerCap : 0, slideTypes: r.slides.map((s) => s.type) });
      const prod = products.find((x) => x.id === r.product_id) ?? null;
      // Foto SKU katalog diutamakan; tanpa SKU → foto asli brand dari onboarding (bergiliran per post).
      const shift = targets.indexOf(r) * 2;
      const realPick = realPhotos.length ? [realPhotos[shift % realPhotos.length], realPhotos[(shift + 1) % realPhotos.length]] : [];
      const prodRefs = prod?.photo_paths.length ? await productRefs(admin, userId, prod.photo_paths) : realPick.length ? await productRefs(admin, userId, [...new Set(realPick)]) : [];
      for (const job of jobs) {
        if (Date.now() - started > o.budgetMs) break;
        // Acuan hanya untuk foto produk asli. Acuan talent membuat AI menyalin komposisi (uji 21 Nov: slide kembar,
        // biaya 2×), jadi konsistensi talent dijaga lewat "bible" teks yang ditulis ulang di setiap prompt.
        const refs = job.plan.use_product_photo ? prodRefs.slice(0, 2) : [];
        const base = finalImagePrompt({ plan: job.plan, bible: plan.bible, dna, palette, productName: prod?.name ?? null });
        // Cover gaya studio (glossy/bold): subjek terisolasi di latar gaya; selain itu layar penuh 4:5.
        const coverIsolated = job.cover && !full && dna;
        const prompt = coverIsolated ? visualPromptFor(dna, `${job.plan.image_prompt} (${plan.bible})`, { primary: palette.primary, accent: palette.secondary }) : base;
        const img = await generateSlideImage(admin, {
          userId,
          postId: r.id,
          slide: job.slide,
          prompt,
          aspect: coverIsolated ? imageAspectFor(dna) : "4:5",
          refs,
          subject: job.plan.subject_type ?? null,
          timeoutMs: 75_000,
        });
        results.push({ postId: r.id, slide: job.slide, ok: Boolean(img) });
        if (!img) continue;
        // Pasang gambar ke slide terbaru (mungkin sudah diperbaiki tim senior).
        const { data: cur } = await admin.from("social_posts").select("slides").eq("id", r.id).single();
        const sl = ((cur?.slides as Slide[]) ?? r.slides).slice();
        const k = job.slide - 1;
        if (sl[k]) sl[k] = { ...sl[k], image: img.path, visual: job.plan.scene ?? sl[k].visual, textZone: job.plan.text_safe_zone === "top-35%" ? "top" : "bottom" };
        // updated_at ikut berubah → URL pratinjau berganti, cache browser lama tidak dipakai lagi.
        await admin.from("social_posts").update({ slides: sl, updated_at: new Date().toISOString() }).eq("id", r.id).eq("user_id", userId);
      }
    },
  );
  return results;
}

async function visuals(admin: SupabaseClient, userId: string, batchId: string, budgetMs: number) {
  const { data } = await admin.from("social_posts").select("id, user_id, workspace_id, kind, design, style, product_id, pillar, title, slides, caption, script, status").eq("user_id", userId).eq("batch_id", batchId);
  const { data: prof } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  // Visual isi per carousel mengikuti paket Autopilot Konten (Lite/Pro 2, Bisnis 4, admin 5).
  const cap = (await getContentAccess(admin, userId, prof?.role as string | null))?.innerVisuals ?? 0;
  await directVisuals(admin, userId, (data ?? []) as DirectorRow[], { innerCap: cap, budgetMs });
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
