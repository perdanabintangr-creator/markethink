import "server-only";
import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consumeCredits, refundCredits } from "@/lib/credits";
import { generateImage } from "@/lib/ai/image";
import { buildPresentation, presentationOutline, presentationSchema } from "@/lib/pptx";
import { sanitizeFileName } from "@/lib/files";

export const IMAGE_CREDIT_COST = 5;
export const PPTX_CREDIT_COST = 3;
/** Perkiraan biaya per gambar (USD) bila provider tidak melaporkan biaya nyata. */
const IMAGE_COST_USD = 0.04;

export type ImageToolOutput =
  | { ok: true; attachmentId: string; url: string; prompt: string; aspectRatio: string }
  | { ok: false; error: string; hint?: string };

export type PresentationToolOutput =
  | { ok: true; attachmentId: string; url: string; title: string; slideCount: number; slideTitles: string[]; fileName: string }
  | { ok: false; error: string };

interface ToolCtx {
  admin: SupabaseClient;
  userId: string;
  chatId: string;
  /** null = gambar boleh; string = alasan gambar tidak tersedia (disampaikan model ke user). */
  imageBlockedReason: string | null;
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
        "Buat file presentasi PowerPoint (.pptx) yang siap diunduh — pitch deck, laporan kampanye, strategi marketing, ringkasan dokumen/riset " +
        "(seperti NotebookLM). Gunakan setiap kali user meminta PPT/slide/deck/presentasi. Susun alur cerita yang kuat: masalah → insight → strategi → " +
        "eksekusi → KPI → penutup. Isi padat & spesifik (angka, contoh nyata), bukan placeholder. Variasikan layout (section, stats, two_column, quote). " +
        "Bila user melampirkan dokumen, dasarkan isi slide pada dokumen itu.",
      inputSchema: presentationSchema,
      execute: async (input): Promise<PresentationToolOutput> => {
        const credit = await consumeCredits(ctx.userId, PPTX_CREDIT_COST, "presentation", { chatId: ctx.chatId });
        if (!credit.ok) return { ok: false, error: `Kredit tidak cukup untuk membuat PPT (butuh ${PPTX_CREDIT_COST}, sisa ${credit.remaining}).` };
        try {
          const bytes = await buildPresentation(input);
          const fileName = `${sanitizeFileName(input.title).slice(0, 60) || "presentasi"}.pptx`;
          const saved = await storeFile(
            ctx,
            "presentations",
            fileName,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            bytes,
            presentationOutline(input),
          );
          return {
            ok: true,
            attachmentId: saved.id,
            url: saved.url,
            title: input.title,
            slideCount: input.slides.length + 1,
            slideTitles: [input.title, ...input.slides.map((s) => s.title)],
            fileName,
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
      : "- **Membuat gambar:** bila user minta dibuatkan gambar/desain/visual/poster/konten feed, panggil tool `generate_image` (jangan hanya mendeskripsikan). Untuk edit/variasi gambar sebelumnya atau gambar dari user, isi `reference_ids` dengan id gambarnya. Setelah gambar jadi, beri 1–3 kalimat penjelasan konsep + saran caption bila relevan; jangan menulis ulang URL gambar.",
    "- **Membuat PPT/slide:** bila user minta presentasi/PPT/deck/slide, panggil tool `create_presentation` dengan isi lengkap dan berkualitas (8–14 slide kecuali diminta lain, layout bervariasi, speaker notes yang membantu). Bila ada dokumen terlampir, rangkum & susun slide dari dokumen itu seperti NotebookLM. Setelah file jadi, beri ringkasan singkat alur slide; jangan menulis ulang seluruh isi slide.",
    "- Jika tool mengembalikan error, sampaikan ke user dengan jujur dan singkat, lalu tawarkan alternatif.",
  ].join("\n");
}
