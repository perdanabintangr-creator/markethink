import { z } from "zod";
import type { Look } from "./slides";

/**
 * "DNA Gaya" Autopilot: spesifikasi desain yang mengendalikan renderer (latar, font judul, tata letak, posisi visual,
 * ornamen) dan gaya gambar AI. Sumbernya: gaya bawaan (4 tampilan), pustaka gaya per industri, atau hasil analisis AI
 * dari referensi yang diunggah pelanggan. Modul murni (diuji vitest).
 */

export const FONT_IDS = ["jakarta", "montserrat", "manrope", "anton", "bebas", "space", "chakra", "playfair", "fraunces", "cormorant", "cinzel", "fredoka"] as const;
export type FontId = (typeof FONT_IDS)[number];

/** Keterangan font untuk AI analisis referensi & UI. */
export const FONT_INFO: Record<FontId, { label: string; feel: string; upper?: boolean }> = {
  jakarta: { label: "Plus Jakarta ExtraBold", feel: "sans geometris tebal modern (startup, edukasi, teknologi)" },
  montserrat: { label: "Montserrat ExtraBold", feel: "sans tebal klasik serbaguna" },
  manrope: { label: "Manrope ExtraBold", feel: "sans bersih rapi, korporat ramah" },
  anton: { label: "Anton", feel: "condensed sangat tebal, poster/berita/tren", upper: true },
  bebas: { label: "Bebas Neue", feel: "condensed tegak tipis-tebal, sporty/fashion streetwear", upper: true },
  space: { label: "Space Grotesk", feel: "grotesk teknis, tech/kripto/gaming" },
  chakra: { label: "Chakra Petch", feel: "futuristik bersudut, otomotif/gaming", upper: true },
  playfair: { label: "Playfair Display", feel: "serif kontras tinggi, editorial/fashion/premium" },
  fraunces: { label: "Fraunces", feel: "serif lembut hangat, F&B artisan/kafe/bakery" },
  cormorant: { label: "Cormorant Garamond", feel: "serif tipis mewah, kecantikan/perhiasan/wedding" },
  cinzel: { label: "Cinzel", feel: "serif kapital klasik, mewah/properti premium/hotel", upper: true },
  fredoka: { label: "Fredoka", feel: "rounded ceria, anak/snack/hobi" },
};

export const BGS = ["light", "dark", "photo", "solid", "cream"] as const;
export const HERO_POS = ["below", "above", "full", "none"] as const;
export const ORNAMENTS = ["orbs", "orbit", "corners", "grain", "frame", "grid", "sticker"] as const;
export const VISUAL_STYLES = ["3d-glossy", "clay-3d", "photo-lifestyle", "product-studio", "flat-illustration", "editorial-photo", "minimal-object"] as const;

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

/** Teks AI yang kepanjangan dipotong rapi (bukan ditolak) — keluaran model kadang sedikit melebihi batas. */
export const clip = (n: number) => z.string().transform((s) => s.trim().slice(0, n));
/** Enum toleran: huruf besar/kecil & spasi diabaikan; nilai asing → undefined (dipakai default). */
export const looseEnum = <T extends readonly [string, ...string[]]>(values: T, aliases: Record<string, T[number]> = {}) =>
  z.preprocess((v) => {
    if (typeof v !== "string") return v;
    const k = v.trim().toLowerCase().replace(/\s+/g, "-");
    return (values as readonly string[]).includes(k) ? k : (aliases[k] ?? undefined);
  }, z.enum(values).optional());

export const styleDnaSchema = z.object({
  name: clip(60).pipe(z.string().min(1)),
  description: clip(400).default(""),
  bg: z.enum(BGS).catch("light"),
  /** Warna latar untuk bg solid/cream (opsional; selain itu dari brand). */
  bgColor: hex.optional().catch(undefined),
  font: z.enum(FONT_IDS).catch("jakarta"),
  upper: z.boolean().catch(false).default(false),
  /** Kata *diapit bintang* tampil serif miring. */
  serifAccent: z.boolean().catch(true).default(true),
  align: z.enum(["left", "center"]).catch("center").default("center"),
  titlePos: z.enum(["top", "bottom"]).catch("top").default("top"),
  hero: z.enum(HERO_POS).catch("below").default("below"),
  ornaments: z.array(z.string()).transform((a) => a.filter((x): x is (typeof ORNAMENTS)[number] => (ORNAMENTS as readonly string[]).includes(x)).slice(0, 5)).default([]),
  visualStyle: z.enum(VISUAL_STYLES).catch("photo-lifestyle").default("3d-glossy"),
  /** Arahan tambahan gaya gambar (bahasa Inggris), mis. "warm morning light, wooden table". */
  imageHint: clip(300).optional(),
  /** Skala ukuran judul 0.8–1.25. */
  titleScale: z.number().transform((n) => Math.min(1.25, Math.max(0.8, n))).catch(1).default(1),
  /** Tata letak: "studio" (gaya lama) atau "sosmed" (template sosmed UMKM Indonesia: bar kontak, kotak highlight, label harga). */
  layout: z.enum(["studio", "sosmed"]).optional().catch(undefined),
  /** Varian template sosmed. */
  template: z.enum(["elegan", "game", "cafe", "edukasi", "kuliner"]).optional().catch(undefined),
});
export type StyleDna = z.infer<typeof styleDnaSchema>;

