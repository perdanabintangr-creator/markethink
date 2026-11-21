import "server-only";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateImage } from "@/lib/ai/image";
import { STYLE_PRESETS } from "./presets";
import { PRESET_VISUALS, SAMPLE_PREFIX, samplePath } from "./preset-samples";
import { imageAspectFor, visualPromptFor } from "./style";

const cache = new Map<string, { at: number; buf: Buffer | null }>();
const TTL = 10 * 60_000;

/** Gambar contoh gaya (dibuat sekali oleh admin) dari storage, di-cache 10 menit per instance. */
export async function sampleImage(admin: SupabaseClient, presetId: string) {
  const hit = cache.get(presetId);
  if (hit && Date.now() - hit.at < TTL) return hit.buf;
  const { data } = await admin.storage.from("uploads").download(samplePath(presetId));
  const buf = data ? Buffer.from(await data.arrayBuffer()) : null;
  cache.set(presetId, { at: Date.now(), buf });
  return buf;
}

/** Daftar gaya yang sudah punya gambar contoh. */
export async function existingSamples(admin: SupabaseClient) {
  const { data } = await admin.storage.from("uploads").list(SAMPLE_PREFIX.replace(/\/$/, ""), { limit: 200 });
  return new Set((data ?? []).map((f) => f.name.replace(/\.jpg$/, "")));
}

/** Buat gambar contoh yang belum ada (paralel 3, dibatasi waktu). Mengembalikan jumlah dibuat & sisa. */
export async function generateMissingSamples(admin: SupabaseClient, userId: string, o: { force?: boolean; budgetMs?: number } = {}) {
  const started = Date.now();
  const have = o.force ? new Set<string>() : await existingSamples(admin);
  const todo = STYLE_PRESETS.filter((p) => !have.has(p.id) && PRESET_VISUALS[p.id]);
  let made = 0;
  let failed = 0;
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (queue.length && Date.now() - started < (o.budgetMs ?? 230_000)) {
        const p = queue.shift()!;
        const t0 = Date.now();
        try {
          const prompt = visualPromptFor(p.dna, PRESET_VISUALS[p.id], { primary: "natural brand", accent: "soft highlight" });
          const img = await generateImage(prompt, imageAspectFor(p.dna));
          const jpg = await sharp(Buffer.from(img.bytes)).resize({ width: 1080, height: 1350, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
          const { error } = await admin.storage.from("uploads").upload(samplePath(p.id), jpg, { contentType: "image/jpeg", upsert: true });
          if (error) throw error;
          cache.delete(p.id);
          made++;
          await admin.from("usage_logs").insert({ user_id: userId, tier: "autopilot-sample", provider: img.provider, model: img.model, latency_ms: Date.now() - t0, est_cost_usd: img.costUsd ?? 0.034, credits: 0, status: "ok" });
        } catch (err) {
          failed++;
          console.error("[autopilot] contoh gaya gagal", p.id, err);
          await admin.from("usage_logs").insert({ user_id: userId, tier: "autopilot-sample", latency_ms: Date.now() - t0, credits: 0, status: "error", error: `contoh ${p.id}: ${String(err).slice(0, 300)}` });
        }
      }
    }),
  );
  return { made, failed, remaining: Math.max(0, todo.length - made - failed) };
}
