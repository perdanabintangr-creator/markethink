import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateImage } from "@/lib/ai/image";
import { visualPrompt } from "./plan";
import type { Look, Slide, SlideBrand } from "./slides";

const BUCKET = "uploads";
export const MAX_IMAGE_REGENS = 3;

/** Buat visual utama (AI) untuk cover, simpan ke storage milik user. Mengembalikan path, atau null bila gagal. */
export async function createVisual(
  admin: SupabaseClient,
  o: { userId: string; postId: string; look: Look; visual: string; brand: SlideBrand; timeoutMs?: number },
): Promise<string | null> {
  const started = Date.now();
  const prompt = visualPrompt(o.look, o.visual, { primary: o.brand.royal, accent: o.brand.cyan });
  try {
    const img = await Promise.race([
      generateImage(prompt, o.look === "photo" ? "3:4" : "1:1"),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout gambar")), o.timeoutMs ?? 75_000)),
    ]);
    const ext = img.mime.includes("jpeg") || img.mime.includes("jpg") ? "jpg" : img.mime.includes("webp") ? "webp" : "png";
    const p = `${o.userId}/autopilot/${o.postId}/visual-${Date.now().toString(36)}.${ext}`;
    const { error } = await admin.storage.from(BUCKET).upload(p, Buffer.from(img.bytes), { contentType: img.mime, upsert: true });
    if (error) throw error;
    await admin.from("usage_logs").insert({
      user_id: o.userId,
      tier: "autopilot-image",
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
