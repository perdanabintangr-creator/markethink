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
import { createVisual, pool } from "./visuals";
import { brandPalette, type SlideBrand } from "./slides";
import { addDays, buildGeneratePrompt, formatMix, generatedWeekSchema, pickLook, planSlots, todayWib, type GeneratedPost } from "./plan";
import { isHero, type Look, type Slide } from "./slides";
import { activeStyle } from "./styles-server";
import { baseOf, styleNote } from "./style";
import { catalogBlock, type ProductRow } from "./products";
import { autopilotAllowance, monthStartWib } from "./quota";

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

export type GenerateError = "plan" | "quota" | "busy" | "no_slots" | "ai" | "parse";


/**
 * Buat konten SATU minggu (7 hari mulai `start`, default: hari sesudah konten terakhir / besok) sebagai DRAF.
 * Dikunci per user lewat `generating_at` supaya tidak dobel. Tidak melempar error; hasil `{ok:false, error}` bila gagal.
 */
export async function generateWeek(
  admin: SupabaseClient,
  o: { userId: string; planId: string; role: string; language: "id" | "en"; fullName?: string | null; start?: string; source: "manual" | "cron" },
): Promise<{ ok: true; created: number; start: string; batchId: string } | { ok: false; error: GenerateError; detail?: string }> {
  const allowance = autopilotAllowance(o.planId, o.role);
  if (!allowance) return { ok: false, error: "plan" };

  const { data: settingsRow } = await admin.from("autopilot_settings").select("*").eq("user_id", o.userId).maybeSingle();
  const settings: AutopilotSettings = settingsRow ?? {
    user_id: o.userId,
    workspace_id: null,
    enabled: false,
    cadence: "weekly",
    posts_per_week: 7,
    slot_times: ["12:00", "19:00"],
    focus: null,
    design: "auto",
    generating_at: null,
    last_generated_at: null,
  };
  if (!settingsRow) await admin.from("autopilot_settings").insert({ user_id: o.userId });

  const used = await postsThisMonth(admin, o.userId);
  const room = allowance.postsPerMonth - used;
  const count = Math.min(settings.posts_per_week, allowance.postsPerWeek, room);
  if (count <= 0) return { ok: false, error: "quota" };

  // Kunci: hanya satu proses pembuatan per user (kunci kedaluwarsa 6 menit bila proses mati di tengah jalan).
  const stale = new Date(Date.now() - 6 * 60_000).toISOString();
  const { data: claimed } = await admin
    .from("autopilot_settings")
    .update({ generating_at: new Date().toISOString() })
    .eq("user_id", o.userId)
    .or(`generating_at.is.null,generating_at.lt.${stale}`)
    .select("user_id");
  if (!claimed?.length) return { ok: false, error: "busy" };

  const release = (extra: Record<string, unknown> = {}) =>
    admin.from("autopilot_settings").update({ generating_at: null, updated_at: new Date().toISOString(), ...extra }).eq("user_id", o.userId);

  const started = Date.now();
  let routed: ReturnType<typeof routeTier> | null = null;
  try {
    const today = todayWib();
    const last = await plannedUntil(admin, o.userId);
    const tomorrow = addDays(today, 1);
    const start = o.start && o.start >= tomorrow ? o.start : last && addDays(last, 1) > tomorrow ? addDays(last, 1) : tomorrow;

    const { data: existing } = await admin
      .from("social_posts")
      .select("post_date, post_time, title")
      .eq("user_id", o.userId)
      .neq("status", "rejected")
      .gte("post_date", addDays(start, -21))
      .lte("post_date", addDays(start, 6));
    const taken = new Set((existing ?? []).map((r) => `${r.post_date} ${String(r.post_time).slice(0, 5)}`));
    const slots = planSlots(start, count, settings.slot_times, taken);
    if (!slots.length) {
      await release();
      return { ok: false, error: "no_slots" };
    }

    const brand = await loadBrand(admin, o.userId, settings.workspace_id, o.fullName);
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
    const dna = await activeStyle(admin, o.userId, settingsRow as { style_id?: string | null; style_preset?: string | null } | null);

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

    const brandName = brand.palette.name;
    const prompt = buildGeneratePrompt({
      brandBlock: brand.kit ? untrusted("brand_kit", formatBrandKit(brand.kit)) : "",
      brandName,
      handle: brand.palette.handle,
      brandTag: brandHashtag(brandName),
      slots,
      mix: formatMix(slots.length),
      recentTitles: (existing ?? []).filter((r) => String(r.post_date) < start).map((r) => String(r.title)).slice(0, 30),
      market: marketContext(new Date(`${start}T05:00:00Z`), 21),
      outcomes: formatOutcomes((outcomeRows ?? []) as OutcomeRow[]) || null,
      performance,
      voice: voiceRules(brand.kit),
      style: dna ? styleNote(dna) : null,
      catalog: catalogBlock(products, featured),
      focus: settings.focus ? untrusted("fokus_pemilik_brand", settings.focus) : null,
      en: o.language === "en",
    });

    routed = routeTier("senior");
    const { text, usage } = await generateText({
      model: routed.model,
      maxOutputTokens: 24_000,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(270_000),
      providerOptions: { anthropic: { effort: "medium" } },
      prompt,
    });
    const resolved = routed.resolved() ?? routed.candidates[0];
    const cost = estimateCostUsd(resolved, usage.inputTokens ?? 0, usage.outputTokens ?? 0);

    const parsed = generatedWeekSchema.safeParse(extractJson(text));
    const logBase = {
      user_id: o.userId,
      tier: "autopilot",
      provider: resolved.provider,
      model: resolved.modelId,
      latency_ms: Date.now() - started,
      input_tokens: usage.inputTokens ?? 0,
      output_tokens: usage.outputTokens ?? 0,
      est_cost_usd: cost,
      credits: 0,
    };
    if (!parsed.success) {
      await admin.from("usage_logs").insert({ ...logBase, status: "error", error: `autopilot: JSON tidak terbaca: ${parsed.error.issues[0]?.message ?? "?"}`.slice(0, 1000) });
      await release();
      return { ok: false, error: "parse" };
    }

    // Cocokkan ke slot: pakai tanggal/jam dari AI bila persis ada di daftar slot, sisanya diisi berurutan.
    const free = [...slots];
    const takeSlot = (p: GeneratedPost) => {
      const k = free.findIndex((s) => s.date === p.date && s.time === p.time);
      return k >= 0 ? free.splice(k, 1)[0] : free.shift();
    };
    const batchId = randomUUID();
    const keywords = brandKeywordsOf(brand.kit);
    const rows = parsed.data.posts
      .map((p) => ({ p, slot: takeSlot(p) }))
      .filter((x): x is { p: GeneratedPost; slot: { date: string; time: string } } => !!x.slot)
      .map(({ p, slot }, k) => {
        const t = tidyPost(p, brandName, keywords, brand.kit?.voice_dont);
        const design = dna && p.kind !== "reel" ? baseOf(dna) : pickLook(settings.design ?? "auto", p.design, k, p.kind);
        return {
          user_id: o.userId,
          workspace_id: settings.workspace_id,
          batch_id: batchId,
          post_date: slot.date,
          post_time: slot.time,
          kind: p.kind,
          design,
          style: dna && p.kind !== "reel" ? dna : null,
          product_id: p.product_id && products.some((x) => x.id === p.product_id) ? p.product_id : null,
          title: p.title.slice(0, 160),
          pillar: p.pillar ?? null,
          funnel: p.funnel ?? null,
          slides: t.slides,
          caption: t.caption,
          alt_text: t.alt_text,
          script: t.script,
          note: [p.hook ? `Hook: ${p.hook}` : "", p.note ?? ""].filter(Boolean).join("\n").slice(0, 600) || null,
          lint: t.lint,
          status: "draft",
        };
      });
    const { data: inserted, error: insErr } = await admin.from("social_posts").insert(rows).select("id, design, style, kind, slides, product_id");
    if (insErr) throw insErr;
    await admin.from("usage_logs").insert({ ...logBase, status: "ok" });

    // Visual utama AI untuk tiap cover gaya studio (paralel 3; berhenti memulai gambar baru bila waktu hampir habis).
    const needs = (inserted ?? []).filter((r) => {
      const sl = (r.slides ?? []) as Slide[];
      const prod = r.product_id ? products.find((x) => x.id === r.product_id) : null;
      return r.design !== "classic" && r.kind !== "reel" && sl[0] && isHero(sl[0], 0) && (sl[0].visual || prod?.photo_paths.length);
    });
    await pool(needs, 3, async (r) => {
      if (Date.now() - started > 230_000) return;
      const sl = r.slides as Slide[];
      const prod = r.product_id ? (products.find((x) => x.id === r.product_id) ?? null) : null;
      const path = await createVisual(admin, {
        userId: o.userId,
        postId: r.id as string,
        look: r.design as Look,
        visual: sl[0].visual || `${prod?.name ?? "product"} hero shot`,
        brand: brand.palette,
        style: r.style,
        product: prod?.photo_paths.length ? prod : null,
        timeoutMs: 60_000,
      });
      if (path) await admin.from("social_posts").update({ slides: [{ ...sl[0], image: path }, ...sl.slice(1)] }).eq("id", r.id).eq("user_id", o.userId);
    });
    await release({ last_generated_at: new Date().toISOString() });
    return { ok: true, created: rows.length, start, batchId };
  } catch (err) {
    console.error("[autopilot] gagal", err);
    const c = routed?.resolved() ?? routed?.candidates[0];
    await admin.from("usage_logs").insert({
      user_id: o.userId,
      tier: "autopilot",
      provider: c?.provider ?? null,
      model: c?.modelId ?? null,
      latency_ms: Date.now() - started,
      credits: 0,
      status: "error",
      error: `autopilot: ${err instanceof Error ? err.message : String(err)}`.slice(0, 1000),
    });
    await release();
    return { ok: false, error: "ai", detail: err instanceof Error ? err.message.slice(0, 200) : undefined };
  }
}
