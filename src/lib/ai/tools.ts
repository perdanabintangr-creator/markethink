import { fitDeckToImages } from "@/lib/deck-fit";
import "server-only";
import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consumeCredits, refundCredits } from "@/lib/credits";
import { generateImage } from "@/lib/ai/image";
import {
  buildPresentation,
  deckImageRequests,
  imageSize,
  presentationOutline,
  presentationSchema,
  type DeckImages,
  type PresentationInput,
} from "@/lib/pptx";
import { buildScene, signatureImageRequests, type SignatureImageRequest } from "@/lib/deck/engine";
import { renderScenePdf, renderScenePptx } from "@/lib/deck/render";
import { sanitizeFileName } from "@/lib/files";
import { readToolResult } from "@/lib/addons/chat-context";

export const IMAGE_CREDIT_COST = 6; // ±Rp555 modal per gambar (1 kredit ≈ Rp100)
export const PPTX_CREDIT_COST = 2;
/** Kredit tambahan per gambar AI di dalam PPT (cover/slide bergambar). */
export const DECK_IMAGE_CREDIT_COST = 6;
/** Maks foto AI per PPT per paket: visual paling megah di Pro & Promax, Starter hanya cover, Free tanpa foto AI. */
export const DECK_IMAGE_MAX_BY_PLAN: Record<string, number> = { beta: 0, starter: 1, pro: 6, promax: 8 };
export const deckImageMaxFor = (planId: string, isAdmin: boolean) => (isAdmin ? 8 : (DECK_IMAGE_MAX_BY_PLAN[planId] ?? 0));
/** Pro & Promax: arahan visual premium untuk gambar baru. */
export const premiumVisualsFor = (planId: string, isAdmin: boolean) => isAdmin || planId === "pro" || planId === "promax";
/** "signature" (Promax & admin): AI Art Director — font, palet & tata letak mengikuti tema, foto KV konsisten, hasil PPT + PDF. */
export type DeckStyle = "standard" | "signature";
export const deckStyleFor = (planId: string, isAdmin: boolean): DeckStyle => (isAdmin || planId === "promax" ? "signature" : "standard");
const PREMIUM_ART_DIRECTION =
  "Execute at premium creative-agency quality: refined composition, rich detail, polished lighting and color grading, faithful to the requested style.";
/** Perkiraan biaya per gambar (USD) bila provider tidak melaporkan biaya nyata. */
const IMAGE_COST_USD = 0.04;

export type ImageToolOutput =
  | { ok: true; attachmentId: string; url: string; prompt: string; aspectRatio: string }
  | { ok: false; error: string; hint?: string };

export type PresentationToolOutput =
  | {
      ok: true;
      attachmentId: string;
      url: string;
      title: string;
      slideCount: number;
      slideTitles: string[];
      fileName: string;
      theme?: string;
      images?: number;
      style?: DeckStyle;
      /** Signature: PDF (font asli tertanam) & tata letak untuk pratinjau persis. */
      pdfUrl?: string;
      sceneUrl?: string;
      /** URL foto per slide ("cover", indeks slide, atau "i-gk" galeri) untuk pratinjau di browser. */
      previewImages?: Record<string, string>;
    }
  | { ok: false; error: string };

interface ToolCtx {
  admin: SupabaseClient;
  userId: string;
  chatId: string;
  /** null = gambar boleh; string = alasan gambar tidak tersedia (disampaikan model ke user). */
  imageBlockedReason: string | null;
  /** Cek batas harian paket (mis. Free: 2 gambar, 1 PPT per hari). null = boleh. */
  dailyLimit?: (kind: "image" | "pptx") => Promise<string | null>;
  /** Maks foto AI untuk cover/slide PPT (0 = tanpa foto AI). */
  deckImageMax?: number;
  /** Pro & Promax: gambar baru diberi arahan visual premium. */
  premiumVisuals?: boolean;
  /** Gaya deck sesuai paket (Promax = sinematik). */
  deckStyle?: DeckStyle;
  /** Pakai model gambar hemat (Muse) dulu untuk gambar baru — kini semua paket. */
  budgetImages?: boolean;
}

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 1500);