/** Kelompok tampilan (kolom `design` di social_posts) untuk DNA ini. */
export function baseOf(d: StyleDna): Look {
  if (d.hero === "full" || d.bg === "photo") return "photo";
  return d.bg === "dark" ? "bold" : "glossy";
}

/** DNA untuk tampilan bawaan (agar konten lama tetap tampil sama). */
export const LOOK_DNA: Record<Exclude<Look, "classic">, StyleDna> = {
  glossy: { name: "Glossy 3D", description: "Terang lavender, bola glossy, visual 3D", bg: "light", font: "jakarta", upper: false, serifAccent: true, align: "center", titlePos: "top", hero: "below", ornaments: ["orbs", "orbit", "corners"], visualStyle: "3d-glossy", titleScale: 1 },
  bold: { name: "Bold gelap", description: "Hitam, huruf condensed raksasa, objek 3D dramatis", bg: "dark", font: "anton", upper: true, serifAccent: true, align: "center", titlePos: "bottom", hero: "above", ornaments: [], visualStyle: "3d-glossy", titleScale: 1 },
  photo: { name: "Foto penuh", description: "Foto suasana nyata + judul putih besar", bg: "photo", font: "jakarta", upper: false, serifAccent: true, align: "left", titlePos: "bottom", hero: "full", ornaments: ["sticker"], visualStyle: "photo-lifestyle", titleScale: 1 },
};

export function dnaForLook(look: Look): StyleDna | null {
  return look === "classic" ? null : LOOK_DNA[look];
}

/** DNA tersimpan (jsonb) → DNA valid, atau null. */
export function parseDna(raw: unknown): StyleDna | null {
  const r = styleDnaSchema.safeParse(raw);
  return r.success ? r.data : null;
}

const VISUAL_TEXT: Record<StyleDna["visualStyle"], string> = {
  "3d-glossy": "premium glossy 3D render, soft glass and clay materials, Apple-style product illustration",
  "clay-3d": "soft matte clay 3D render, rounded playful shapes, pastel lighting",
  "photo-lifestyle": "editorial lifestyle photograph, natural light, authentic Indonesian setting and people where relevant, shallow depth of field",
  "product-studio": "high-end studio product photograph, seamless backdrop, soft box lighting, crisp reflections",
  "flat-illustration": "clean flat vector illustration, simple shapes, limited palette, subtle grain",
  "editorial-photo": "fashion/editorial magazine photograph, dramatic styling, rich colour grading",
  "minimal-object": "minimal still life of a single object, lots of negative space, soft shadow",
};

/** Prompt gambar visual utama dari DNA (latar disesuaikan agar menyatu dengan slide). */
export function visualPromptFor(d: StyleDna, visual: string, colors: { primary: string; accent: string }) {
  const subject = visual.replace(/\s+/g, " ").trim().slice(0, 380);
  const no = "Absolutely no text, letters, numbers, captions, logos, brand names or watermarks anywhere in the image.";
  const style = VISUAL_TEXT[d.visualStyle];
  const hint = d.imageHint ? ` ${d.imageHint.slice(0, 300)}.` : "";
  if (d.hero === "full" || d.bg === "photo")
    return `${subject}. ${style}, subtle ${colors.primary} colour accents, main subject in the upper two thirds, calm darker area at the bottom for text. Portrait 3:4.${hint} ${no}`;
  if (d.layout === "sosmed")
    return `${subject}. ${style}, single subject cut out cleanly like a sticker with crisp edges, centered, filling about 75% of the frame, isolated on a seamless plain ${d.bgColor ?? "soft light grey"} background, soft contact shadow, bright commercial lighting.${hint} ${no}`;
  const bg =
    d.bg === "dark"
      ? `isolated on a pure black background, dramatic rim lighting in ${colors.primary} and ${colors.accent}`
      : d.bg === "cream"
        ? `isolated on a seamless warm cream (#F4EFE6) background, soft daylight`
        : d.bg === "solid"
          ? `isolated on a seamless plain ${d.bgColor ?? colors.primary} background`
          : `isolated on a seamless very light lavender-white background, soft studio lighting, gentle shadow`;
  return `${subject}. ${style}, ${colors.primary} and ${colors.accent} accents, single hero subject centered with generous empty space around it, ${bg}, high detail.${hint} ${no}`;
}

