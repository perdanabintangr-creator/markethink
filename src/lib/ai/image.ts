import "server-only";

const GOOGLE_API = "https://generativelanguage.googleapis.com/v1beta";
const OPENROUTER_API = "https://openrouter.ai/api/v1";
const HOUR = 60 * 60 * 1000;

export interface GeneratedImage {
  bytes: Uint8Array;
  mime: string;
  provider: "openrouter" | "google";
  model: string;
  caption: string | null;
  /** Biaya nyata dari provider (USD) bila dilaporkan. */
  costUsd?: number;
}

type Reference = { mime: string; data: string };

/** Bersihkan key hasil copy-paste (spasi, baris baru, tanda kutip, "NAMA=" ikut tertempel). */
export function cleanKey(raw: string | undefined) {
  const v = (raw ?? "").trim().replace(/^[A-Z_]+=/, "").replace(/^["']|["']$/g, "").trim();
  return v || undefined;
}

const keys = () => ({
  openrouter: cleanKey(process.env.OPENROUTER_API_KEY),
  google: cleanKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
});

export const imageGenerationEnabled = () => Boolean(keys().openrouter || keys().google);

/**
 * Buat gambar dari prompt; `references` = gambar acuan (edit/variasi) berupa base64.
 * Urutan provider: OpenRouter (top-up kecil, prabayar) → Google AI Studio (butuh billing).
 */
export async function generateImage(prompt: string, aspectRatio: string, references: Reference[] = []): Promise<GeneratedImage> {
  const { openrouter, google } = keys();
  if (!openrouter && !google) throw new Error("Belum ada API key pembuat gambar (OPENROUTER_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY)");
  const errors: string[] = [];
  if (openrouter) {
    try {
      return await viaOpenRouter(openrouter, prompt, aspectRatio, references);
    } catch (err) {
      errors.push(`openrouter: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (google) {
    try {
      return await viaGoogle(google, prompt, aspectRatio, references);
    } catch (err) {
      errors.push(`google: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`Gagal membuat gambar: ${errors.join(" || ")}`);
}

// ---------------------------------------------------------------------------
// OpenRouter — chat completions dengan modalities ["image","text"].
// ---------------------------------------------------------------------------

let orCache: { at: number; models: string[] } | null = null;

/** Model OpenRouter yang bisa menghasilkan gambar; prioritas Gemini Flash Image (murah & bagus). Override: env OPENROUTER_IMAGE_MODEL. */
async function openRouterImageModels(key: string): Promise<string[]> {
  if (process.env.OPENROUTER_IMAGE_MODEL) return process.env.OPENROUTER_IMAGE_MODEL.split(",").map((s) => s.trim());
  if (orCache && Date.now() - orCache.at < HOUR) return orCache.models;
  const res = await fetch(`${OPENROUTER_API}/models`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`daftar model ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as {
    data?: { id: string; architecture?: { input_modalities?: string[]; output_modalities?: string[] } }[];
  };
  const models = (data.data ?? [])
    .filter((m) => m.architecture?.output_modalities?.includes("image") && m.architecture?.input_modalities?.includes("text"))
    .map((m) => m.id)
    .sort((a, b) => imageModelScore(b) - imageModelScore(a));
  orCache = { at: Date.now(), models };
  return models;
}

/** Skor urutan model gambar: Google Gemini Flash Image terbaru dulu, versi preview/pro (mahal) belakangan. */
export function imageModelScore(id: string) {
  return (
    (id.startsWith("google/") ? 1000 : 0) +
    (/flash/.test(id) ? 200 : 0) +
    (/latest/.test(id) ? 50 : 0) -
    (/preview/.test(id) ? 20 : 0) -
    (/pro/.test(id) ? 100 : 0) +
    versionOf(id)
  );
}

async function viaOpenRouter(key: string, prompt: string, aspectRatio: string, refs: Reference[]): Promise<GeneratedImage> {
  const models = await openRouterImageModels(key);
  if (!models.length) throw new Error("tidak ada model gambar di OpenRouter");
  const errors: string[] = [];
  for (const model of models.slice(0, 3)) {
    const res = await fetch(`${OPENROUTER_API}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://markethink-pi.vercel.app",
        "X-Title": "Markethink",
      },
      body: JSON.stringify({
        model,
        modalities: ["image", "text"],
        usage: { include: true },
        image_config: { aspect_ratio: aspectRatio },
        messages: [
          {
            role: "user",
            content: [
              ...refs.map((r) => ({ type: "image_url", image_url: { url: `data:${r.mime};base64,${r.data}` } })),
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      // 402 = saldo OpenRouter habis → tidak ada gunanya mencoba model lain.
      if (res.status === 402) throw new Error(`[credits_required] 402 ${body.slice(0, 200)}`);
      // 401/403 = key salah (mis. yang tertempel Management Key / key terpotong). Info diagnosa tanpa membocorkan key.
      if (res.status === 401 || res.status === 403) {
        throw new Error(`[auth_invalid] ${res.status} ${body.slice(0, 150)} (key: ${key.length} karakter, awalan sk-or-v1-: ${key.startsWith("sk-or-v1-") ? "ya" : "tidak"})`);
      }
      errors.push(`${model} → ${res.status} ${body.slice(0, 250)}`);
      continue;
    }
    const data = JSON.parse(body) as {
      choices?: { message?: { content?: string | null; images?: { image_url?: { url?: string } }[] } }[];
      usage?: { cost?: number };
    };
    const msg = data.choices?.[0]?.message;
    const url = msg?.images?.find((i) => i.image_url?.url)?.image_url?.url;
    const parsed = url ? (url.startsWith("data:") ? parseDataUrl(url) : await download(url)) : null;
    if (!parsed) {
      errors.push(`${model} → tidak mengembalikan gambar`);
      continue;
    }
    return {
      ...parsed,
      provider: "openrouter",
      model,
      caption: typeof msg?.content === "string" && msg.content.trim() ? msg.content : null,
      costUsd: typeof data.usage?.cost === "number" ? data.usage.cost : undefined,
    };
  }
  throw new Error(errors.join(" | "));
}

async function download(url: string) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return { mime: res.headers.get("content-type") || "image/png", bytes: new Uint8Array(await res.arrayBuffer()) };
}

function parseDataUrl(url: string) {
  const m = url.match(/^data:([^;,]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], bytes: Uint8Array.from(Buffer.from(m[2], "base64")) };
}

// ---------------------------------------------------------------------------
// Google AI Studio — generateContent dengan responseModalities IMAGE.
// ---------------------------------------------------------------------------

let gCache: { at: number; models: string[] } | null = null;

/** Model Gemini yang bisa menghasilkan gambar, dideteksi dari akun API key. Override: env IMAGE_MODEL. */
async function googleImageModels(key: string): Promise<string[]> {
  if (process.env.IMAGE_MODEL) return process.env.IMAGE_MODEL.split(",").map((s) => s.trim());
  if (gCache && Date.now() - gCache.at < HOUR) return gCache.models;
  const res = await fetch(`${GOOGLE_API}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
  if (!res.ok) throw new Error(`ListModels ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  const models = (data.models ?? [])
    .filter((m) => /image/.test(m.name) && !/imagen/.test(m.name))
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .sort((a, b) => imageModelScore(`google/${b}`) - imageModelScore(`google/${a}`));
  gCache = { at: Date.now(), models };
  return models;
}

async function viaGoogle(key: string, prompt: string, aspectRatio: string, refs: Reference[]): Promise<GeneratedImage> {
  const models = await googleImageModels(key);
  if (!models.length) throw new Error("tidak ada model gambar Gemini untuk API key ini");
  const errors: string[] = [];
  for (const model of models.slice(0, 3)) {
    for (const withRatio of [true, false]) {
      const res = await fetch(`${GOOGLE_API}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [...refs.map((r) => ({ inlineData: { mimeType: r.mime, data: r.data } })), { text: prompt }],
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            ...(withRatio ? { imageConfig: { aspectRatio } } : {}),
          },
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        // "limit: 0" / free_tier = model ini tidak termasuk paket gratis Google → perlu billing.
        const billing = res.status === 429 && (/limit:\s*0\b/.test(body) || /free_tier/.test(body));
        if (billing) throw new Error(`[billing_required] ${model} → 429 ${body.slice(0, 200)}`);
        errors.push(`${model}${withRatio ? "" : " (tanpa rasio)"} → ${res.status} ${body.slice(0, 250)}`);
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
        provider: "google",
        model,
        caption: parts.map((p) => p.text).filter(Boolean).join(" ") || null,
      };
    }
  }
  throw new Error(errors.join(" | "));
}

function versionOf(name: string) {
  const m = name.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}
