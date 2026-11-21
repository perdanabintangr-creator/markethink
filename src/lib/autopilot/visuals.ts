import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateImage } from "@/lib/ai/image";
import { imageAspectFor, LOOK_DNA, parseDna, slideVisualPromptFor, visualPromptFor, type StyleDna } from "./style";
import type { Look, Slide, SlideBrand } from "./slides";
import { productVisualPrompt } from "./products";
import sharp from "sharp";

const BUCKET = "uploads";
export const MAX_IMAGE_REGENS = 3;

/** Buat visual utama (AI) untuk cover, simpan ke storage milik user. Mengembalikan path, atau null bila gagal. */
export async function createVisual(
  admin: SupabaseClient,
  o: {
    userId: string;
    postId: string;
    look: Look;
    visual: string;
    brand: SlideBrand;
    style?: StyleDna | unknown;
    timeoutMs?: number;
    /** Produk dari katalog: foto aslinya dipakai sebagai acuan (produk tidak diubah). */
    product?: { name: string; photo_paths: string[] } | null;
    /** "slide" = visual layar penuh untuk slide isi (3:4). */
    frame?: "cover" | "slide";
  },
): Promise<string | null> {
  const started = Date.now();
  const dna = parseDna(o.style) ?? (o.look === "classic" ? LOOK_DNA.glossy : LOOK_DNA[o.look]);
  // Foto produk asli (maks 2, hanya dari folder user sendiri) → mode edit dengan acuan.
  const refs: { mime: string; data: string }[] = [];
  for (const path of (o.product?.photo_paths ?? []).filter((x) => x.startsWith(`${o.userId}/`) && !x.includes("..")).slice(0, 2)) {
    const { data } = await admin.storage.from(BUCKET).download(path);
    if (data) {
      const jpg = await sharp(Buffer.from(await data.arrayBuffer())).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
      refs.push({ mime: "image/jpeg", data: jpg.toString("base64") });
    }
  }
  const colors = { primary: o.brand.royal, accent: o.brand.cyan };
  const slideFrame = o.frame === "slide";
  const prompt = refs.length && o.product ? productVisualPrompt(slideFrame ? { ...dna, hero: "full" } : dna, o.product, o.visual) : slideFrame ? slideVisualPromptFor(dna, o.visual, colors) : visualPromptFor(dna, o.visual, colors);
  try {
    const img = await Promise.race([
      generateImage(prompt, slideFrame ? "3:4" : imageAspectFor(dna), refs, { premiumEdit: refs.length > 0 }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout gambar")), o.timeoutMs ?? 75_000)),
    ]);
    const ext = img.mime.includes("jpeg") || img.mime.includes("jpg") ? "jpg" : img.mime.includes("webp") ? "webp" : "png";
    const p = `${o.userId}/autopilot/${o.postId}/visual-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await admin.storage.from(BUCKET).upload(p, Buffer.from(img.bytes), { contentType: img.mime, upsert: true });
    if (error) throw error;
    await admin.from("usage_logs").insert({
      user_id: o.userId,
      tier: refs.length ? "autopilot-product" : "autopilot-image",
      provider: img.provider,
      model: img.model,
      latency_ms: Date.now() - started,
      est_cost_usd: img.costUsd ?? 0.034,
      credits: 0,
      status: "ok",
      error: img.notes ?? null,
    });
    return p;
  } catch (err) {
    console.error("[autopilot] visual gagal", err);
    await admin.from("usage_logs").insert({
      user_id: o.userId,
      tier: "autopilot-image",
      latency_ms: Date.now() - started,
      credits: 0,
      status: "error",
      error: `autopilot visual: ${err instanceof Error ? err.message : String(err)}`.slice(0, 1000),
    });
    return null;
  }
}

/** Path visual milik user yang dipakai slide (hanya folder autopilot user sendiri). */
export function visualPaths(userId: string, slides: Slide[]) {
  return slides.map((s) => s.image).filter((p): p is string => !!p && p.startsWith(`${userId}/autopilot/`) && !p.includes(".."));
}

/** Unduh visual yang dipakai slide → peta path → isi file (gagal satu → dilewati, slide memakai visual cadangan). */
export async function loadVisuals(admin: SupabaseClient, userId: string, slides: Slide[]) {
  const out: Record<string, Buffer> = {};
  await Promise.all(
    visualPaths(userId, slides).map(async (p) => {
      const { data } = await admin.storage.from(BUCKET).download(p);
      if (data) out[p] = Buffer.from(await data.arrayBuffer());
    }),
  );
  return out;
}

/** Jalankan tugas dengan batas paralel. */
export async function pool<T>(items: T[], limit: number, fn: (x: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift()!);
  }));
}

/**
 * Buat SATU gambar baru dari prompt Visual Director (opsional dengan gambar acuan: foto produk asli / talent
 * slide sebelumnya), simpan di folder user, catat biaya + meta (post, slide, subjek). null bila gagal/timeout.
 */
export async function generateSlideImage(
  admin: SupabaseClient,
  o: { userId: string; postId: string; slide: number; prompt: string; aspect: string; refs: { mime: string; data: string }[]; subject: string | null; timeoutMs?: number },
): Promise<{ path: string; bytes: Buffer } | null> {
  const started = Date.now();
  const meta = { post_id: o.postId, slide: o.slide, subject: o.subject, refs: o.refs.length };
  try {
    const img = await Promise.race([
      generateImage(o.prompt, o.aspect, o.refs, { premiumEdit: o.refs.length > 0 }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout gambar")), o.timeoutMs ?? 75_000)),
    ]);
    const bytes = await sharp(Buffer.from(img.bytes)).jpeg({ quality: 88 }).toBuffer();
    const p = `${o.userId}/autopilot/${o.postId}/s${o.slide}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.jpg`;
    const { error } = await admin.storage.from(BUCKET).upload(p, bytes, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;
    await admin.from("usage_logs").insert({
      user_id: o.userId,
      tier: o.refs.length ? "autopilot-image-ref" : "autopilot-image",
      provider: img.provider,
      model: img.model,
      latency_ms: Date.now() - started,
      est_cost_usd: img.costUsd ?? (o.refs.length ? 0.07 : 0.034),
      credits: 0,
      status: "ok",
      error: img.notes ?? null,
      meta,
    });
    return { path: p, bytes };
  } catch (err) {
    console.error("[autopilot] gambar slide gagal", o.postId, o.slide, err);
    await admin.from("usage_logs").insert({
      user_id: o.userId,
      tier: "autopilot-image",
      latency_ms: Date.now() - started,
      credits: 0,
      status: "error",
      error: `gambar slide ${o.slide}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 1000),
      meta,
    });
    return null;
  }
}

/** Foto produk milik user → acuan base64 (maks 2). */
export async function productRefs(admin: SupabaseClient, userId: string, paths: string[]) {
  const refs: { mime: string; data: string }[] = [];
  for (const path of paths.filter((x) => x.startsWith(`${userId}/`) && !x.includes("..")).slice(0, 2)) {
    const { data } = await admin.storage.from(BUCKET).download(path);
    if (data) {
      const jpg = await sharp(Buffer.from(await data.arrayBuffer())).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
      refs.push({ mime: "image/jpeg", data: jpg.toString("base64") });
    }
  }
  return refs;
}