export const imageAspectFor = (d: StyleDna) => (d.hero === "full" || d.bg === "photo" ? "3:4" : "1:1");

/** Catatan gaya untuk prompt penulis konten (kolom "design" diabaikan; visual mengikuti gaya ini). */
export function styleNote(d: StyleDna) {
  const visual: Record<StyleDna["visualStyle"], string> = {
    "3d-glossy": "objek/ikon 3D glossy",
    "clay-3d": "objek clay 3D lucu",
    "photo-lifestyle": "foto suasana nyata (orang/tempat Indonesia)",
    "product-studio": "foto produk studio",
    "flat-illustration": "ilustrasi flat",
    "editorial-photo": "foto editorial/model",
    "minimal-object": "satu objek minimal",
  };
  if (d.layout === "sosmed")
    return `GAYA DESAIN TETAP: template sosmed "${d.name}" — ${d.description}. Abaikan kolom "design".
- Gaya feed UMKM Indonesia: judul pendek & kuat di "title", kata/frasa kunci di "accent" (tampil dalam kotak highlight), "label" = tagline kecil di atas judul.
- Single image boleh berupa: Tips/daftar bernomor (isi "items" 3–5 poin pendek), Price list (isi "items" dengan "Nama — Rp harga" HANYA dari katalog/Brand Kit), VS/perbandingan (isi "options" 2 pilihan), Promo (isi "price" mis. "Rp14k" / "Mulai Rp20.000" HANYA dari katalog/promo nyata), Testimoni (type "statement", "body" = kutipan; hanya bila ada testimoni nyata).
- "price" hanya diisi bila harga/promo ada di data brand. Jangan mengarang harga.
- Visual utama (kolom "visual") = SATU subjek nyata (orang/produk/makanan) yang bisa tampil seperti stiker di depan latar warna brand.${d.template === "elegan" ? ' Untuk template elegan, "corners" boleh berisi 2 keterangan detail produk (mis. bahan, keunggulan).' : ""}`;
  return `GAYA DESAIN TETAP (pilihan pemilik brand): "${d.name}"${d.description ? ` — ${d.description}` : ""}. Abaikan kolom "design".
- Visual utama cover berupa ${visual[d.visualStyle]}; tulis "visual" yang cocok dengan gaya ini${d.imageHint ? ` (${d.imageHint})` : ""}.
- ${d.ornaments.includes("corners") ? 'Isi "corners" di cover.' : 'Tidak perlu "corners".'} ${d.upper ? "Judul tampil KAPITAL: pilih kata yang tetap enak dibaca kapital." : ""}`.trim();
}

/** Prompt visual slide isi (layar penuh 3:4, ±80% slide): subjek di 60% atas, area bawah tenang untuk teks. */
export function slideVisualPromptFor(d: StyleDna, visual: string, colors: { primary: string; accent: string }) {
  const subject = visual.replace(/\s+/g, " ").trim().slice(0, 380);
  const style = VISUAL_TEXT[d.visualStyle];
  const tone = d.bg === "dark" ? "moody low-key lighting" : d.bg === "cream" ? "warm soft daylight, cream tones" : "bright airy lighting";
  return `${subject}. ${style}, full-frame scene filling the whole portrait canvas (no isolated object on blank background), ${tone}, subtle ${colors.primary} and ${colors.accent} colour accents, main subject in the upper 60% of the frame, calmer simpler area in the bottom third for text overlay. Portrait 3:4.${d.imageHint ? ` ${d.imageHint.slice(0, 300)}.` : ""} Absolutely no text, letters, numbers, captions, logos, brand names or watermarks anywhere in the image.`;
}

