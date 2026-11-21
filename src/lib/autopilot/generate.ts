import "server-only";
import { randomUUID } from "crypto";
import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractJson } from "@/lib/addons/json-output";
import { estimateCostUsd } from "@/lib/ai/models.config";
import { routeTier } from "@/lib/ai/router";
import { formatBrandKit, untrusted, type BrandKit } from "@/lib/ai/prompt";
import { marketContext } from "@/lib/ai/market-id";
import { formatOutcomes, type OutcomeRow } from "@/lib/ai/outcomes";
import { brandHashtag } from "./lint";
import { tidyPost } from "./tidy";
import { brandKeywordsOf, voiceRules } from "./voice";
import { summarizePerformance, type MediaStat } from "./performance";
import { brandPalette, type SlideBrand } from "./slides";
import { addDays, buildGeneratePrompt, buildIdeasPrompt, formatMix, generatedWeekSchema, ideasWeekSchema, pickLook, planSlots, todayWib, type Idea } from "./plan";
import type { Look } from "./slides";
import { strategyBlock } from "./strategy";
import { latestResearch } from "./brand-research";
import { visualSubjectsBlock } from "./research-shape";
import { resolveAppUrl } from "@/lib/env";
import { activeStyle } from "./styles-server";
import { baseOf, styleNote } from "./style";
import { catalogBlock, type ProductRow } from "./products";
import { autopilotAllowance, monthStartWib } from "./quota";
import { approvedDna, brandGate } from "@/lib/brand/server";
import { dnaBlock } from "@/lib/brand/dna";

export interface AutopilotSettings {
  user_id: string;
  workspace_id: string | null;
  enabled: boolean;
  cadence: "weekly" | "monthly";
  posts_per_week: number;
  slot_times: string[];
  focus: string | null;
  design: "auto" | Look;
  generating_at: string | null;
  last_generated_at: string | null;
}

export interface LoadedBrand {
  kit: (BrandKit & { brand_name?: string }) | null;
  palette: SlideBrand;
  logo: { bytes: Buffer; mime: string } | null;
  /** Akun @marqthink.ai memakai logo Marqthink bawaan. */
  marqthinkLogo: boolean;
}

/** Brand Kit + logo untuk generator & render (hanya project milik user; logo hanya dari folder user sendiri). */
export async function loadBrand(admin: SupabaseClient, userId: string, workspaceId: string | null, fallbackName?: string | null): Promise<LoadedBrand> {
  let kit: (BrandKit & { brand_name?: string }) | null = null;
  if (workspaceId) {
    const { data: ws } = await admin.from("workspaces").select("name, brand_kit").eq("id", workspaceId).eq("user_id", userId).maybeSingle();
    if (ws) kit = { brand_name: ws.name as string, ...((ws.brand_kit ?? {}) as BrandKit) };
  }
  const palette = brandPalette({
    name: kit?.brand_name ?? fallbackName ?? null,
    handle: kit?.social_handle ?? null,
    primary: kit?.color_primary ?? null,
    secondary: kit?.color_secondary ?? null,
  });
  let logo: LoadedBrand["logo"] = null;
  if (kit?.logo_id && /^[0-9a-f-]{36}$/i.test(kit.logo_id)) {
    const { data: att } = await admin.from("attachments").select("storage_path, mime").eq("id", kit.logo_id).eq("user_id", userId).maybeSingle();
    const p = String(att?.storage_path ?? "");
    if (p.startsWith(`${userId}/`) && !p.includes("..")) {
      const { data: file } = await admin.storage.from("uploads").download(p);
      if (file) logo = { bytes: Buffer.from(await file.arrayBuffer()), mime: String(att?.mime ?? file.type ?? "image/png") };
    }
  }
  const marqthinkLogo = !logo && /^@?marqthink(\.ai)?$/i.test(palette.handle.replace(/^@/, ""));
  return { kit, palette, logo, marqthinkLogo };
}