async function storeFile(ctx: ToolCtx, kind: "images" | "presentations", name: string, mime: string, bytes: Uint8Array, text: string | null) {
  const id = crypto.randomUUID();
  const path = `${ctx.userId}/generated/${kind}/${id}-${name.replace(/\s+/g, "-")}`;
  const { error: upErr } = await ctx.admin.storage.from("uploads").upload(path, bytes, { contentType: mime });
  if (upErr) throw new Error(`upload gagal: ${upErr.message}`);
  const { error } = await ctx.admin.from("attachments").insert({
    id,
    user_id: ctx.userId,
    name,
    mime,
    size: bytes.byteLength,
    storage_path: path,
    extracted_text: text,
  });
  if (error) throw new Error(`simpan gagal: ${error.message}`);
  return { id, url: `/api/attachments/${id}` };
}

async function logUsage(
  ctx: ToolCtx,
  row: { tier: string; provider?: string; model?: string; credits: number; cost: number; error?: string; note?: string },
) {
  await ctx.admin.from("usage_logs").insert({
    user_id: ctx.userId,
    chat_id: ctx.chatId,
    tier: row.tier,
    provider: row.provider ?? null,
    model: row.model ?? null,
    est_cost_usd: row.cost,
    credits: row.credits,
    status: row.error ? "error" : "ok",
    error: row.error ?? row.note ?? null,
  });
}

/** Maksimal hasil Tools Pro yang dibaca AI per pesan (hemat biaya; versi ringkas biasanya cukup). */
export const MAX_TOOL_READS = 3;

