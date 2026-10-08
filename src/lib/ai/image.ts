import "server-only";

const API = "https://generativelanguage.googleapis.com/v1beta";

let cache: { at: number; models: string[] } | null = null;

/**
 * Daftar model Gemini yang bisa menghasilkan gambar (nama mengandung "image"), dideteksi
 * dari akun API key → tidak rusak saat Google mengganti nama model. Bisa dipaksa via env IMAGE_MODEL.
 */
async function imageModels(key: string): Promise<string[]> {
  if (process.env.IMAGE_MODEL) return process.env.IMAGE_MODEL.split(",").map((s) => s.trim());
  if (cache && Date.now() - cache.at < 60 * 60 * 1000) return cache.models;
  const res = await fetch(`${API}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
  if (!res.ok) throw new Error(`ListModels ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  const score = (n: string) =>
    (n.includes("latest") ? 1000 : 0) + (n.includes("flash") ? 100 : 0) - (n.includes("preview") ? 10 : 0) + versionOf(n);
  const models = (data.models ?? [])
    .filter((m) => /image/.test(m.name) && !/imagen/.test(m.name))
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .sort((a, b) => score(b) - score(a));
  cache = { at: Date.now(), models };
  return models;
}

function versionOf(name: string) {
  const m = name.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

export interface GeneratedImage {
  bytes: Uint8Array;
  mime: string;
  model: string;
  caption: string | null;
}

export const imageGenerationEnabled = () => Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

/** Buat gambar dari prompt; `references` = gambar acuan (edit/variasi) berupa base64. */
export async function generateImage(
  prompt: string,
  aspectRatio: string,
  references: { mime: string; data: string }[] = [],
): Promise<GeneratedImage> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY belum diisi");
  const models = await imageModels(key);
  if (!models.length) throw new Error("Tidak ada model gambar Gemini yang tersedia untuk API key ini");

  const errors: string[] = [];
  for (const model of models.slice(0, 3)) {
    for (const withRatio of [true, false]) {
      const res = await fetch(`${API}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [...references.map((r) => ({ inlineData: { mimeType: r.mime, data: r.data } })), { text: prompt }],
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            ...(withRatio ? { imageConfig: { aspectRatio } } : {}),
          },
        }),
      });
      if (!res.ok) {
        const msg = (await res.text()).slice(0, 300);
        errors.push(`${model}${withRatio ? "" : " (tanpa rasio)"} → ${res.status} ${msg}`);
        // Error karena parameter rasio → coba lagi tanpa rasio; error lain → model berikutnya.
        if (withRatio && res.status === 400) continue;
        break;
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string; inlineData?: { mimeType: string; data: string } }[] } }[];
      };
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const img = parts.find((p) => p.inlineData?.data);
      if (!img?.inlineData) {
        errors.push(`${model} → tidak mengembalikan gambar`);
        break;
      }
      return {
        bytes: Uint8Array.from(Buffer.from(img.inlineData.data, "base64")),
        mime: img.inlineData.mimeType || "image/png",
        model,
        caption: parts.map((p) => p.text).filter(Boolean).join(" ") || null,
      };
    }
  }
  throw new Error(`Gagal membuat gambar: ${errors.join(" | ")}`);
}
