import "server-only";
import { generateText } from "ai";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractJson } from "@/lib/addons/json-output";
import { estimateCostUsd } from "@/lib/ai/models.config";
import { routeTier } from "@/lib/ai/router";
import { assertPublicUrl } from "@/lib/ai/links";
import { fetchPageText, webSearch, serperEnabled, type Source } from "@/lib/ai/research";
import { formatBrandKit, untrusted, type BrandKit } from "@/lib/ai/prompt";
import { recentMediaUrls } from "@/lib/instagram";
import { mergeIntoKit, researchPrompt, researchSchema, type BrandResearch } from "./research-shape";

/**
 * Riset brand otomatis (permintaan founder 21 Nov): telusur Google (web + gambar) dan feed IG brand bila terhubung →
 * AI vision menyimpulkan bisnis, produk, KV (palet, mood, gaya visual) & subjek visual khas → Brand Kit kosong
 * diisi, gaya desain diset ke KV hasil riset, kandidat foto produk ditawarkan ke pelanggan.
 */

const MAX_IMAGES = 8;

/** Unduh gambar publik (cek alamat publik tiap pengalihan, maks 6 MB) → JPEG kecil untuk analisis. */
export async function fetchPublicImage(url: string): Promise<Buffer | null> {
  try {
    let target = new URL(url);
    let res: Response | null = null;
    const signal = AbortSignal.timeout(8000);
    for (let hop = 0; hop < 4; hop++) {
      await assertPublicUrl(target);
      res = await fetch(target, { redirect: "manual", signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; MarqthinkResearch/1.0)", Accept: "image/*" } });
      const loc = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!loc) break;
      target = new URL(loc, target);
      res = null;
    }
    if (!res?.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 6 * 1024 * 1024 || buf.byteLength < 2000) return null;
    return await sharp(buf).rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  } catch {
    return null;
  }
}

export async function imageSearch(q: string, n: number): Promise<{ url: string; title: string; source: string }[]> {
  if (!serperEnabled()) return [];
  try {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": process.env.SERPER_API_KEY!.trim() },
      body: JSON.stringify({ q: q.slice(0, 200), gl: "id", hl: "id", num: Math.min(20, n * 2) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { images?: { imageUrl?: string; thumbnailUrl?: string; title?: string; link?: string }[] };
    return (data.images ?? []).map((i) => ({ url: i.imageUrl || i.thumbnailUrl || "", title: i.title ?? "", source: i.link ?? "" })).filter((i) => i.url).slice(0, n * 2);
  } catch {
    return [];
  }
}

export const ASSET_LABEL: Record<string, string> = {
  logo: "LOGO",
  real_photo: "FOTO ASLI produk/tempat/layanan",
  feed_screenshot: "SCREENSHOT FEED brand",
  competitor_screenshot: "SCREENSHOT KOMPETITOR",
  reference_screenshot: "SCREENSHOT REFERENSI yang disukai",
};

export async function researchBrand(
  admin: SupabaseClient,
  o: { userId: string; workspaceId: string; en: boolean; assets?: { kind: string; buf: Buffer }[]; applyStyle?: boolean },
) {
  const started = Date.now();
  const { data: ws } = await admin.from("workspaces").select("name, brand_kit").eq("id", o.workspaceId).eq("user_id", o.userId).maybeSingle();
  if (!ws) throw new Error("workspace_not_found");
  const kit = (ws.brand_kit ?? {}) as BrandKit;
  const name = String(ws.name);
  const handle = (kit.social_handle ?? "").trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "").replace(/^@?/, "@");
  const website = kit.website?.trim() || null;

  // 1) Penelusuran web (3 kueri) + teks website/halaman teratas.
  const queries = [`"${name}"`, handle.length > 1 ? `${name} ${handle}` : `${name} instagram`, kit.products ? `${name} ${kit.products.slice(0, 40)}` : `${name} review lokasi`];
  const results: Source[] = [];
  await Promise.all(
    queries.map(async (q) => {
      try {
        results.push(...(await webSearch(q, { maxResults: 6, signal: AbortSignal.timeout(12_000) })));
      } catch {
        /* lanjut tanpa kueri ini */
      }
    }),
  );
  const seen = new Set<string>();
  const sources = results.filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true))).slice(0, 12);
  const pages = [website && !/^https?:/.test(website) ? `https://${website}` : website, ...sources.slice(0, 3).map((s) => s.url)].filter(Boolean) as string[];
  const pageTexts = await Promise.all(pages.slice(0, 3).map(async (u) => ({ url: u, text: await fetchPageText(u, { maxChars: 3000, timeoutMs: 7000 }) })));
  const textSources = [
    ...pageTexts.filter((p) => p.text).map((p) => ({ title: "Halaman", url: p.url, content: p.text! })),
    ...sources.map((s) => ({ title: s.title, url: s.url, content: s.content })),
  ].slice(0, 14);

  // 2) Gambar: feed IG brand (bila terhubung) lalu pencarian gambar Google.
  const igUrls = await recentMediaUrls(o.userId, 6);
  const searchImgs = await imageSearch(`${name} ${handle.length > 1 ? handle : ""}`.trim(), MAX_IMAGES);
  const candidates = [...igUrls.map((u) => ({ url: u, title: "Instagram", source: "instagram", ig: true })), ...searchImgs.map((i) => ({ ...i, ig: false }))];
  // Aset onboarding dari klien selalu di depan (paling dipercaya), lalu IG & Google sampai batas.
  const assets = (o.assets ?? []).slice(0, 12);
  const images: { url: string; title: string; source: string; ig: boolean; buf: Buffer }[] = assets.map((a) => ({ url: "", title: ASSET_LABEL[a.kind] ?? a.kind, source: "client", ig: false, buf: a.buf }));
  const maxImages = assets.length ? Math.max(MAX_IMAGES, assets.length + 4) : MAX_IMAGES;
  for (const c of candidates) {
    if (images.length >= maxImages) break;
    const buf = await fetchPublicImage(c.url);
    if (buf) images.push({ ...c, buf });
  }

  // 3) AI vision menyimpulkan bisnis, KV, DNA, subjek visual.
  const routed = routeTier("senior", { needsVision: true });
  const { text, usage } = await generateText({
    model: routed.model,
    maxOutputTokens: 3500,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(120_000),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: researchPrompt({
              name,
              handle: handle.length > 1 ? handle : "",
              website,
              kitSummary: untrusted("brand_kit", formatBrandKit({ ...kit, brand_name: name })),
              sources: textSources.map((s) => ({ ...s, content: untrusted(s.url, s.content) })),
              imageCount: images.length,
              igImages: images.filter((i) => i.ig).length,
              en: o.en,
              assetLegend: assets.length ? assets.map((a, k) => `gambar ${k + 1} = ${ASSET_LABEL[a.kind] ?? a.kind}`).join(", ") : null,
            }),
          },
          ...images.map((i) => ({ type: "image" as const, image: i.buf, mediaType: "image/jpeg" })),
        ],
      },
    ],
  });
  const c = routed.resolved() ?? routed.candidates[0];
  const cost = estimateCostUsd(c, usage.inputTokens ?? 0, usage.outputTokens ?? 0) + queries.length * 0.001 + (searchImgs.length ? 0.001 : 0);
  const parsed = researchSchema.safeParse(extractJson(text));
  await admin.from("usage_logs").insert({
    user_id: o.userId,
    tier: "autopilot-research",
    provider: c.provider,
    model: c.modelId,
    latency_ms: Date.now() - started,
    input_tokens: usage.inputTokens ?? 0,
    output_tokens: usage.outputTokens ?? 0,
    est_cost_usd: cost,
    credits: 0,
    status: parsed.success ? "ok" : "error",
    error: parsed.success ? null : `riset brand: ${parsed.error.issues[0]?.message ?? "?"}`.slice(0, 500),
  });
  if (!parsed.success) throw new Error("research_unreadable");
  const r: BrandResearch = parsed.data;

  // 4) Simpan: gambar (folder user), riset, Brand Kit (hanya field kosong), gaya KV aktif.
  const stamp = Date.now().toString(36);
  const imgMeta = await Promise.all(
    images.map(async (i, k) => {
      if (i.source === "client") return { path: null, url: "", title: i.title, source: "client", ig: false, product: false };
      const path = `${o.userId}/research/${o.workspaceId}/${stamp}-${k}.jpg`;
      const { error } = await admin.storage.from("uploads").upload(path, i.buf, { contentType: "image/jpeg", upsert: true });
      return { path: error ? null : path, url: i.url, title: i.title.slice(0, 120), source: i.source.slice(0, 300), ig: i.ig, product: r.product_images.includes(k) };
    }),
  );
  const { data: saved } = await admin
    .from("brand_research")
    .insert({ user_id: o.userId, workspace_id: o.workspaceId, data: r, sources: textSources.map((s) => ({ title: s.title, url: s.url })), images: imgMeta })
    .select("id, data, images, created_at")
    .single();
  await admin.from("workspaces").update({ brand_kit: mergeIntoKit(kit as Record<string, unknown>, r), updated_at: new Date().toISOString() }).eq("id", o.workspaceId).eq("user_id", o.userId);
  const dna = { ...r.dna, name: r.dna.name || `KV ${name}`.slice(0, 60), bgColor: r.dna.bg === "solid" || r.dna.bg === "cream" ? (r.dna.bgColor ?? r.kv.background) : r.dna.bgColor };
  const { data: style } = await admin
    .from("brand_styles")
    .insert({ user_id: o.userId, workspace_id: o.workspaceId, name: dna.name.slice(0, 60), source: "reference", dna, analysis: `- ${r.business.summary}\n- KV: ${r.kv.mood}${r.kv.reason ? ` (${r.kv.reason})` : ""}`.slice(0, 1200) })
    .select("id")
    .single();
  // Alur lama (tombol Riset brand) langsung memakai KV; alur Brand DNA menunggu ACC klien.
  if (style && o.applyStyle !== false) await admin.from("autopilot_settings").upsert({ user_id: o.userId, style_id: style.id, style_preset: null, updated_at: new Date().toISOString() });
  return saved;
}

/** Riset terbaru untuk project ini (dipakai generator). */
export async function latestResearch(admin: SupabaseClient, userId: string, workspaceId: string | null): Promise<BrandResearch | null> {
  if (!workspaceId) return null;
  const { data } = await admin.from("brand_research").select("data").eq("user_id", userId).eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const r = researchSchema.safeParse(data?.data);
  return r.success ? r.data : null;
}