export function createChatTools(ctx: ToolCtx) {
  const read = new Set<string>();
  return {
    read_tool_result: tool({
      description:
        "Baca hasil Markethink Tools Pro milik user (versi terbaru), mis. persona, kalender konten, marketing plan, riset pasar. " +
        "Pakai id dari daftar HASIL TOOLS PRO MILIK USER di instruksi sistem, setiap kali user menyinggung hasil yang dibuat di Tools Pro. " +
        `Maksimal ${MAX_TOOL_READS} hasil per pesan — pilih yang paling relevan. Default versi ringkas; lengkap=true bila butuh detail (mis. temuan riset).`,
      inputSchema: z.object({
        run_id: z.string().uuid().describe("id hasil dari daftar HASIL TOOLS PRO MILIK USER"),
        lengkap: z.boolean().optional().describe("true = versi lengkap (lebih panjang). Default ringkas."),
      }),
      execute: async ({ run_id, lengkap }) => {
        if (!read.has(run_id) && read.size >= MAX_TOOL_READS)
          return { ok: false as const, error: `Batas ${MAX_TOOL_READS} hasil per pesan tercapai. Jawab dari hasil yang sudah dibaca.` };
        read.add(run_id);
        return readToolResult(ctx.admin, ctx.userId, run_id, lengkap ? 20_000 : 7_000);
      },
    }),

    generate_image: tool({
      description:
        "Buat gambar baru (visual iklan, konten feed/story, mockup produk, ilustrasi, poster, thumbnail) atau edit/variasikan gambar acuan. " +
        "Gunakan setiap kali user meminta dibuatkan/didesainkan gambar. Tulis prompt visual yang detail dalam bahasa Inggris: " +
        "subjek, komposisi, gaya, pencahayaan, warna brand, mood. Bila ada teks di gambar, tulis persis teksnya (singkat) dalam tanda kutip.",
      inputSchema: z.object({
        prompt: z.string().min(3).max(4000).describe("Prompt visual detail (bahasa Inggris)"),
        aspect_ratio: z
          .enum(["1:1", "4:5", "9:16", "16:9", "3:4", "4:3"])
          .default("1:1")
          .describe("1:1 feed, 4:5 feed portrait, 9:16 story/reels/TikTok, 16:9 banner/YouTube"),
        reference_ids: z
          .array(z.string().uuid())
          .max(3)
          .optional()
          .describe("ID gambar acuan (dari gambar user atau gambar yang sebelumnya kamu buat) untuk diedit/divariasikan"),
      }),
      execute: async ({ prompt, aspect_ratio, reference_ids }): Promise<ImageToolOutput> => {
        if (ctx.imageBlockedReason) return { ok: false, error: ctx.imageBlockedReason };
        const imageLimit = await ctx.dailyLimit?.("image");
        if (imageLimit) return { ok: false, error: imageLimit, hint: "Jangan coba lagi hari ini; tawarkan prompt gambar siap pakai." };
        const credit = await consumeCredits(ctx.userId, IMAGE_CREDIT_COST, "image", { chatId: ctx.chatId });
        if (!credit.ok) return { ok: false, error: "Sisa kuota bulan ini tidak cukup untuk membuat gambar. Sampaikan ke user tanpa menyebut angka; kuota reset tiap tanggal 1 atau upgrade paket." };
        try {
          const refs = await loadReferences(ctx, reference_ids ?? []);
          const finalPrompt = ctx.premiumVisuals && !refs.length ? `${prompt}\n\n${PREMIUM_ART_DIRECTION}` : prompt;
          const img = await generateImage(finalPrompt, aspect_ratio, refs, { budget: ctx.budgetImages });
          const ext = img.mime.includes("jpeg") ? "jpg" : img.mime.split("/")[1] || "png";
          const saved = await storeFile(ctx, "images", `markethink-${Date.now()}.${ext}`, img.mime, img.bytes, `Gambar AI: ${prompt}`);
          await logUsage(ctx, { tier: "image", provider: img.provider, model: img.model, credits: IMAGE_CREDIT_COST, cost: img.costUsd ?? IMAGE_COST_USD, note: img.notes });
          return { ok: true, attachmentId: saved.id, url: saved.url, prompt, aspectRatio: aspect_ratio };
        } catch (err) {
          console.error("[image] gagal", err);
          await refundCredits(ctx.userId, IMAGE_CREDIT_COST, "image_failed");
          await logUsage(ctx, { tier: "image", credits: 0, cost: 0, error: errText(err) });
          return { ok: false, ...friendlyImageError(errText(err)) };
        }
      },
    }),

    create_presentation: tool({
      description:
        "Buat file presentasi PowerPoint (.pptx) berdesain profesional yang siap dipresentasikan — pitch deck, proposal sponsor, laporan kampanye, " +
        "strategi marketing, ringkasan dokumen/riset (seperti NotebookLM). Gunakan setiap kali user meminta PPT/slide/deck/presentasi.\n" +
        "STANDAR KONSULTAN & AGENCY (wajib): judul slide = ACTION TITLE — kalimat kesimpulan ≤ 12 kata yang langsung menyatakan insight " +
        "(mis. 'Margin 45% membuat balik modal di bulan ke-4', BUKAN 'Unit Economics'); kicker berisi nama bab. Slide ke-2 = Executive Summary " +
        "(3–4 cards/stats berisi pesan inti seluruh deck). Satu pesan per slide; utamakan visual data (stats, chart, table, timeline, comparison) " +
        "dibanding daftar poin — maks 1 slide bullets di seluruh deck. Isi `takeaway` (so-what/rekomendasi tegas) pada slide data, analisis & " +
        "strategi; isi `source` bila memakai angka dari riset/luar. Angka konsisten antar slide (total, persen, periode). Bahasa tajam & ringkas.\n" +
        "ATURAN DESAIN (wajib): (1) Alur cerita kuat: pembuka → masalah/peluang → insight → strategi → eksekusi → angka/KPI → penutup/CTA. " +
        "(2) Variasikan layout — jangan dua slide berturut-turut memakai layout yang sama; pakai agenda di awal, section untuk tiap bab besar, " +
        "cards untuk pilar/fitur (dengan ikon relevan), stats untuk angka kunci, chart bila ada data angka, timeline untuk jadwal/tahapan, " +
        "comparison untuk perbandingan, table untuk paket/harga, quote untuk insight kuat, closing di akhir. Hindari layout bullets kecuali perlu. " +
        "(3) Teks ringkas ala slide konsultan: judul ≤ 8 kata yang menyampaikan pesan, poin ≤ 15 kata, tanpa paragraf. " +
        "(4) Isi spesifik (angka nyata, nama, contoh), bukan placeholder. (5) VISUAL: deck harus kaya visual, bukan hanya tulisan — selalu isi " +
        "cover_image_prompt (hero visual, cover_style hero); bila ada produk/jasa, buat slide layout product (foto produk besar + keunggulan); " +
        "beri image_prompt pada ± 1 dari 3 slide yang paling terbantu visual (section, image_text, cards, stats, closing, gallery untuk moodboard/" +
        "contoh konten/lokasi). Bila user melampirkan foto (produk/brand/lokasi), PAKAI fotonya lewat image_id / cover_image_id / gallery.image_id. " +
        "Prompt gambar dalam bahasa Inggris, spesifik ke brand/produk/suasana Indonesia bila relevan, tanpa teks. (6) Pilih theme sesuai brand/industri; isi " +
        "brand_color bila warna brand diketahui. (7) Tulis speaker notes yang membantu presenter. " +
        "Bila user melampirkan dokumen, dasarkan isi slide pada dokumen itu." +
        (ctx.deckStyle === "signature" ? SIGNATURE_GUIDE : ""),
      inputSchema: presentationSchema,
      execute: async (input): Promise<PresentationToolOutput> => {
        const pptxLimit = await ctx.dailyLimit?.("pptx");
        if (pptxLimit) return { ok: false, error: pptxLimit };
        const credit = await consumeCredits(ctx.userId, PPTX_CREDIT_COST, "presentation", { chatId: ctx.chatId });
        if (!credit.ok) return { ok: false, error: "Sisa kuota bulan ini tidak cukup untuk membuat PPT. Sampaikan ke user tanpa menyebut angka; kuota reset tiap tanggal 1 atau upgrade paket." };
        try {
          const style = ctx.deckStyle ?? "standard";
          if (style === "signature") return await signatureDeck(ctx, input);
          const images = await makeDeckImages(ctx, input);
          // Slide yang tidak mendapat foto (sesuai paket / gagal dibuat) → layout teks rapi, tanpa kotak foto kosong.
          const deck = fitDeckToImages(input, (key) => Boolean(images[key]));
          const bytes = await buildPresentation(deck, images);
          const fileName = `${sanitizeFileName(input.title).slice(0, 60) || "presentasi"}.pptx`;
          const saved = await storeFile(
            ctx,
            "presentations",
            fileName,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            bytes,
            presentationOutline(deck),
          );
          await logUsage(ctx, { tier: "pptx", credits: PPTX_CREDIT_COST, cost: 0 });
          const imageCount = Object.keys(images).length;
          const previewImages = await deckPreviewUrls(ctx, deck, images);
          return {
            ok: true,
            attachmentId: saved.id,
            url: saved.url,
            title: input.title,
            slideCount: input.slides.length + 1,
            slideTitles: [input.title, ...input.slides.map((s) => s.title)],
            fileName,
            theme: input.theme,
            images: imageCount,
            style,
            previewImages,
          };
        } catch (err) {
          console.error("[pptx] gagal", err);
          await refundCredits(ctx.userId, PPTX_CREDIT_COST, "presentation_failed");
          return { ok: false, error: `Gagal membuat file PPT: ${errText(err)}` };
        }
      },
    }),
  };
}

