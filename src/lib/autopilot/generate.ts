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
import { brandPalette, type SlideBrand } from "./slides";
import { addDays, buildGeneratePrompt, formatMix, generatedWeekSchema, planSlots, todayWib, type GeneratedPost } from "./plan";
import { autopilotAllowance, monthStartWib } from "./quota";

export interface AutopilotSettings {
  user_id: string;
  workspace_id: string | null;
  enabled: boolean;
  cadence: "weekly" | "monthly";
  posts_per_week: number;
  slot_times: string[];
  focus: string | null;
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

/** Kata kunci bisnis brand (untuk cek 125 karakter pertama caption). */
function brandKeywords(kit: BrandKit | null) {
  const src = [kit?.products].filter(Boolean).join(",");
  return src
    .split(/[,;\n/]+/)
    .map((w) => w.trim().split(/\s+/).slice(0, 2).join(" "))
    .filter((w) => w.length >= 4)
    .slice(0, 6);
}

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
    const keywords = brandKeywords(brand.kit);
    const rows = parsed.data.posts
      .map((p) => ({ p, slot: takeSlot(p) }))
      .filter((x): x is { p: GeneratedPost; slot: { date: string; time: string } } => !!x.slot)
      .map(({ p, slot }) => {
        const t = tidyPost(p, brandName, keywords);
        return {
          user_id: o.userId,
          workspace_id: settings.workspace_id,
          batch_id: batchId,
          post_date: slot.date,
          post_time: slot.time,
          kind: p.kind,
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
    const { error: insErr } = await admin.from("social_posts").insert(rows);
    if (insErr) throw insErr;
    await admin.from("usage_logs").insert({ ...logBase, status: "ok" });
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