// ---------------------------------------------------------------------------
// Template sosmed UMKM Indonesia (ACC founder 23 Nov 2026, dari referensi 5 industri: perhiasan, game, kopi, edukasi,
// kuliner lokal). Hanya pola tata letak yang diambil; warna selalu dari brand.
// ---------------------------------------------------------------------------
export const SOSMED_TEMPLATES = ["elegan", "game", "cafe", "edukasi", "kuliner"] as const;
export type SosmedTemplate = (typeof SOSMED_TEMPLATES)[number];

export const SOSMED_INFO: Record<SosmedTemplate, { label: string; feel: string; font: FontId; fullPhoto?: boolean }> = {
  elegan: { label: "Elegan", feel: "foto produk lembut penuh, serif tipis mewah, keterangan bergaris (perhiasan, wedding, fashion premium)", font: "cormorant", fullPhoto: true },
  game: { label: "Bold Digital", feel: "latar abu terang, judul tebal dengan kotak highlight, karakter/produk menonjol (game, gadget, produk digital)", font: "jakarta" },
  cafe: { label: "Warm Café", feel: "latar hangat warna brand, produk & orang di depan, label harga (kopi, minuman, F&B modern)", font: "jakarta" },
  edukasi: { label: "Edukasi Ceria", feel: "langit cerah, judul tebal bertepi putih, kartu catatan (kursus, sekolah, jasa)", font: "fredoka" },
  kuliner: { label: "Kuliner Lokal", feel: "latar warna brand penuh bermotif, kotak highlight kontras, makanan di depan (kuliner, katering, UMKM)", font: "jakarta" },
};

const mixHex = (a: string, b: string, t: number) => {
  const pa = a.replace("#", "").match(/../g)!.map((x) => parseInt(x, 16));
  const pb = b.replace("#", "").match(/../g)!.map((x) => parseInt(x, 16));
  return `#${pa.map((v, k) => Math.round(v + (pb[k] - v) * t).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
};

/** Warna latar template (juga dipakai untuk latar gambar AI cover agar menyatu). */
export function sosmedBg(t: SosmedTemplate, primary: string) {
  if (t === "kuliner") return primary.toUpperCase();
  if (t === "cafe") return mixHex(primary, "#FFFFFF", 0.45);
  if (t === "edukasi") return mixHex(primary, "#FFFFFF", 0.82);
  if (t === "game") return "#F1F3F5";
  return mixHex(primary, "#FFFFFF", 0.9);
}

/** Template yang paling cocok dengan kategori/industri brand (bebas teks). */
export function templateForCategory(category: string | null | undefined): SosmedTemplate {
  const c = (category ?? "").toLowerCase();
  if (/perhias|jewel|cincin|wedding|nikah|bridal|butik|boutique|luxury|mewah|parfum|fashion|skincare|kecantikan|beauty|properti|property/.test(c)) return "elegan";
  if (/game|gaming|top ?up|diamond|gadget|elektronik|digital|software|aplikasi|tech|teknologi|crypto/.test(c)) return "game";
  if (/kopi|coffee|kafe|cafe|café|minum|drink|boba|tea|teh|bakery|roti|dessert|kue/.test(c)) return "cafe";
  if (/kursus|les|edukasi|sekolah|belajar|kelas|course|training|pelatihan|bimbel|ngaji|tutor|klinik|jasa|konsultan/.test(c)) return "edukasi";
  return "kuliner";
}

/** DNA template sosmed: latar & posisi visual diatur agar Visual Director membuat gambar yang menyatu. */
export function sosmedDna(t: SosmedTemplate, primary: string, name?: string, font?: FontId): StyleDna {
  const info = SOSMED_INFO[t];
  const full = Boolean(info.fullPhoto);
  return {
    name: name ?? `Template ${info.label}`,
    description: info.feel,
    bg: full ? "photo" : "solid",
    ...(full ? {} : { bgColor: sosmedBg(t, primary) }),
    font: t === "elegan" ? (font && ["playfair", "cormorant", "cinzel", "fraunces"].includes(font) ? font : info.font) : (font ?? info.font),
    upper: false,
    serifAccent: t === "elegan",
    align: "center",
    titlePos: full ? "bottom" : "top",
    hero: full ? "full" : "below",
    ornaments: [],
    visualStyle: full ? "editorial-photo" : t === "game" ? "3d-glossy" : "photo-lifestyle",
    imageHint: full
      ? "soft-focus luxury still life, shallow depth of field, warm creamy light"
      : "subject cut out cleanly like a sticker, front-facing, soft natural shadow, friendly and commercial",
    titleScale: 1,
    layout: "sosmed",
    template: t,
  };
}