/**
 * Siapkan visual deck: foto milik user (attachment, gratis) + gambar AI untuk cover/produk/slide bergambar
 * (paralel, maks sesuai paket — lihat DECK_IMAGE_MAX_BY_PLAN). Gambar yang gagal dilewati — slide tetap jadi.
 */
/** Simpan foto AI deck sebagai file agar pratinjau slide di chat bisa menampilkannya (foto user memakai file aslinya). */
async function deckPreviewUrls(
  ctx: ToolCtx,
  input: PresentationInput,
  images: DeckImages,
  reqs: { key: string; imageId?: string }[] = deckImageRequests(input, 0),
): Promise<Record<string, string>> {
  const owned = new Map(
    reqs
      .filter((r) => r.imageId)
      .map((r) => [r.key, r.imageId!]),
  );
  const out: Record<string, string> = {};
  await Promise.all(
    Object.entries(images).map(async ([key, img]) => {
      try {
        const ownedId = owned.get(key);
        if (ownedId) out[key] = `/api/attachments/${ownedId}`;
        else {
          const ext = img.mime.includes("jpeg") ? "jpg" : img.mime.split("/")[1] || "png";
          const saved = await storeFile(ctx, "images", `slide-${key}.${ext}`, img.mime, Uint8Array.from(Buffer.from(img.data, "base64")), null);
          out[key] = saved.url;
        }
      } catch (err) {
        console.warn("[pptx] simpan pratinjau gagal", errText(err));
      }
    }),
  );
  return out;
}

