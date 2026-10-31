import { fitDeckToImages } from "@/lib/deck-fit";
import "server-only";
import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consumeCredits, creditsForUsd, refundCredits, settleCredits } from "@/lib/credits";
import { PREMIUM_EDIT_COST_USD, generateImage } from "@/lib/ai/image";
import {
  buildPresentation,
  deckImageRequests,
  imageSize,
  presentationOutline,
  presentationSchema,
  type DeckImages,
  type PresentationInput,
} from "@/lib/pptx";
import { buildScene, deckNeedsReference, imageStylePrompt, resolvePalette, signatureImageRequests, type SignatureImageRequest } from "@/lib/deck/engine";
import { renderScenePdf, renderScenePptx } from "@/lib/deck/render";
import { renderSlideImages } from "@/lib/deck/render-image";
import { buildCarouselScene, carouselImageRequests, carouselSchema } from "@/lib/deck/carousel";
import JSZip from "jszip";
import { sanitizeFileName } from "@/lib/files";
import type { BrandVisual } from "@/lib/ai/prompt";
import { MOOD_IDS, type MoodId } from "@/lib/deck/moods";
import { readToolResult } from "@/lib/addons/chat-context";
import { canvaEnabled, importAttachmentToCanva } from "@/lib/connectors/canva";
import { attachmentIdFromUrl, connectUrlFor } from "@/lib/connectors/apps";
import { connectorsText } from "@/lib/i18n/connectors";
import { BRAND_SLUG } from "@/lib/brand";

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
/** Panduan edit gambar acuan: hapus/ubah elemen sekaligus merapikan tata letak (seperti editor desain), bukan sekadar menghapus. */
const EDIT_GUIDANCE =
  "EDITING RULES: This is an edit of the attached reference image — reproduce it faithfully (same style, fonts, colors, background, logo, " +
  "text) except for the requested changes. When an element is removed or added, re-flow the layout like a professional designer: " +
  "redistribute the remaining items evenly across the available space (equal widths and gaps, no empty hole where the removed item was), " +
  "renumber sequences (01, 02, 03…), keep connectors/lines continuous, and keep margins and alignment consistent. Keep all text sharp and correctly spelled.";
const PREMIUM_ART_DIRECTION =
  "Execute at premium creative-agency quality: refined composition, rich detail, polished lighting and color grading, faithful to the requested style.";
/** Perkiraan biaya per gambar (USD) bila provider tidak melaporkan biaya nyata. */
const IMAGE_COST_USD = 0.04;

export const CAROUSEL_CREDIT_COST = 2;
/** Maks foto AI per carousel (selain foto milik user). */
const CAROUSEL_IMAGE_MAX = 6;

export type CarouselToolOutput =
  | {
      ok: true;
      attachmentId: string;
      url: string;
      title: string;
      format: string;
      slideCount: number;
      /** JPEG tiap slide (siap upload ke Instagram/TikTok). */
      slides: string[];
      pdfUrl: string;
      sceneUrl: string;
      previewImages?: Record<string, string>;
      caption?: string;
    }
  | { ok: false; error: string };

export type ProductPhotoOutput =
  | { ok: true; images: { attachmentId: string; url: string }[]; style: string; failed: number }
  | { ok: false; error: string; hint?: string };

const PRODUCT_STYLES = {
  studio_putih: "a clean seamless white studio background, soft diffused light, subtle natural shadow — premium e-commerce catalog photo",
  studio_warna: "a seamless colored studio backdrop in a color that complements the product, soft studio light — modern catalog style",
  lifestyle: "a realistic lifestyle scene where the product is naturally used in an Indonesian setting, natural window light",
  flatlay: "a top-down flat lay on a styled surface with a few relevant props, balanced composition, soft light",
  outdoor: "an outdoor natural setting, warm golden-hour light, shallow depth of field",
  premium_gelap: "a dark premium moody backdrop, dramatic rim light and reflections — luxury advertising look",
} as const;
const PRODUCT_ANGLES = ["front three-quarter view", "slightly elevated angle with props", "close-up hero shot", "side view with negative space for text"];

