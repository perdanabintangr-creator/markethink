import { z } from "zod";
import { clip, styleDnaSchema } from "./style";

/**
 * Hasil riset brand otomatis (bentuk data, prompt, & penggabungan ke Brand Kit). Modul murni (diuji vitest).
 */

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const researchSchema = z.object({
  business: z.object({
    summary: clip(600),
    category: clip(80),
    products: z.array(z.object({ name: clip(120), description: clip(300).optional() })).transform((a) => a.slice(0, 12)).default([]),
    target_audience: clip(400).optional(),
    usp: clip(400).optional(),
    voice: clip(300).optional(),
    location: clip(200).optional(),
  }),
  kv: z.object({
    primary: hex,
    secondary: hex,
    background: hex.optional(),
    mood: clip(200),
    reason: clip(300).optional(),
  }),
  dna: styleDnaSchema,
  /** Subjek visual khas brand untuk gambar AI (bahasa Inggris), mis. "photobox booth with ring light and props". */
  visual_subjects: z.array(clip(200)).transform((a) => a.slice(0, 6)).default([]),
  /** Indeks gambar referensi yang menampilkan produk/layanan brand (kandidat foto produk). */
  product_images: z.array(z.number().int().min(0)).transform((a) => a.slice(0, 8)).default([]),
  confidence: z.preprocess((v) => (typeof v === "string" ? v.toLowerCase() : v), z.enum(["high", "medium", "low"]).catch("medium")).default("medium"),
  notes: clip(400).optional(),
});
export type BrandResearch = z.infer<typeof researchSchema>;

export function researchPrompt(o: { name: string; handle: string; website: string | null; kitSummary: string; sources: { title: string; url: string; content: string }[]; imageCount: number; igImages: number; en: boolean }) {
  const src = o.sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}\n${s.content.slice(0, 1200)}`).join("\n\n");
  return `Kamu brand strategist + art director. Riset brand "${o.name}"${o.handle ? ` (Instagram ${o.handle})` : ""}${o.website ? ` (website ${o.website})` : ""} dari hasil penelusuran & gambar di bawah,
lalu simpulkan profil bisnis dan KEY VISUAL (KV) untuk konten Instagram-nya.

DATA BRAND KIT SAAT INI (dari pemilik):
${o.kitSummary || "- (kosong)"}

HASIL PENELUSURAN WEB (bisa berisi brand lain bernama mirip — pakai hanya yang jelas tentang brand ini):
${src || "- (tidak ada hasil)"}

GAMBAR: ${o.imageCount} gambar terlampir${o.igImages ? ` (${o.igImages} pertama dari akun Instagram brand sendiri — paling bisa dipercaya)` : " (dari pencarian gambar Google — sebagian mungkin bukan milik brand ini)"}.

Tugas:
1. business: ringkasan bisnis (apa yang dijual, untuk siapa, di mana), kategori, daftar produk/layanan nyata (jangan mengarang),
   target audiens, USP, gaya bahasa yang cocok, lokasi. Bila data tipis, tulis yang paling mungkin & turunkan "confidence".
2. kv: palet warna dari visual ASLI brand (logo/foto/feed); bila tidak terlihat, pilih palet yang cocok dengan kategori bisnis
   (JANGAN default biru kecuali memang biru). primary = warna utama/aksen, secondary = pendamping, background = nada latar, mood & alasannya.
3. dna: DNA Gaya desain (bg, font, upper, align, titlePos, hero, ornaments, visualStyle, imageHint, titleScale, name, description)
   yang paling cocok dengan KV & kategori. Contoh: photobox → foto suasana orang berpose ceria (photo-lifestyle), warna ceria.
4. visual_subjects: 3–6 subjek gambar khas bisnis ini dalam bahasa Inggris (produk/layanan nyata, mis. "a photobox booth with ring light,
   props and a smiling group posing", "a printed photo strip"). Ini dipakai untuk setiap visual AI.
5. product_images: indeks gambar (0-based) yang jelas menampilkan produk/layanan brand ini.

Pilihan DNA yang valid: bg light|dark|photo|solid|cream; font jakarta|montserrat|manrope|anton|bebas|space|chakra|playfair|fraunces|cormorant|cinzel|fredoka;
hero below|above|full|none; ornaments orbs|orbit|corners|grain|frame|grid|sticker; visualStyle 3d-glossy|clay-3d|photo-lifestyle|product-studio|flat-illustration|editorial-photo|minimal-object.
Teks dalam ${o.en ? "English" : "Bahasa Indonesia"} (kecuali visual_subjects & imageHint: bahasa Inggris).

Balas HANYA JSON:
{"business":{"summary":"...","category":"...","products":[{"name":"...","description":"..."}],"target_audience":"...","usp":"...","voice":"...","location":"..."},
"kv":{"primary":"#RRGGBB","secondary":"#RRGGBB","background":"#RRGGBB","mood":"...","reason":"..."},
"dna":{"name":"KV ${o.name.slice(0, 30)}","description":"...","bg":"...","font":"...","upper":false,"serifAccent":true,"align":"left","titlePos":"bottom","hero":"full","ornaments":["sticker"],"visualStyle":"photo-lifestyle","imageHint":"...","titleScale":1},
"visual_subjects":["..."],"product_images":[0],"confidence":"high|medium|low","notes":"..."}`;
}

/** Isi field Brand Kit yang MASIH KOSONG dari hasil riset (isian pemilik tidak pernah ditimpa). */
export function mergeIntoKit(kit: Record<string, unknown>, r: BrandResearch): Record<string, unknown> {
  const out = { ...kit };
  const empty = (k: string) => typeof out[k] !== "string" || !(out[k] as string).trim();
  if (empty("products") && r.business.products.length) out.products = r.business.products.map((p) => (p.description ? `${p.name} (${p.description})` : p.name)).join("; ").slice(0, 2000);
  if (empty("target_audience") && r.business.target_audience) out.target_audience = r.business.target_audience;
  if (empty("usp") && r.business.usp) out.usp = r.business.usp;
  if (empty("brand_voice") && r.business.voice) out.brand_voice = r.business.voice;
  if (empty("color_primary")) out.color_primary = r.kv.primary.toUpperCase();
  if (empty("color_secondary")) out.color_secondary = r.kv.secondary.toUpperCase();
  if (empty("notes")) out.notes = `Ringkasan riset otomatis: ${r.business.summary}${r.business.location ? ` Lokasi: ${r.business.location}.` : ""}`.slice(0, 2000);
  return out;
}

/** Blok subjek visual khas brand untuk prompt penulis (dipakai di kolom "visual"). */
export function visualSubjectsBlock(r: Pick<BrandResearch, "visual_subjects" | "business"> | null) {
  if (!r || (!r.visual_subjects.length && !r.business.summary)) return null;
  return `RISET BRAND: ${r.business.summary}
SUBJEK VISUAL KHAS BRAND (WAJIB jadi dasar kolom "visual" cover — tampilkan produk/layanan nyata brand ini, bukan objek generik):
${r.visual_subjects.map((v) => `- ${v}`).join("\n")}`;
}