/** Muat foto milik user (attachment) yang dipakai di deck. */
async function loadOwnedImages(ctx: ToolCtx, reqs: { key: string; imageId?: string }[], images: DeckImages) {
  const owned = reqs.filter((r) => r.imageId && /^[0-9a-f-]{36}$/i.test(r.imageId));
  if (!owned.length) return;
  const { data: rows } = await ctx.admin
    .from("attachments")
    .select("id, mime, storage_path")
    .eq("user_id", ctx.userId)
    .in("id", [...new Set(owned.map((r) => r.imageId!))]);
  const byId = new Map((rows ?? []).filter((r) => String(r.mime).startsWith("image/")).map((r) => [r.id as string, r]));
  await Promise.all(
    owned.map(async (r) => {
      const row = byId.get(r.imageId!);
      if (!row) return;
      const { data } = await ctx.admin.storage.from("uploads").download(row.storage_path as string);
      if (!data) return;
      const bytes = new Uint8Array(await data.arrayBuffer());
      const size = imageSize(bytes);
      if (size) images[r.key] = { data: Buffer.from(bytes).toString("base64"), mime: row.mime as string, ...size };
    }),
  );
}

async function makeDeckImages(ctx: ToolCtx, input: PresentationInput): Promise<DeckImages> {
  const reqs = deckImageRequests(input, ctx.deckImageMax ?? 0);
  if (!reqs.length) return {};
  const images: DeckImages = {};

  // 1) Foto milik user (mis. foto produk asli yang dilampirkan di chat).
  await loadOwnedImages(ctx, reqs, images);

  // 2) Gambar AI.
  const toGenerate = reqs.filter((r) => !r.imageId && r.prompt);
  if (!toGenerate.length || !ctx.deckImageMax) return images;
  const credit = await consumeCredits(ctx.userId, toGenerate.length * DECK_IMAGE_CREDIT_COST, "deck_images", { chatId: ctx.chatId });
  if (!credit.ok) return images;
  const results = await Promise.all(
    toGenerate.map(async (r) => {
      const style = r.product
        ? "Premium studio product photography, product centered and fully visible, soft shadow, clean seamless background, commercial advertising quality."
        : "Professional, high-quality editorial photo for a marketing presentation, cinematic lighting, clean composition.";
      try {
        const img = await Promise.race([
          generateImage(
            `${style} ${r.prompt}. No text, no words, no letters, no logos, no watermark.${ctx.premiumVisuals ? ` ${PREMIUM_ART_DIRECTION}` : ""}`,
            r.aspect,
            [],
            { budget: true },
          ),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout gambar deck")), 80_000)),
        ]);
        const size = imageSize(img.bytes);
        if (!size) return false;
        images[r.key] = { data: Buffer.from(img.bytes).toString("base64"), mime: img.mime, ...size };
        await logUsage(ctx, { tier: "deck_image", provider: img.provider, model: img.model, credits: DECK_IMAGE_CREDIT_COST, cost: img.costUsd ?? IMAGE_COST_USD });
        return true;
      } catch (err) {
        console.warn("[pptx] gambar deck gagal", errText(err));
        return false;
      }
    }),
  );
  const failed = results.filter((ok) => !ok).length;
  if (failed) await refundCredits(ctx.userId, failed * DECK_IMAGE_CREDIT_COST, "deck_images_failed");
  return images;
}

// ---------------------------------------------------------------------------
// Deck Signature (Promax): AI Art Director
// ---------------------------------------------------------------------------