export type ImageToolOutput =
  | { ok: true; attachmentId: string; url: string; prompt: string; aspectRatio: string }
  | { ok: false; error: string; hint?: string };

export type SendToCanvaOutput =
  | { ok: true; editUrl: string; viewUrl?: string; title: string; hint?: string }
  | { ok: false; needsConnect: true; connectUrl: string; error: string }
  | { ok: false; error: string; code?: string };

/** Maks kirim ke Canva per pesan. */
const MAX_CANVA_SENDS = 3;

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
      /** PPTX yang teksnya bisa diedit (tampilan bisa sedikit berbeda antar aplikasi). */
      editableUrl?: string;
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
  /** Gaya deck sesuai paket (Promax = Signature). */
  deckStyle?: DeckStyle;
  /** Identitas visual dari Brand Kit project aktif (warna, logo, gaya, akun sosmed). */
  brand?: BrandVisual | null;
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
  let canvaSends = 0;
  return {
    read_tool_result: tool({
      description:
        "Baca hasil Marqthink Smart Tools milik user (versi terbaru), mis. persona, kalender konten, marketing plan, riset pasar. " +
        "Pakai id dari daftar HASIL SMART TOOLS MILIK USER di instruksi sistem, setiap kali user menyinggung hasil yang dibuat di Smart Tools. " +
        `Maksimal ${MAX_TOOL_READS} hasil per pesan — pilih yang paling relevan. Default versi ringkas; lengkap=true bila butuh detail (mis. temuan riset).`,
      inputSchema: z.object({
        run_id: z.string().uuid().describe("id hasil dari daftar HASIL SMART TOOLS MILIK USER"),
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
        // Edit gambar acuan di Pro & Promax memakai model edit yang lebih pintar; kredit dipotong sesuai biaya nyata (lingkaran kuota ikut penuh).
        // Sisa kuota tidak cukup untuk edit premium → tetap dikerjakan dengan model biasa.
        let premiumEdit = Boolean(ctx.premiumVisuals && reference_ids?.length);
        let charged = premiumEdit ? creditsForUsd(PREMIUM_EDIT_COST_USD) : IMAGE_CREDIT_COST;
        let credit = await consumeCredits(ctx.userId, charged, premiumEdit ? "image_edit" : "image", { chatId: ctx.chatId });
        if (!credit.ok && premiumEdit) {
          premiumEdit = false;
          charged = IMAGE_CREDIT_COST;
          credit = await consumeCredits(ctx.userId, charged, "image", { chatId: ctx.chatId });
        }
        if (!credit.ok) return { ok: false, error: "Sisa kuota bulan ini tidak cukup untuk membuat gambar. Sampaikan ke user tanpa menyebut angka; kuota reset tiap tanggal 1 atau upgrade paket." };
        try {
          const refs = await loadReferences(ctx, reference_ids ?? []);
          const brandColors = [ctx.brand?.colorPrimary, ctx.brand?.colorSecondary].filter(Boolean).join(" and ");
          const finalPrompt =
            (refs.length ? `${prompt}\n\n${EDIT_GUIDANCE}` : ctx.premiumVisuals ? `${prompt}\n\n${PREMIUM_ART_DIRECTION}` : prompt) +
            (brandColors && !refs.length ? `\nWhere it fits naturally, use the brand colors ${brandColors} as accent colors.` : "");
          const img = await generateImage(finalPrompt, aspect_ratio, refs, { budget: ctx.budgetImages, premiumEdit: premiumEdit && refs.length > 0 });
          const ext = img.mime.includes("jpeg") ? "jpg" : img.mime.split("/")[1] || "png";
          const saved = await storeFile(ctx, "images", `${BRAND_SLUG}-${Date.now()}.${ext}`, img.mime, img.bytes, `Gambar AI: ${prompt}`);
          const cost = img.costUsd ?? IMAGE_COST_USD;
          // Edit premium: sesuaikan potongan ke biaya nyata (min. tarif gambar biasa); jatuh ke model biasa → tarif biasa.
          const credits = premiumEdit ? Math.max(IMAGE_CREDIT_COST, creditsForUsd(cost)) : IMAGE_CREDIT_COST;
          if (credits !== charged) await settleCredits(ctx.userId, charged, credits, "image_edit", { chatId: ctx.chatId });
          await logUsage(ctx, { tier: "image", provider: img.provider, model: img.model, credits, cost, note: img.notes });
          return { ok: true, attachmentId: saved.id, url: saved.url, prompt, aspectRatio: aspect_ratio };
        } catch (err) {
          console.error("[image] gagal", err);
          await refundCredits(ctx.userId, charged, "image_failed");
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
          if (ctx.brand?.colorPrimary && !input.brand_color) input = { ...input, brand_color: ctx.brand.colorPrimary };
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

    create_carousel: tool({
      description:
        "Buat carousel Instagram/TikTok (2–10 slide) atau poster/feed tunggal (1 slide) berdesain agency, siap posting: file JPEG per slide + PDF. " +
        "Pakai setiap kali user minta carousel, konten slide IG/LinkedIn, poster, flyer, feed, atau konten edukasi/promo bergambar berisi teks. " +
        "(Untuk gambar/ilustrasi TANPA teks tetap pakai generate_image.) " +
        "ATURAN: slide 1 = hook yang menghentikan scroll (judul ≤ 8 kata, janji manfaat/angka/pertanyaan); slide tengah 1 ide per slide " +
        "(point/list/stat/quote); slide terakhir = cta (ajakan jelas: simpan, follow, beli, DM). Teks sangat ringkas & besar — maks 2 kalimat per slide. " +
        "Format default 4:5 (feed IG); 9:16 untuk Story/Reels/TikTok; 1:1 bila diminta. WAJIB isi `design` seperti PPT (mood sesuai gaya user & topik, " +
        "kv, palette, image_style; 'lucu' → playful + 3d). Beri image_prompt pada slide 1 (dan maks 2 slide lain bila membantu); foto produk user → image_id. " +
        "Isi `caption` siap posting (hook, isi singkat, CTA, 5–10 hashtag relevan). Setelah jadi, balas maks 3 baris; jangan mengulang isi slide.",
      inputSchema: carouselSchema,
      execute: async (raw): Promise<CarouselToolOutput> => {
        const limit = await ctx.dailyLimit?.("pptx");
        if (limit) return { ok: false, error: limit };
        const credit = await consumeCredits(ctx.userId, CAROUSEL_CREDIT_COST, "carousel", { chatId: ctx.chatId });
        if (!credit.ok) return { ok: false, error: "Sisa kuota bulan ini tidak cukup untuk membuat carousel. Sampaikan ke user tanpa menyebut angka." };
        try {
          const input = applyBrand(raw, ctx.brand);
          const design = { theme: input.theme ?? ("midnight" as const), brand_color: input.brand_color, design: input.design };
          const reqs = [
            ...carouselImageRequests(input, Math.min(ctx.deckImageMax ?? 0, CAROUSEL_IMAGE_MAX)),
            ...(ctx.brand?.logoId ? [{ key: "logo", aspect: "1:1", imageId: ctx.brand.logoId, composition: "" }] : []),
          ];
          const images = await makeSignatureImages(ctx, design, reqs);
          const dims = Object.fromEntries(Object.entries(images).map(([k, v]) => [k, { width: v.width, height: v.height }]));
          const scene = buildCarouselScene(input, dims, { handle: ctx.brand?.handle, brandName: ctx.brand?.name });
          const base = sanitizeFileName(input.title).slice(0, 50) || "carousel";
          const [jpgs, pdfBytes] = await Promise.all([renderSlideImages(scene, images), renderScenePdf(scene, images, input.title)]);
          const zip = new JSZip();
          jpgs.forEach((j, i) => zip.file(`${base}-${String(i + 1).padStart(2, "0")}.jpg`, j));
          const zipBytes = await zip.generateAsync({ type: "uint8array" });
          const [zipFile, pdf, sceneFile, previewImages, ...slideFiles] = await Promise.all([
            storeFile(ctx, "presentations", `${base}.zip`, "application/zip", zipBytes, input.slides.map((sl) => sl.title).join(" | ")),
            storeFile(ctx, "presentations", `${base}.pdf`, "application/pdf", pdfBytes, null),
            storeFile(ctx, "presentations", `${base}.scene.json`, "application/json", new TextEncoder().encode(JSON.stringify(scene)), null),
            deckPreviewUrls(ctx, presentationLike(input), images, reqs),
            ...jpgs.map((j, i) => storeFile(ctx, "images", `${base}-${String(i + 1).padStart(2, "0")}.jpg`, "image/jpeg", new Uint8Array(j), null)),
          ]);
          await logUsage(ctx, { tier: "carousel", credits: CAROUSEL_CREDIT_COST, cost: 0, note: `carousel:${scene.mood}:${input.format}` });
          return {
            ok: true,
            attachmentId: zipFile.id,
            url: zipFile.url,
            title: input.title,
            format: input.format,
            slideCount: input.slides.length,
            slides: slideFiles.map((f) => f.url),
            pdfUrl: pdf.url,
            sceneUrl: sceneFile.url,
            previewImages,
            caption: input.caption,
          };
        } catch (err) {
          console.error("[carousel] gagal", err);
          await refundCredits(ctx.userId, CAROUSEL_CREDIT_COST, "carousel_failed");
          return { ok: false, error: `Gagal membuat carousel: ${errText(err)}` };
        }
      },
    }),

    product_photo: tool({
      description:
        "Foto Produk Studio: ubah foto produk dari HP milik user menjadi foto katalog/iklan profesional (produk TETAP sama persis). " +
        "Pakai saat user mengirim foto produk dan minta foto katalog, foto marketplace (Shopee/Tokopedia), foto iklan, ganti background, atau foto lifestyle produk. " +
        "Butuh id foto produk dari user (lihat '[Gambar dari user: … — id: …]'); bila belum ada, minta user melampirkan foto produknya dulu. " +
        "Pilih style sesuai permintaan (default studio_putih untuk marketplace). Setelah jadi, balas 1–2 kalimat + saran pemakaian.",
      inputSchema: z.object({
        image_id: z.string().uuid().describe("ID foto produk milik user"),
        style: z.enum(Object.keys(PRODUCT_STYLES) as [keyof typeof PRODUCT_STYLES, ...(keyof typeof PRODUCT_STYLES)[]]).default("studio_putih"),
        count: z.number().int().min(1).max(4).default(2).describe("Jumlah variasi (1–4)"),
        aspect_ratio: z.enum(["1:1", "4:5", "9:16", "16:9"]).default("1:1").describe("1:1 untuk marketplace"),
        notes: z.string().max(300).optional().describe("Arahan tambahan (bahasa Inggris): warna latar, properti, suasana"),
      }),
      execute: async ({ image_id, style, count, aspect_ratio, notes }): Promise<ProductPhotoOutput> => {
        if (ctx.imageBlockedReason) return { ok: false, error: ctx.imageBlockedReason };
        const limit = await ctx.dailyLimit?.("image");
        if (limit) return { ok: false, error: limit };
        // Paket dengan batas harian gambar (Free) cukup 1 variasi per permintaan.
        const n = ctx.deckImageMax ? count : 1;
        const refs = await loadReferences(ctx, [image_id]);
        if (!refs.length) return { ok: false, error: "Foto produk tidak ditemukan. Minta user melampirkan foto produknya lagi." };
        const credit = await consumeCredits(ctx.userId, n * IMAGE_CREDIT_COST, "image", { chatId: ctx.chatId });
        if (!credit.ok) return { ok: false, error: "Sisa kuota bulan ini tidak cukup untuk membuat foto produk. Sampaikan ke user tanpa menyebut angka." };
        const results = await Promise.all(
          Array.from({ length: n }, async (_, k) => {
            const prompt =
              "Professional product photography. Keep THE EXACT product from the reference photo unchanged — same shape, proportions, colors, " +
              "label, logo and all text on the packaging; do not redesign or retype it. Remove the original messy background and phone-photo look. " +
              `Place the product in ${PRODUCT_STYLES[style]}. Composition: ${PRODUCT_ANGLES[k % PRODUCT_ANGLES.length]}. ` +
              `${notes ? `${notes}. ` : ""}Photorealistic, sharp focus on the product, high-end commercial quality. No added text, no watermark.`;
            try {
              const img = await generateImage(prompt, aspect_ratio, refs);
              const ext = img.mime.includes("jpeg") ? "jpg" : img.mime.split("/")[1] || "png";
              const saved = await storeFile(ctx, "images", `foto-produk-${style}-${k + 1}.${ext}`, img.mime, img.bytes, null);
              await logUsage(ctx, { tier: "image", provider: img.provider, model: img.model, credits: IMAGE_CREDIT_COST, cost: img.costUsd ?? IMAGE_COST_USD, note: `product:${style}` });
              return { attachmentId: saved.id, url: saved.url };
            } catch (err) {
              console.warn("[product_photo] gagal", errText(err));
              return null;
            }
          }),
        );
        const ok = results.filter((r): r is { attachmentId: string; url: string } => Boolean(r));
        const failed = n - ok.length;
        if (failed) await refundCredits(ctx.userId, failed * IMAGE_CREDIT_COST, "image_failed");
        if (!ok.length) return { ok: false, error: "Foto produk gagal dibuat. Coba lagi sebentar lagi." };
        return { ok: true, images: ok, style, failed };
      },
    }),

    ...(canvaEnabled()
      ? {
          send_to_canva: tool({
            description:
              "Kirim file hasil Marqthink (PPT, carousel/poster, gambar AI, foto produk) atau gambar dari user ke akun Canva milik user " +
              "sebagai desain yang bisa diedit, lalu dapat link 'Buka di Canva'. Pakai saat user menyebut @Canva atau minta hasil diedit/dibuka/dikirim ke Canva. " +
              "attachment_id: PPT = id file PPT; carousel/poster = id PDF-nya (atau id ZIP-nya); gambar = id gambar. Tidak memotong kuota user.",
            inputSchema: z.object({
              attachment_id: z.string().min(8).max(300).describe("ID file (uuid) atau URL /api/attachments/<id> dari hasil sebelumnya"),
              title: z.string().max(100).optional().describe("Judul desain di Canva (opsional)"),
            }),
            execute: async ({ attachment_id, title }): Promise<SendToCanvaOutput> => {
              const id = attachmentIdFromUrl(attachment_id);
              if (!id) return { ok: false, error: "ID file tidak valid. Pakai id file dari hasil PPT/carousel/gambar sebelumnya." };
              if (canvaSends >= MAX_CANVA_SENDS) return { ok: false, error: `Batas ${MAX_CANVA_SENDS} kiriman ke Canva per pesan tercapai.` };
              canvaSends++;
              const res = await importAttachmentToCanva(ctx.userId, id, title);
              const c = connectorsText("id");
              if (res.ok) {
                return {
                  ok: true,
                  editUrl: res.editUrl,
                  viewUrl: res.viewUrl,
                  title: res.title,
                  hint: "Kartu dengan tombol 'Buka di Canva' sudah tampil untuk user. Balas 1 kalimat saja; jangan menulis ulang URL.",
                };
              }
              if (res.needsConnect) return { ok: false, needsConnect: true, connectUrl: connectUrlFor("canva", `/chat/${ctx.chatId}`), error: c.errors.needs_connect };
              return { ok: false, error: c.errors[res.code], code: res.code };
            },
          }),
        }
      : {}),
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

/**
 * Siapkan gambar untuk deck: PNG/JPEG apa adanya; format lain (mis. WebP dari Meta Muse, yang sering berlabel "image/png")
 * diubah ke JPEG — PDF hanya mendukung PNG/JPEG, sebelumnya gambar seperti ini hilang dari PDF.
 */
async function deckReadyImage(bytes: Uint8Array, mime: string): Promise<DeckImages[string] | null> {
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  let out = bytes;
  let type = isPng ? "image/png" : isJpeg ? "image/jpeg" : mime;
  // Hemat penyimpanan (foto ikut tersimpan di PPT, PDF & pratinjau): maks 1600 px, JPEG — PNG transparan tetap PNG.
  try {
    const sharp = (await import("sharp")).default;
    const img = sharp(Buffer.from(bytes)).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
    const meta = await sharp(Buffer.from(bytes)).metadata();
    if (meta.hasAlpha) {
      out = new Uint8Array(await img.png({ compressionLevel: 9 }).toBuffer());
      type = "image/png";
    }
    else {
      out = new Uint8Array(await img.jpeg({ quality: 84, mozjpeg: true }).toBuffer());
      type = "image/jpeg";
    }
  } catch (err) {
    console.warn("[deck] kompres gambar gagal", errText(err));
    if (!isPng && !isJpeg) return null;
  }
  const size = imageSize(out);
  return size ? { data: Buffer.from(out).toString("base64"), mime: type, ...size } : null;
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
      const img = await deckReadyImage(new Uint8Array(await data.arrayBuffer()), row.mime as string);
      if (img) images[r.key] = img;
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
        const ready = await deckReadyImage(img.bytes, img.mime);
        if (!ready) return false;
        images[r.key] = ready;
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
  "\nGAYA SIGNATURE (paket ini — kualitas tertinggi, setara deck agency): WAJIB isi `design`, dan desainnya HARUS mengikuti permintaan & " +
  "dunia user, bukan gaya default. (a) Baca kata gaya dari user lebih dulu (lucu/imut/gemas, elegan, mewah, minimalis, retro, sporty, " +
  "garang, natural, dsb.) lalu topik/industri, kemudian pilih `design.mood` yang paling sesuai — contoh: 'lucu'/anak/snack manis → playful; " +
  "otomotif/balap/bengkel/olahraga → sport; F&B/kopi/restoran → warm; skincare/wedding → beauty; properti/fashion premium → editorial; " +
  "budaya/pariwisata → heritage; B2B/keuangan → corporate; gaming/teknologi/event malam → tech. JANGAN memakai tech/gelap untuk tema yang " +
  "bukan teknologi/malam. (b) `design.image_style` mengikuti user: 'lucu'/maskot/anak → 3d atau flat; selain itu photo kecuali diminta lain. " +
  "(c) `design.kv` = satu dunia visual konsisten berisi ELEMEN KHAS topik (mis. otomotif: mobil/motor, aspal, garasi, garis kecepatan; " +
  "F&B: makanan/minuman, bahan, meja, uap, cahaya hangat; lucu: karakter/maskot imut, warna pastel) — semua gambar dibuat dari KV ini " +
  "sehingga tokoh & suasananya sama. (d) `design.palette` dari KV & brand: terang & ceria untuk lucu/F&B/beauty, gelap hanya bila temanya " +
  "malam/teknologi/premium gelap; kontras teks tinggi. (e) Isi `design.cover_kicker`, `design.tagline`, `design.presenter` bila relevan. " +
  "Isi juga `design.cast` = deskripsi tetap 1–2 tokoh/maskot utama (usia, rambut, pakaian & warnanya, aksesori) bila deck memakai orang/maskot. " +
  "(f) Beri image_prompt pada ± 7 slide terpenting (cards, section, stats, closing, quote, image_text; untuk mood tech/sport/bold/modern " +
  "juga timeline & comparison): tulis ADEGAN-nya saja dengan elemen khas topik (siapa/apa, melakukan apa, di mana) — gaya & komposisi " +
  "diatur otomatis. Untuk cards 2 kartu pada mood tech/sport/bold/modern, gambarkan dua subjek kiri-kanan. (g) Teks sangat ringkas: " +
  "kicker 2–4 kata, judul ≤ 7 kata yang kuat & sesuai nada user (lucu → ringan & playful), isi kartu 2–3 kalimat pendek, takeaway 1 kalimat.";

/** KV dulu (jadi acuan), lalu foto slide lain dibuat dari KV agar tokoh, tempat & warna konsisten. */
async function makeSignatureImages(
  ctx: ToolCtx,
  input: Pick<PresentationInput, "theme" | "brand_color" | "design">,
  reqs: SignatureImageRequest[],
): Promise<DeckImages> {
  const images: DeckImages = {};
  await loadOwnedImages(ctx, reqs, images);
  const toGenerate = reqs.filter((r) => !r.imageId && r.prompt);
  if (!toGenerate.length || !ctx.deckImageMax) return images;
  const credit = await consumeCredits(ctx.userId, toGenerate.length * DECK_IMAGE_CREDIT_COST, "deck_images", { chatId: ctx.chatId });
  if (!credit.ok) return images;
  const world = input.design?.kv?.trim();
  const cast = input.design?.cast?.trim();
  const look = imageStylePrompt(input);
  // Hybrid (founder ACC 17 Okt): KV dibuat model utama, foto slide pakai Muse (hemat ±70%) dengan "naskah" tokoh & warna yang dikunci.
  // Maskot/ilustrasi lucu tetap memakai KV sebagai acuan agar karakternya tidak berubah bentuk.
  const useRefs = deckNeedsReference(input);
  const pal = resolvePalette(input);
  const grade = `Consistent color grade across the series: dominant tones #${pal.bg} and #${pal.surface}, accent light #${pal.accent} and #${pal.accent2}.`;
  const NO_TEXT = "No text, no words, no letters, no logos, no watermark.";
  let failed = 0;
  const run = async (r: SignatureImageRequest, refs: { mime: string; data: string }[]) => {
    const prompt = refs.length
      ? `Create a new image in exactly the same visual world and art style as the reference image: same setting style, same characters' look and wardrobe if people appear, ` +
        `same color palette, lighting and color grade. Scene: ${r.prompt}. ${r.composition} ${world ? `World: ${world}. ` : ""}` +
        `${look} ${NO_TEXT}`
      : r.product
        ? `Premium product shot: ${r.prompt}. ${r.composition} ${world ? `Mood: ${world}. ` : ""}${look} ${NO_TEXT}`
        : r.key === "cover"
          ? `${world ? `${world}. ` : ""}${cast ? `Main characters: ${cast}. ` : ""}${r.prompt}. ${r.composition} Premium campaign key visual. ${grade} ${look} ${NO_TEXT}`
          : `Part of one consistent campaign photo series. ${world ? `World: ${world}. ` : ""}` +
            `${cast ? `Recurring characters (identical look, hair, wardrobe and colors in every image): ${cast}. ` : ""}` +
            `Scene: ${r.prompt}. ${r.composition} Camera: medium-wide, side, over-the-shoulder or back view; avoid close-up faces. ${grade} ${look} ${NO_TEXT}`;
    try {
      const img = await Promise.race([
        generateImage(prompt, r.aspect, refs, { budget: !refs.length && r.key !== "cover" }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout gambar deck")), 90_000)),
      ]);
      const ready = await deckReadyImage(img.bytes, img.mime);
      if (!ready) throw new Error("format gambar tidak dikenal");
      images[r.key] = ready;
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
  const refs = kv && useRefs ? [{ mime: kv.mime, data: kv.data }] : [];
  // 2) Foto slide lain paralel: Muse dengan naskah terkunci, atau mengacu ke KV untuk maskot/ilustrasi (foto produk tanpa acuan).
  await Promise.all(toGenerate.filter((r) => r !== kvReq).map((r) => run(r, r.product ? [] : refs)));
  if (failed) await refundCredits(ctx.userId, failed * DECK_IMAGE_CREDIT_COST, "deck_images_failed");
  return images;
}

/** deckPreviewUrls hanya butuh daftar foto milik user; bentuk carousel cukup dibungkus seperti deck. */
function presentationLike(input: { title: string }): PresentationInput {
  return { title: input.title, theme: "midnight", cover_style: "hero", slides: [] } as unknown as PresentationInput;
}

/** Terapkan Brand Kit: warna brand jadi aksen, gaya desain pilihan user menang atas pilihan AI. */
export function applyBrand<T extends { brand_color?: string; design?: PresentationInput["design"] }>(input: T, brand?: BrandVisual | null): T {
  if (!brand) return input;
  const out = { ...input };
  if (brand.colorPrimary) out.brand_color = brand.colorPrimary;
  if (out.design) {
    const palette = { ...(out.design.palette ?? {}) };
    if (brand.colorPrimary) palette.accent = brand.colorPrimary;
    if (brand.colorSecondary) palette.accent2 = brand.colorSecondary;
    const mood = MOOD_IDS.includes(brand.mood as MoodId) ? (brand.mood as MoodId) : out.design.mood;
    out.design = { ...out.design, mood, palette };
  }
  return out;
}

async function signatureDeck(ctx: ToolCtx, rawInput: PresentationInput): Promise<PresentationToolOutput> {
  const input = applyBrand(rawInput, ctx.brand);
  const reqs = [
    ...signatureImageRequests(input, ctx.deckImageMax ?? 0),
    ...(ctx.brand?.logoId ? [{ key: "logo", aspect: "1:1", imageId: ctx.brand.logoId, composition: "" }] : []),
  ];
  const images = await makeSignatureImages(ctx, input, reqs);
  // Slide produk/galeri/gambar+teks yang tidak mendapat foto → versi teks rapi.
  const deck = fitDeckToImages(input, (key) => Boolean(images[key]));
  const dims = Object.fromEntries(Object.entries(images).map(([k, v]) => [k, { width: v.width, height: v.height }]));
  const scene = buildScene(deck, { images: dims });
  const base = sanitizeFileName(input.title).slice(0, 60) || "presentasi";
  // Founder (17 Okt): satu tombol "Unduh PPT" = versi yang bisa diedit (font ditanam). PDF untuk tampilan persis.
  const [pptxBytes, pdfBytes] = await Promise.all([renderScenePptx(scene, images, input.title), renderScenePdf(scene, images, input.title)]);
  const outline = presentationOutline(deck);
  const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  const [saved, pdf, sceneFile, previewImages] = await Promise.all([
    storeFile(ctx, "presentations", `${base}.pptx`, PPTX_MIME, pptxBytes, outline),
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
    return { error: "Layanan pembuat gambar sedang penuh. Kredit sudah dikembalikan, coba lagi beberapa menit lagi." };
  }
  if (/SAFETY|blocked|PROHIBITED|moderation/i.test(msg)) {
    return { error: "Permintaan gambar ditolak oleh filter keamanan. Coba ubah deskripsinya." };
  }
  return { error: "Pembuat gambar sedang bermasalah. Kredit sudah dikembalikan, coba lagi sebentar lagi." };
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
    "- **Membuat PPT/slide:** bila user minta presentasi/PPT/deck/slide, panggil tool `create_presentation` dengan isi lengkap dan berkualitas (8–14 slide kecuali diminta lain) dan ikuti aturan desain di deskripsi tool: layout bervariasi (agenda, section, cards+ikon, stats, chart, timeline, comparison, table, quote, closing), teks ringkas, gambar cover, dan speaker notes. Bila ada dokumen terlampir, rangkum & susun slide dari dokumen itu seperti NotebookLM. Setelah file jadi, balas SINGKAT (maks 4 baris): 1 kalimat asumsi utama + 2–3 poin yang perlu user sesuaikan. JANGAN membuat tabel atau mengulang daftar/isi slide (sudah tampil di kartu PPT).",
    "- **Carousel & poster:** bila user minta carousel IG/TikTok/LinkedIn, poster, flyer, atau konten feed berisi teks, panggil `create_carousel` (bukan generate_image) — hasilnya file JPEG per slide + PDF + caption siap posting.",
    canvaEnabled()
      ? "- **Canva (@Canva):** bila user menyebut @Canva atau minta hasil diedit/dibuka di Canva, panggil `send_to_canva` dengan id file hasil Marqthink (PPT: id file PPT; carousel/poster: id PDF; gambar: id gambar) atau gambar dari user. Bila belum ada hasil yang cocok, buat dulu (create_presentation / create_carousel / generate_image) lalu kirim. Bila hasilnya needsConnect, minta user menekan tombol Hubungkan Canva di kartu, lalu minta lagi. Setelah berhasil cukup 1 kalimat; jangan menulis ulang URL."
      : "",
    imageBlockedReason
      ? ""
      : "- **Foto Produk Studio:** bila user mengirim foto produk dan minta foto katalog/marketplace/iklan/ganti background, panggil `product_photo` dengan id fotonya (produk dijaga sama persis).",
    "- Jika tool mengembalikan error, sampaikan ke user dengan jujur dan singkat, lalu tawarkan alternatif.",
  ].join("\n");
}