/** Tanggal terakhir yang sudah terisi konten (selain yang ditolak). */
export async function plannedUntil(admin: SupabaseClient, userId: string) {
  const { data } = await admin
    .from("social_posts")
    .select("post_date")
    .eq("user_id", userId)
    .neq("status", "rejected")
    .order("post_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.post_date as string | undefined) ?? null;
}

/** Jumlah post yang sudah dibuat bulan ini (WIB) — untuk jatah paket. */
export async function postsThisMonth(admin: SupabaseClient, userId: string) {
  const { count } = await admin
    .from("social_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStartWib().toISOString());
  return count ?? 0;
}

export type GenerateError = "plan" | "quota" | "busy" | "no_slots" | "ai" | "parse" | "no_ideas" | "no_brand" | "onboarding" | "dna_not_approved";
export type GenerateResult =
  | { ok: true; created: number; ideas: number; stage: "ideas" | "posts"; start: string; batchId: string }
  | { ok: false; error: GenerateError; detail?: string };

interface GenOpts {
  userId: string;
  planId: string;
  role: string;
  language: "id" | "en";
  fullName?: string | null;
  start?: string;
  source: "manual" | "cron";
  /** Internal (uji lab): jumlah post & lewati tinjau ide. */
  count?: number;
  skipIdeaReview?: boolean;
}

type SettingsRow = AutopilotSettings & {
  style_id?: string | null;
  style_preset?: string | null;
  goal?: string | null;
  pillar_mix?: unknown;
  review_ideas?: boolean;
};

async function loadSettings(admin: SupabaseClient, userId: string): Promise<SettingsRow> {
  const { data } = await admin.from("autopilot_settings").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data as SettingsRow;
  await admin.from("autopilot_settings").insert({ user_id: userId });
  return { user_id: userId, workspace_id: null, enabled: false, cadence: "weekly", posts_per_week: 7, slot_times: ["12:00", "19:00"], focus: null, design: "auto", generating_at: null, last_generated_at: null };
}

/** Kunci per user (kedaluwarsa 6 menit bila proses mati). */
async function claim(admin: SupabaseClient, userId: string) {
  const stale = new Date(Date.now() - 6 * 60_000).toISOString();
  const { data } = await admin
    .from("autopilot_settings")
    .update({ generating_at: new Date().toISOString() })
    .eq("user_id", userId)
    .or(`generating_at.is.null,generating_at.lt.${stale}`)
    .select("user_id");
  return Boolean(data?.length);
}
const releaseLock = (admin: SupabaseClient, userId: string, extra: Record<string, unknown> = {}) =>
  admin.from("autopilot_settings").update({ generating_at: null, updated_at: new Date().toISOString(), ...extra }).eq("user_id", userId);

/** Semua konteks brand untuk strategist & penulis. */
async function loadContext(admin: SupabaseClient, o: GenOpts, settings: SettingsRow, start: string) {
  const brand = await loadBrand(admin, o.userId, settings.workspace_id, o.fullName);
  const { data: existing } = await admin
    .from("social_posts")
    .select("post_date, post_time, title")
    .eq("user_id", o.userId)
    .neq("status", "rejected")
    .gte("post_date", addDays(start, -21))
    .lte("post_date", addDays(start, 6));
  const { data: outcomeRows } = await (settings.workspace_id
    ? admin.from("strategy_outcomes").select("result, topic, note, created_at").eq("user_id", o.userId).eq("workspace_id", settings.workspace_id)
    : admin.from("strategy_outcomes").select("result, topic, note, created_at").eq("user_id", o.userId).is("workspace_id", null)
  )
    .order("created_at", { ascending: false })
    .limit(8);

  // Belajar dari performa: statistik post Instagram 30 hari (bila akun terhubung & tersinkron).
  const { data: statRows } = await admin
    .from("instagram_media_stats")
    .select("ig_media_id, post_id, posted_at, media_type, caption, likes, comments, reach, saved, shares, views")
    .eq("user_id", o.userId)
    .gte("posted_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
    .limit(60);
  const linkedIds = (statRows ?? []).map((r) => r.post_id).filter(Boolean) as string[];
  const { data: linkedPosts } = linkedIds.length
    ? await admin.from("social_posts").select("id, title, pillar, design, kind").in("id", linkedIds)
    : { data: [] as { id: string; title: string; pillar: string | null; design: string | null; kind: string }[] };
  const meta = new Map((linkedPosts ?? []).map((p) => [p.id as string, p]));
  const performance = summarizePerformance(
    (statRows ?? []).map((r) => {
      const m = r.post_id ? meta.get(r.post_id as string) : undefined;
      return { ...(r as unknown as MediaStat), title: m?.title ?? null, pillar: m?.pillar ?? null, design: m?.design ?? null, kind: m?.kind ?? null };
    }),
  );

  // DNA Gaya pilihan (industri / referensi) → semua post memakai gaya itu.
  const dna = await activeStyle(admin, o.userId, settings);

  // Katalog produk (SKU): rotasi adil — produk yang jarang tampil 30 hari terakhir diprioritaskan.
  const { data: productRows } = await (settings.workspace_id
    ? admin.from("brand_products").select("id, name, sku, price, description, photo_paths, active").eq("user_id", o.userId).or(`workspace_id.eq.${settings.workspace_id},workspace_id.is.null`)
    : admin.from("brand_products").select("id, name, sku, price, description, photo_paths, active").eq("user_id", o.userId)
  )
    .eq("active", true)
    .limit(200);
  const products = (productRows ?? []) as ProductRow[];
  const featured = new Map<string, { n: number; last: string }>();
  if (products.length) {
    const { data: used } = await admin
      .from("social_posts")
      .select("product_id, post_date")
      .eq("user_id", o.userId)
      .not("product_id", "is", null)
      .neq("status", "rejected")
      .gte("post_date", addDays(start, -30));
    for (const u of used ?? []) {
      const f = featured.get(u.product_id as string) ?? { n: 0, last: "" };
      featured.set(u.product_id as string, { n: f.n + 1, last: String(u.post_date) > f.last ? String(u.post_date) : f.last });
    }
  }

  // Brand DNA (sudah di-ACC) → dibaca semua agen; versi dicatat di setiap post.
  const brandDna = await approvedDna(admin, o.userId, settings.workspace_id);

  const brandName = brand.palette.name;
  const base = {
    brandBlock: brand.kit ? untrusted("brand_kit", formatBrandKit(brand.kit)) : "",
    brandName,
    handle: brand.palette.handle,
    brandTag: brandHashtag(brandName),
    recentTitles: (existing ?? []).filter((r) => String(r.post_date) < start).map((r) => String(r.title)).slice(0, 30),
    market: marketContext(new Date(`${start}T05:00:00Z`), 21),
    outcomes: formatOutcomes((outcomeRows ?? []) as OutcomeRow[]) || null,
    performance,
    voice: voiceRules(brand.kit),
    style: dna ? styleNote(dna) : null,
    catalog: catalogBlock(products, featured),
    research: visualSubjectsBlock(await latestResearch(admin, o.userId, settings.workspace_id)),
    brandDna: brandDna ? dnaBlock(brandDna.dna, brandDna.version) : null,
    focus: settings.focus ? untrusted("fokus_pemilik_brand", settings.focus) : null,
    en: o.language === "en",
  };
  return { brand, existing: existing ?? [], dna, products, base, dnaVersion: brandDna?.version ?? null };
}
type Ctx = Awaited<ReturnType<typeof loadContext>>;

async function callModel(admin: SupabaseClient, userId: string, tier: string, prompt: string, maxOutputTokens: number, timeoutMs: number) {
  const routed = routeTier("senior");
  const started = Date.now();
  try {
    const { text, usage } = await generateText({
      model: routed.model,
      maxOutputTokens,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(timeoutMs),
      providerOptions: { anthropic: { effort: "medium" } },
      prompt,
    });
    const c = routed.resolved() ?? routed.candidates[0];
    await admin.from("usage_logs").insert({
      user_id: userId,
      tier,
      provider: c.provider,
      model: c.modelId,
      latency_ms: Date.now() - started,
      input_tokens: usage.inputTokens ?? 0,
      output_tokens: usage.outputTokens ?? 0,
      est_cost_usd: estimateCostUsd(c, usage.inputTokens ?? 0, usage.outputTokens ?? 0),
      credits: 0,
      status: "ok",
    });
    return text;
  } catch (err) {
    const c = routed.resolved() ?? routed.candidates[0];
    await admin.from("usage_logs").insert({ user_id: userId, tier, provider: c?.provider ?? null, model: c?.modelId ?? null, latency_ms: Date.now() - started, credits: 0, status: "error", error: `${tier}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 1000) });
    throw err;
  }
}

/** Tahap 1 — strategist: rencana ide untuk slot. */
async function planIdeas(admin: SupabaseClient, o: GenOpts, settings: SettingsRow, ctx: Ctx, slots: { date: string; time: string }[], extra: { replaceNote?: string | null; keep?: Idea[] } = {}) {
  const prompt = buildIdeasPrompt({
    ...ctx.base,
    slots,
    mix: formatMix(slots.length),
    strategy: strategyBlock(settings.goal, settings.pillar_mix, slots.length),
    ...extra,
  });
  const text = await callModel(admin, o.userId, "autopilot-strategy", prompt, 6000, 90_000);
  const parsed = ideasWeekSchema.safeParse(extractJson(text));
  if (!parsed.success) return null;
  const free = [...slots];
  const take = (i: Idea) => {
    const k = free.findIndex((s) => s.date === i.date && s.time === i.time);
    return k >= 0 ? free.splice(k, 1)[0] : free.shift();
  };
  return parsed.data.ideas
    .map((i) => ({ i, slot: take(i) }))
    .filter((x): x is { i: Idea; slot: { date: string; time: string } } => !!x.slot)
    .map(({ i, slot }) => ({ ...i, date: slot.date, time: slot.time, product_id: i.product_id && ctx.products.some((p) => p.id === i.product_id) ? i.product_id : null }));
}

/** Tahap 2 — copywriter: tulis post dari ide (dibagi beberapa bagian paralel supaya cepat). */
async function writeFromIdeas(admin: SupabaseClient, o: GenOpts, settings: SettingsRow, ctx: Ctx, ideas: (Idea & { id?: string })[], batchId: string) {
  const chunks: (Idea & { id?: string })[][] = [];
  for (let k = 0; k < ideas.length; k += 4) chunks.push(ideas.slice(k, k + 4));
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const prompt = buildGeneratePrompt({ ...ctx.base, slots: chunk.map((i) => ({ date: i.date, time: i.time })), mix: formatMix(chunk.length), ideas: chunk });
      try {
        const text = await callModel(admin, o.userId, "autopilot", prompt, 14_000, 200_000);
        const parsed = generatedWeekSchema.safeParse(extractJson(text));
        return parsed.success ? parsed.data.posts : [];
      } catch {
        return [];
      }
    }),
  );
  const keywords = brandKeywordsOf(ctx.brand.kit);
  const brandName = ctx.brand.palette.name;
  const rows: Record<string, unknown>[] = [];
  const writtenIdeaIds: string[] = [];
  results.forEach((posts, c) => {
    const chunk = chunks[c];
    const free = [...chunk];
    for (const p of posts) {
      const k = free.findIndex((i) => i.date === p.date && i.time === p.time);
      const idea = k >= 0 ? free.splice(k, 1)[0] : free.shift();
      if (!idea) continue;
      const t = tidyPost(p, brandName, keywords, ctx.brand.kit?.voice_dont);
      const kind = p.kind;
      const design = ctx.dna && kind !== "reel" ? baseOf(ctx.dna) : pickLook(settings.design ?? "auto", p.design, rows.length, kind);
      const productId = idea.product_id ?? (p.product_id && ctx.products.some((x) => x.id === p.product_id) ? p.product_id : null);
      if (idea.id) writtenIdeaIds.push(idea.id);
      rows.push({
        user_id: o.userId,
        workspace_id: settings.workspace_id,
        batch_id: batchId,
        post_date: idea.date,
        post_time: idea.time,
        kind,
        design,
        style: ctx.dna && kind !== "reel" ? ctx.dna : null,
        product_id: productId,
        title: (p.title || idea.title).slice(0, 160),
        pillar: idea.pillar ?? p.pillar ?? null,
        funnel: idea.funnel ?? p.funnel ?? null,
        slides: t.slides,
        caption: t.caption,
        alt_text: t.alt_text,
        script: t.script,
        note: [idea.angle ? `Sudut: ${idea.angle}` : "", idea.why ? `Strategi: ${idea.why}` : "", p.hook || idea.hook ? `Hook: ${p.hook || idea.hook}` : "", p.note ?? ""].filter(Boolean).join("\n").slice(0, 600) || null,
        lint: t.lint,
        status: "draft",
        brand_dna_version: ctx.dnaVersion,
      });
    }
  });
  if (!rows.length) return { created: 0, writtenIdeaIds };
  const { error } = await admin.from("social_posts").insert(rows);
  if (error) throw error;
  if (writtenIdeaIds.length) await admin.from("autopilot_ideas").update({ status: "written", updated_at: new Date().toISOString() }).in("id", writtenIdeaIds).eq("user_id", o.userId);
  return { created: rows.length, writtenIdeaIds };
}

/** Jalankan tahap akhir (pemeriksaan tim senior + visual AI) di request terpisah supaya tidak kehabisan waktu. */
async function triggerFinish(admin: SupabaseClient, userId: string, batchId: string) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    const { finishBatch } = await import("./finish");
    await finishBatch(admin, userId, batchId);
    return;
  }
  await fetch(`${resolveAppUrl()}/api/cron/autopilot/finish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ userId, batchId }),
    signal: AbortSignal.timeout(2500),
  }).catch(() => null);
}

/**
 * Buat konten SATU minggu: strategist menyusun ide → (bila "tinjau ide" aktif: berhenti, menunggu pelanggan) →
 * copywriter menulis → tim senior memeriksa & visual dibuat di latar belakang. Tidak melempar error.
 */
export async function generateWeek(admin: SupabaseClient, o: GenOpts): Promise<GenerateResult> {
  const allowance = autopilotAllowance(o.planId, o.role);
  if (!allowance) return { ok: false, error: "plan" };
  const settings = await loadSettings(admin, o.userId);
  const gate = await brandGate(admin, o.userId, settings.workspace_id);
  if (gate) return { ok: false, error: gate };
  const room = allowance.postsPerMonth - (await postsThisMonth(admin, o.userId));
  const count = Math.min(o.count ?? settings.posts_per_week, allowance.postsPerWeek, room);
  if (count <= 0) return { ok: false, error: "quota" };
  if (!(await claim(admin, o.userId))) return { ok: false, error: "busy" };

  try {
    const today = todayWib();
    const tomorrow = addDays(today, 1);
    // Ide yang masih menunggu ditinjau juga menempati slot.
    const { data: pendingIdeas } = await admin.from("autopilot_ideas").select("post_date, post_time").eq("user_id", o.userId).eq("status", "pending");
    const lastPost = await plannedUntil(admin, o.userId);
    const lastIdea = (pendingIdeas ?? []).map((r) => String(r.post_date)).sort().pop() ?? null;
    const last = [lastPost, lastIdea].filter(Boolean).sort().pop() ?? null;
    const start = o.start && o.start >= tomorrow ? o.start : last && addDays(last, 1) > tomorrow ? addDays(last, 1) : tomorrow;

    const ctx = await loadContext(admin, o, settings, start);
    const taken = new Set([...ctx.existing, ...(pendingIdeas ?? [])].map((r) => `${r.post_date} ${String(r.post_time).slice(0, 5)}`));
    const slots = planSlots(start, count, settings.slot_times, taken);
    if (!slots.length) {
      await releaseLock(admin, o.userId);
      return { ok: false, error: "no_slots" };
    }

    const ideas = await planIdeas(admin, o, settings, ctx, slots);
    if (!ideas?.length) {
      await releaseLock(admin, o.userId);
      return { ok: false, error: "parse" };
    }
    const batchId = randomUUID();
    const { data: savedIdeas, error: ideaErr } = await admin
      .from("autopilot_ideas")
      .insert(
        ideas.map((i) => ({
          user_id: o.userId,
          workspace_id: settings.workspace_id,
          batch_id: batchId,
          post_date: i.date,
          post_time: i.time,
          kind: i.kind,
          pillar: i.pillar ?? null,
          funnel: i.funnel ?? null,
          product_id: i.product_id ?? null,
          title: i.title.slice(0, 200),
          angle: i.angle ?? null,
          hook: i.hook ?? null,
          reason: i.why ?? null,
        })),
      )
      .select("id, post_date, post_time");
    if (ideaErr) throw ideaErr;

    // Pelanggan ingin meninjau ide dulu → berhenti di sini (ditulis otomatis bila 24 jam tidak disentuh).
    if (settings.review_ideas && !o.skipIdeaReview) {
      await releaseLock(admin, o.userId, { last_generated_at: new Date().toISOString() });
      return { ok: true, created: 0, ideas: ideas.length, stage: "ideas", start, batchId };
    }

    const withIds = ideas.map((i) => ({ ...i, id: savedIdeas?.find((r) => String(r.post_date) === i.date && String(r.post_time).slice(0, 5) === i.time)?.id as string | undefined }));
    const { created } = await writeFromIdeas(admin, o, settings, ctx, withIds, batchId);
    await releaseLock(admin, o.userId, { last_generated_at: new Date().toISOString() });
    if (!created) return { ok: false, error: "parse" };
    await triggerFinish(admin, o.userId, batchId);
    return { ok: true, created, ideas: ideas.length, stage: "posts", start, batchId };
  } catch (err) {
    console.error("[autopilot] gagal", err);
    await releaseLock(admin, o.userId);
    return { ok: false, error: "ai", detail: err instanceof Error ? err.message.slice(0, 200) : undefined };
  }
}

/** Tulis konten dari ide yang menunggu (dipanggil pelanggan "Tulis semua", atau cron setelah 24 jam). */
export async function writePendingIdeas(admin: SupabaseClient, o: GenOpts & { batchId?: string }): Promise<GenerateResult> {
  const allowance = autopilotAllowance(o.planId, o.role);
  if (!allowance) return { ok: false, error: "plan" };
  const settings = await loadSettings(admin, o.userId);
  const gate = await brandGate(admin, o.userId, settings.workspace_id);
  if (gate) return { ok: false, error: gate };
  let q = admin.from("autopilot_ideas").select("*").eq("user_id", o.userId).eq("status", "pending").order("post_date").order("post_time");
  if (o.batchId) q = q.eq("batch_id", o.batchId);
  const { data: rows } = await q.limit(28);
  if (!rows?.length) return { ok: false, error: "no_ideas" };
  const room = allowance.postsPerMonth - (await postsThisMonth(admin, o.userId));
  if (room <= 0) return { ok: false, error: "quota" };
  if (!(await claim(admin, o.userId))) return { ok: false, error: "busy" };
  try {
    const ideas = rows.slice(0, room).map((r) => ({
      id: r.id as string,
      date: String(r.post_date),
      time: String(r.post_time).slice(0, 5),
      kind: r.kind as Idea["kind"],
      pillar: (r.pillar as string | null) ?? undefined,
      funnel: (r.funnel as string | null) ?? undefined,
      product_id: (r.product_id as string | null) ?? null,
      title: String(r.title),
      angle: (r.angle as string | null) ?? undefined,
      hook: (r.hook as string | null) ?? undefined,
      why: (r.reason as string | null) ?? undefined,
    }));
    const start = ideas[0].date;
    const ctx = await loadContext(admin, o, settings, start);
    const batchId = (rows[0].batch_id as string) ?? randomUUID();
    const { created } = await writeFromIdeas(admin, o, settings, ctx, ideas, batchId);
    await releaseLock(admin, o.userId);
    if (!created) return { ok: false, error: "parse" };
    await triggerFinish(admin, o.userId, batchId);
    return { ok: true, created, ideas: ideas.length, stage: "posts", start, batchId };
  } catch (err) {
    console.error("[autopilot] tulis ide gagal", err);
    await releaseLock(admin, o.userId);
    return { ok: false, error: "ai", detail: err instanceof Error ? err.message.slice(0, 200) : undefined };
  }
}

/** Ganti satu ide (dengan masukan opsional dari pelanggan). */
export async function replaceIdea(admin: SupabaseClient, o: GenOpts & { ideaId: string; note?: string | null }) {
  const settings = await loadSettings(admin, o.userId);
  const { data: idea } = await admin.from("autopilot_ideas").select("*").eq("id", o.ideaId).eq("user_id", o.userId).eq("status", "pending").maybeSingle();
  if (!idea) return null;
  const { data: others } = await admin.from("autopilot_ideas").select("*").eq("user_id", o.userId).eq("status", "pending").neq("id", o.ideaId).limit(20);
  const ctx = await loadContext(admin, o, settings, String(idea.post_date));
  const keep = (others ?? []).map((r) => ({ date: String(r.post_date), time: String(r.post_time).slice(0, 5), kind: r.kind, pillar: r.pillar ?? undefined, title: String(r.title) }) as Idea);
  const note = [o.note?.trim() ? untrusted("masukan_pemilik_brand", o.note.trim().slice(0, 300)) : "", `Ide lama yang diganti: "${idea.title}" (${idea.pillar ?? "-"}, ${idea.kind}). Beri ide BERBEDA; pertahankan pilar & format kecuali masukan meminta lain.`].filter(Boolean).join("\n");
  const out = await planIdeas(admin, o, settings, ctx, [{ date: String(idea.post_date), time: String(idea.post_time).slice(0, 5) }], { replaceNote: note, keep });
  const n = out?.[0];
  if (!n) return null;
  const { data } = await admin
    .from("autopilot_ideas")
    .update({ kind: n.kind, pillar: n.pillar ?? null, funnel: n.funnel ?? null, product_id: n.product_id ?? null, title: n.title.slice(0, 200), angle: n.angle ?? null, hook: n.hook ?? null, reason: n.why ?? null, note: o.note ?? null, updated_at: new Date().toISOString() })
    .eq("id", o.ideaId)
    .eq("user_id", o.userId)
    .select("*")
    .single();
  return data;
}