const SIGNATURE_GUIDE =
  "\nGAYA SIGNATURE (paket ini — kualitas tertinggi, setara deck agency): WAJIB isi `design`. (a) Pilih `design.mood` yang paling cocok dengan tema & " +
  "audiens (font & bentuk kotak mengikuti mood). (b) Tentukan `design.kv` = satu dunia visual yang konsisten (setting, tokoh, pakaian, pencahayaan, " +
  "color grade) — semua foto dibuat dari KV ini sehingga tokoh & suasananya sama di tiap slide. (c) `design.palette` diturunkan dari KV " +
  "(bg gelap untuk event malam/teknologi, terang untuk F&B/beauty, dsb.), kontras teks tinggi. (d) Isi `design.cover_kicker`, `design.tagline`, " +
  "`design.presenter` bila relevan. (e) Beri image_prompt pada ± 7 slide terpenting (cards, timeline, section, stats, comparison, closing): " +
  "tulis ADEGAN-nya saja (siapa melakukan apa, di mana) — gaya & komposisi diatur otomatis. Untuk cards berisi 2 kartu, gambarkan dua subjek " +
  "kiri-kanan (mis. 'a gamer on the left, a video creator on the right'). (f) Teks sangat ringkas: kicker 2–4 kata, judul ≤ 7 kata yang kuat " +
  "(boleh bahasa Inggris untuk event/brand modern), isi kartu 2–3 kalimat pendek (tiap kalimat jadi satu baris), takeaway 1 kalimat pernyataan.";

