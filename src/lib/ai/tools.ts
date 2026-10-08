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
import { sanitizeFileName } from "@/lib/files";

export const IMAGE_CREDIT_COST = 5;
export const PPTX_CREDIT_COST = 3;
/** Kredit tambahan per gambar AI di dalam PPT (cover/slide bergambar). */
export const DECK_IMAGE_CREDIT_COST = 2;
const DECK_IMAGE_MAX = 6;
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
  /** Boleh membuat gambar AI untuk cover/slide PPT (paket berbayar). */
  deckImages?: boolean;
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
  row: { tier: string; provider?: string; model?: string; credits: number; cost: number; error?: string },
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
    error: row.error ?? null,
  });
}

export function createChatTools(ctx: ToolCtx) {
  return {
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
        if (!credit.ok) return { ok: false, error: `Kredit tidak cukup untuk membuat gambar (butuh ${IMAGE_CREDIT_COST}, sisa ${credit.remaining}).` };
        try {
          const refs = await loadReferences(ctx, reference_ids ?? []);
          const img = await generateImage(prompt, aspect_ratio, refs);
          const ext = img.mime.includes("jpeg") ? "jpg" : img.mime.split("/")[1] || "png";
          const saved = await storeFile(ctx, "images", `markethink-${Date.now()}.${ext}`, img.mime, img.bytes, `Gambar AI: ${prompt}`);
          await logUsage(ctx, { tier: "image", provider: img.provider, model: img.model, credits: IMAGE_CREDIT_COST, cost: img.costUsd ?? IMAGE_COST_USD });
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
        "Bila user melampirkan dokumen, dasarkan isi slide pada dokumen itu.",
      inputSchema: presentationSchema,
      execute: async (input): Promise<PresentationToolOutput> => {
        const pptxLimit = await ctx.dailyLimit?.("pptx");
        if (pptxLimit) return { ok: false, error: pptxLimit };
        const credit = await consumeCredits(ctx.userId, PPTX_CREDIT_COST, "presentation", { chatId: ctx.chatId });
        if (!credit.ok) return { ok: false, error: `Kredit tidak cukup untuk membuat PPT (butuh ${PPTX_CREDIT_COST}, sisa ${credit.remaining}).` };
        try {
          const images = await makeDeckImages(ctx, input);
          const bytes = await buildPresentation(input, images);
          const fileName = `${sanitizeFileName(input.title).slice(0, 60) || "presentasi"}.pptx`;
          const saved = await storeFile(
            ctx,
            "presentations",
            fileName,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            bytes,
            presentationOutline(input),
          );
          await logUsage(ctx, { tier: "pptx", credits: PPTX_CREDIT_COST, cost: 0 });
          const imageCount = Object.keys(images).length;
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
 * (paralel, maks DECK_IMAGE_MAX, hanya paket berbayar). Gambar yang gagal dilewati — slide tetap jadi.
 */
async function makeDeckImages(ctx: ToolCtx, input: PresentationInput): Promise<DeckImages> {
  const reqs = deckImageRequests(input, ctx.deckImages ? DECK_IMAGE_MAX : 0);
  if (!reqs.length) return {};
  const images: DeckImages = {};

  // 1) Foto milik user (mis. foto produk asli yang dilampirkan di chat).
  const owned = reqs.filter((r) => r.imageId && /^[0-9a-f-]{36}$/i.test(r.imageId));
  if (owned.length) {
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

  // 2) Gambar AI.
  const toGenerate = reqs.filter((r) => !r.imageId && r.prompt);
  if (!toGenerate.length || !ctx.deckImages) return images;
  const credit = await consumeCredits(ctx.userId, toGenerate.length * DECK_IMAGE_CREDIT_COST, "deck_images", { chatId: ctx.chatId });
  if (!credit.ok) return images;
  const results = await Promise.all(
    toGenerate.map(async (r) => {
      const style = r.product
        ? "Premium studio product photography, product centered and fully visible, soft shadow, clean seamless background, commercial advertising quality."
        : "Professional, high-quality editorial photo for a marketing presentation, cinematic lighting, clean composition.";
      try {
        const img = await Promise.race([
          generateImage(`${style} ${r.prompt}. No text, no words, no letters, no logos, no watermark.`, r.aspect),
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
export function capabilitiesPrompt(imageBlockedReason: string | null) {
  return [
    "- **Membaca file:** isi file yang dilampirkan user (PDF, Word, Excel, PowerPoint, CSV, JSON, teks, gambar, PDF hasil scan) sudah tersedia di percakapan. Baca dan pahami seluruhnya; untuk Excel/CSV lakukan analisis angka (total, rata-rata, tren, perbandingan, insight). Jangan pernah bilang tidak bisa membuka file. Bila file terpotong, sebutkan bagian yang terbaca.",
    imageBlockedReason
      ? `- **Membuat gambar:** saat ini TIDAK tersedia untuk user ini (${imageBlockedReason}). Bila diminta, jelaskan singkat lalu tawarkan prompt gambar siap pakai + arahan visual yang detail.`
      : "- **Membuat gambar:** bila user minta dibuatkan gambar/desain/visual/poster/konten feed, panggil tool `generate_image` (jangan hanya mendeskripsikan). Untuk edit/variasi gambar sebelumnya atau gambar dari user, isi `reference_ids` dengan id gambarnya. Gambar persis sesuai permintaan user — jangan menambahkan brand/logo/produk user ke gambar kecuali diminta. Setelah gambar jadi, cukup 1–2 kalimat singkat (mis. konsep visualnya); jangan menambahkan caption atau konten lain kecuali diminta, dan jangan menulis ulang URL gambar.",
    "- **Membuat PPT/slide:** bila user minta presentasi/PPT/deck/slide, panggil tool `create_presentation` dengan isi lengkap dan berkualitas (8–14 slide kecuali diminta lain) dan ikuti aturan desain di deskripsi tool: layout bervariasi (agenda, section, cards+ikon, stats, chart, timeline, comparison, table, quote, closing), teks ringkas, gambar cover, dan speaker notes. Bila ada dokumen terlampir, rangkum & susun slide dari dokumen itu seperti NotebookLM. Setelah file jadi, beri ringkasan singkat alur slide; jangan menulis ulang seluruh isi slide.",
    "- Jika tool mengembalikan error, sampaikan ke user dengan jujur dan singkat, lalu tawarkan alternatif.",
  ].join("\n");
}