/** KV dulu (jadi acuan), lalu foto slide lain dibuat dari KV agar tokoh, tempat & warna konsisten. */
async function makeSignatureImages(ctx: ToolCtx, input: PresentationInput, reqs: SignatureImageRequest[]): Promise<DeckImages> {
  const images: DeckImages = {};
  await loadOwnedImages(ctx, reqs, images);
  const toGenerate = reqs.filter((r) => !r.imageId && r.prompt);
  if (!toGenerate.length || !ctx.deckImageMax) return images;
  const credit = await consumeCredits(ctx.userId, toGenerate.length * DECK_IMAGE_CREDIT_COST, "deck_images", { chatId: ctx.chatId });
  if (!credit.ok) return images;
  const world = input.design?.kv?.trim();
  const NO_TEXT = "No text, no words, no letters, no logos, no watermark.";
  let failed = 0;
  const run = async (r: SignatureImageRequest, refs: { mime: string; data: string }[]) => {
    const prompt = refs.length
      ? `Create a new photo in exactly the same visual world as the reference image: same setting style, same characters' look and wardrobe if people appear, ` +
        `same color palette, lighting and color grade. Scene: ${r.prompt}. ${r.composition} ${world ? `World: ${world}. ` : ""}` +
        `Photorealistic, premium campaign quality. ${NO_TEXT}`
      : r.product
        ? `Premium studio product photography: ${r.prompt}. ${r.composition} ${world ? `Mood: ${world}. ` : ""}${NO_TEXT}`
        : `${world ? `${world}. ` : ""}${r.prompt}. ${r.composition} Premium campaign key visual, photorealistic, cinematic lighting and color grade, rich detail. ${NO_TEXT}`;
    try {
      const img = await Promise.race([
        generateImage(prompt, r.aspect, refs, { budget: !refs.length && r.key !== "cover" }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout gambar deck")), 90_000)),
      ]);
      const size = imageSize(img.bytes);
      if (!size) throw new Error("format gambar tidak dikenal");
      images[r.key] = { data: Buffer.from(img.bytes).toString("base64"), mime: img.mime, ...size };
      await logUsage(ctx, { tier: "deck_image", provider: img.provider, model: img.model, credits: DECK_IMAGE_CREDIT_COST, cost: img.costUsd ?? IMAGE_COST_USD, note: img.notes });
    } catch (err) {
      failed++;
      console.warn("[deck-signature] gambar gagal", r.key, errText(err));
    }
  };
  // 1) Key visual (cover) — foto user untuk cover juga bisa jadi acuan.
  const kvReq = toGenerate.find((r) => r.key === "cover");
  if (kvReq) await run(kvReq, []);
  const kv = images.cover;
  const refs = kv ? [{ mime: kv.mime, data: kv.data }] : [];
  // 2) Foto slide lain paralel, mengacu ke KV (foto produk tanpa acuan agar produknya tetap bersih).
  await Promise.all(toGenerate.filter((r) => r !== kvReq).map((r) => run(r, r.product ? [] : refs)));
  if (failed) await refundCredits(ctx.userId, failed * DECK_IMAGE_CREDIT_COST, "deck_images_failed");
  return images;
}

async function signatureDeck(ctx: ToolCtx, input: PresentationInput): Promise<PresentationToolOutput> {
  const reqs = signatureImageRequests(input, ctx.deckImageMax ?? 0);
  const images = await makeSignatureImages(ctx, input, reqs);
  // Slide produk/galeri/gambar+teks yang tidak mendapat foto → versi teks rapi.
  const deck = fitDeckToImages(input, (key) => Boolean(images[key]));
  const dims = Object.fromEntries(Object.entries(images).map(([k, v]) => [k, { width: v.width, height: v.height }]));
  const scene = buildScene(deck, { images: dims });
  const base = sanitizeFileName(input.title).slice(0, 60) || "presentasi";
  const [pptxBytes, pdfBytes] = await Promise.all([renderScenePptx(scene, images, input.title), renderScenePdf(scene, images, input.title)]);
  const outline = presentationOutline(deck);
  const [saved, pdf, sceneFile, previewImages] = await Promise.all([
    storeFile(ctx, "presentations", `${base}.pptx`, "application/vnd.openxmlformats-officedocument.presentationml.presentation", pptxBytes, outline),
    storeFile(ctx, "presentations", `${base}.pdf`, "application/pdf", pdfBytes, null),
    storeFile(ctx, "presentations", `${base}.scene.json`, "application/json", new TextEncoder().encode(JSON.stringify(scene)), null),
    deckPreviewUrls(ctx, deck, images, reqs),
  ]);
  await logUsage(ctx, { tier: "pptx", credits: PPTX_CREDIT_COST, cost: 0, note: `signature:${scene.mood}` });
  return {
    ok: true,
    attachmentId: saved.id,
    url: saved.url,
    title: input.title,
    slideCount: input.slides.length + 1,
    slideTitles: [input.title, ...input.slides.map((s) => s.title)],
    fileName: `${base}.pptx`,
    theme: input.theme,
    images: Object.keys(images).length,
    style: "signature",
    pdfUrl: pdf.url,
    sceneUrl: sceneFile.url,
    previewImages,
  };
}

async function loadReferences(ctx: ToolCtx, ids: string[]) {
  if (!ids.length) return [];
  const { data: rows } = await ctx.admin
    .from("attachments")
    .select("mime, storage_path")
    .eq("user_id", ctx.userId)
    .in("id", ids);
  const refs: { mime: string; data: string }[] = [];
  for (const r of (rows ?? []).filter((r) => (r.mime as string).startsWith("image/"))) {
    const { data } = await ctx.admin.storage.from("uploads").download(r.storage_path as string);
    if (data) refs.push({ mime: r.mime as string, data: Buffer.from(await data.arrayBuffer()).toString("base64") });
  }
  return refs;
}

/** Pesan untuk user (tampil di chat) + petunjuk untuk model (tidak ditampilkan). */
function friendlyImageError(msg: string): { error: string; hint?: string } {
  const adminOnly = "Jangan sarankan user mencoba lagi; jelaskan bahwa admin perlu membereskannya, lalu tawarkan prompt gambar siap pakai.";
  if (/\[credits_required\]/.test(msg)) {
    return { error: "Pembuat gambar belum bisa dipakai: saldo OpenRouter admin habis. Kredit sudah dikembalikan.", hint: adminOnly };
  }
  if (/\[auth_invalid\]/.test(msg)) {
    return { error: "Pembuat gambar belum bisa dipakai: API key OpenRouter di server tidak valid. Kredit sudah dikembalikan.", hint: adminOnly };
  }
  if (/\[billing_required\]/.test(msg)) {
    return { error: "Pembuat gambar belum aktif: billing akun Google AI admin belum aktif. Kredit sudah dikembalikan.", hint: adminOnly };
  }
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
    return { error: "Layanan pembuat gambar sedang penuh. Kredit sudah dikembalikan — coba lagi beberapa menit lagi." };
  }
  if (/SAFETY|blocked|PROHIBITED|moderation/i.test(msg)) {
    return { error: "Permintaan gambar ditolak oleh filter keamanan. Coba ubah deskripsinya." };
  }
  return { error: "Pembuat gambar sedang bermasalah. Kredit sudah dikembalikan — coba lagi sebentar lagi." };
}

/** Instruksi kemampuan untuk system prompt — supaya model tidak pernah bilang "tidak bisa". */
export function capabilitiesPrompt(imageBlockedReason: string | null, opts: { webSearch?: boolean } = {}) {
  return [
    ...(opts.webSearch === false
      ? [
          "- **Pencarian web:** TIDAK tersedia di paket user (Free). Jawab dari pengetahuan kamu dengan kualitas terbaik; untuk angka, harga, tren, atau berita terbaru beri label \"perkiraan\" dan jangan mengarang sumber/link. Bila user minta riset terkini/sumber, sebut singkat (1 kalimat) bahwa Riset Web dengan sumber terbaru tersedia mulai paket Starter.",
        ]
      : []),
    "- **Membaca file:** isi file yang dilampirkan user (PDF, Word, Excel, PowerPoint, CSV, JSON, teks, gambar, PDF hasil scan) sudah tersedia di percakapan. Baca dan pahami seluruhnya; untuk Excel/CSV lakukan analisis angka (total, rata-rata, tren, perbandingan, insight). Jangan pernah bilang tidak bisa membuka file. Bila file terpotong, sebutkan bagian yang terbaca.",
    "- **Membaca tautan:** tautan (link) yang ditempel user otomatis dibuka sistem dan isinya ada di pesan user. Bisa: artikel/website, PDF & dokumen online, Google Docs/Sheets/Slides yang dibagikan publik, judul & deskripsi YouTube/TikTok. Tidak bisa: Instagram, Facebook, X, Threads, LinkedIn, Shopee, Tokopedia & halaman yang wajib login — untuk itu minta user menempel teks/caption atau mengirim screenshot. Jangan menebak isi tautan yang tidak terbaca.",
    imageBlockedReason
      ? `- **Membuat gambar:** saat ini TIDAK tersedia untuk user ini (${imageBlockedReason}). Bila diminta, jelaskan singkat lalu tawarkan prompt gambar siap pakai + arahan visual yang detail.`
      : "- **Membuat gambar:** bila user minta dibuatkan gambar/desain/visual/poster/konten feed, panggil tool `generate_image` (jangan hanya mendeskripsikan). Untuk edit/variasi gambar sebelumnya atau gambar dari user, isi `reference_ids` dengan id gambarnya. Gambar persis sesuai permintaan user — jangan menambahkan brand/logo/produk user ke gambar kecuali diminta. Setelah gambar jadi, cukup 1–2 kalimat singkat (mis. konsep visualnya); jangan menambahkan caption atau konten lain kecuali diminta, dan jangan menulis ulang URL gambar.",
    "- **Membuat PPT/slide:** bila user minta presentasi/PPT/deck/slide, panggil tool `create_presentation` dengan isi lengkap dan berkualitas (8–14 slide kecuali diminta lain) dan ikuti aturan desain di deskripsi tool: layout bervariasi (agenda, section, cards+ikon, stats, chart, timeline, comparison, table, quote, closing), teks ringkas, gambar cover, dan speaker notes. Bila ada dokumen terlampir, rangkum & susun slide dari dokumen itu seperti NotebookLM. Setelah file jadi, beri ringkasan singkat alur slide; jangan menulis ulang seluruh isi slide.",
    "- Jika tool mengembalikan error, sampaikan ke user dengan jujur dan singkat, lalu tawarkan alternatif.",
  ].join("\n");
}
