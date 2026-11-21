import { z } from "zod";
import { plainText, type Slide } from "./slides";
import type { StyleDna } from "./style";

/**
 * Visual Director (brief founder 21 Nov): sebelum render, AI membaca isi TIAP slide lalu memutuskan perlu gambar
 * generate atau tidak, subjeknya apa, adegan & prompt yang spesifik, serta zona aman teks. Gambar BARU dibuat
 * untuk setiap slide yang dipilih (tidak memakai ulang foto lain). Acuan sukses: teks ditutup pun orang bisa
 * menebak isi slide dari gambarnya. Modul murni (diuji vitest).
 */

export const SUBJECT_TYPES = ["orang", "produk", "objek", "suasana", "before_after", "cara_pakai"] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

/** Prioritas bila kuota gambar terbatas: yang paling visual dulu. */
export const SUBJECT_PRIORITY: Record<SubjectType, number> = { orang: 5, produk: 5, before_after: 5, cara_pakai: 4, suasana: 3, objek: 2 };

export const slidePlanSchema = z.object({
  slide: z.number().int().min(1).max(10),
  needs_image: z.boolean(),
  reason: z.string().max(240),
  subject_type: z.enum(SUBJECT_TYPES).nullable().optional(),
  scene: z.string().max(400).optional().nullable(),
  image_prompt: z.string().max(1200).optional().nullable(),
  text_safe_zone: z.enum(["bottom-35%", "top-35%"]).default("bottom-35%"),
  /** Pakai foto produk asli klien sebagai acuan (subjek produk). */
  use_product_photo: z.boolean().default(false),
});
export type SlidePlan = z.infer<typeof slidePlanSchema>;

export const postPlanSchema = z.object({
  post: z.number().int().min(0),
  /** "Bible" visual satu carousel: talent, wardrobe, palet, lighting, lokasi — dipakai di semua prompt agar satu cerita. */
  bible: z.string().max(600),
  slides: z.array(slidePlanSchema).max(10),
});
export const directorSchema = z.object({ posts: z.array(postPlanSchema) });
export type PostPlan = z.infer<typeof postPlanSchema>;

export interface DirectorPost {
  kind: string;
  title: string;
  pillar: string | null;
  slides: Slide[];
  hasProductPhoto: boolean;
}

const slideText = (s: Slide) =>
  [s.label, s.title && plainText(s.title), s.accent, s.sub, s.body, ...(s.items ?? []), ...(s.options ?? []), s.button].filter(Boolean).join(" / ");

export function buildDirectorPrompt(o: { brandBlock: string; research: string | null; dna: StyleDna | null; palette: { primary: string; secondary: string }; posts: DirectorPost[] }) {
  const list = o.posts
    .map(
      (p, i) =>
        `### POST ${i} (${p.kind}, ${p.pillar ?? "-"}): ${p.title}${p.hasProductPhoto ? " — TERSEDIA foto produk asli klien" : ""}\n` +
        p.slides.map((s, k) => `slide ${k + 1} [${s.type}]: ${slideText(s)}`).join("\n"),
    )
    .join("\n\n");
  const style = o.dna
    ? `Gaya desain: ${o.dna.name} (${o.dna.description}); gaya gambar ${o.dna.visualStyle}${o.dna.imageHint ? `; ${o.dna.imageHint}` : ""}.`
    : "Gaya gambar: foto realistis/editorial.";
  return `Kamu Visual Director agensi kreatif Indonesia. Baca isi TIAP slide di bawah, lalu putuskan visualnya.

DATA BRAND:
${o.brandBlock || "- (kosong)"}
${o.research ? `\n${o.research}\n` : ""}
${style} Warna brand: ${o.palette.primary} & ${o.palette.secondary} (pakai sebagai aksen properti/wardrobe/cahaya, bukan teks).

Untuk setiap slide tentukan:
1. needs_image: apakah slide ini PERLU gambar baru? + reason singkat.
   - YA bila isinya bisa diperagakan/dilihat: pose, ekspresi, aktivitas orang; produk dipakai/dipegang; benda yang dibahas; suasana/tempat/momen;
     sebelum-sesudah dalam satu frame; tangan sedang melakukan langkah.
   - TIDAK untuk: rangkuman/list, polling, data/angka/statistik, CTA/ajakan, definisi abstrak. Slide ini tetap teks bersih.
   - Cover (slide 1) hampir selalu YA.
2. subject_type: orang | produk | objek | suasana | before_after | cara_pakai
3. scene: adegan dalam 1 kalimat (Bahasa Indonesia) yang MEMERAGAKAN isi slide itu sendiri.
   Contoh: slide "Berdiri rapat, sedikit miring" → "3 sahabat berdiri rapat & badan sedikit miring ke tengah di depan booth photobox, tertawa".
4. image_prompt (BAHASA INGGRIS, spesifik): subjek + aksi + setting + lighting + angle kamera + mood + wardrobe/properti.
   - Orang Indonesia & setting lokal yang relevan dengan brand (mall, kafe, acara kampus, nikahan, stasiun, dll).
   - Bukan tokoh publik/selebriti/orang nyata yang bisa dikenali.
   - JANGAN tulis teks/huruf/logo di dalam gambar.
   - Komposisi: subjek utama di area yang tidak tertutup teks; sisakan ruang kosong sesuai text_safe_zone.
5. text_safe_zone: "bottom-35%" (default) atau "top-35%" bila subjek paling kuat di bawah.
6. use_product_photo: true bila slide menampilkan produk klien DAN tersedia foto produk asli (produk tidak boleh dikarang).

Dalam SATU carousel jaga konsistensi: tulis "bible" (talent: jumlah, usia, gender, ciri, wardrobe; palet; lighting; lokasi)
dan pakai talent/lighting/palet yang SAMA di setiap image_prompt carousel itu supaya terasa satu cerita.
Acuan sukses: bila teks slide ditutup, orang tetap bisa menebak isi slide hanya dari gambarnya.

${list}

Balas HANYA JSON:
{"posts":[{"post":0,"bible":"...","slides":[{"slide":1,"needs_image":true,"reason":"...","subject_type":"orang","scene":"...","image_prompt":"...","text_safe_zone":"bottom-35%","use_product_photo":false}]}]}`;
}

export interface VisualJob {
  slide: number;
  cover: boolean;
  plan: SlidePlan;
  priority: number;
}

/** Pilih slide yang dibuatkan gambar: cover selalu (bila perlu) + slide isi paling visual sampai kuota. */
export function selectJobs(plan: PostPlan, opts: { innerCap: number; slideTypes: Slide["type"][] }): VisualJob[] {
  const usable = plan.slides.filter((p) => p.needs_image && p.image_prompt && p.subject_type && p.slide <= opts.slideTypes.length);
  const cover = usable.find((p) => p.slide === 1);
  const inner = usable
    .filter((p) => p.slide > 1 && ["point", "statement", "cover"].includes(opts.slideTypes[p.slide - 1]))
    .map((p) => ({ slide: p.slide, cover: false, plan: p, priority: SUBJECT_PRIORITY[p.subject_type!] }))
    .sort((a, b) => b.priority - a.priority || a.slide - b.slide)
    .slice(0, Math.max(0, opts.innerCap));
  return [...(cover ? [{ slide: 1, cover: true, plan: cover, priority: 9 }] : []), ...inner.sort((a, b) => a.slide - b.slide)];
}

/** Prompt akhir ke API gambar: prompt Visual Director + bible carousel + aturan wajib (4:5, zona teks, tanpa teks). */
export function finalImagePrompt(o: { plan: SlidePlan; bible: string; dna: StyleDna | null; palette: { primary: string; secondary: string }; productName?: string | null; talentRef?: boolean }) {
  const zone = o.plan.text_safe_zone === "top-35%" ? "Keep the TOP 35% of the frame calm and uncluttered (for text); main subject in the lower 65%." : "Keep the BOTTOM 35% of the frame calm and uncluttered (for text); main subject in the upper 65%.";
  const style =
    o.dna && !["photo-lifestyle", "editorial-photo", "product-studio"].includes(o.dna.visualStyle)
      ? `Visual style: ${o.dna.visualStyle.replace("-", " ")}${o.dna.imageHint ? `, ${o.dna.imageHint}` : ""}.`
      : `Photorealistic editorial photography, natural skin texture, shallow depth of field${o.dna?.imageHint ? `, ${o.dna.imageHint}` : ""}.`;
  return [
    o.plan.image_prompt!.replace(/\s+/g, " ").trim(),
    `Carousel continuity (same talent, wardrobe, palette and lighting in every slide): ${o.bible.replace(/\s+/g, " ").slice(0, 500)}.`,
    o.talentRef ? "Use the SAME people from the reference photo (same faces, hair, outfits), in this new pose and scene." : "",
    o.productName && o.plan.use_product_photo
      ? `Show the client's real product "${o.productName}" EXACTLY as in the product reference photo — same shape, colours, label, logo and packaging text; do not redesign it.`
      : "",
    style,
    `Colour accents from the brand palette ${o.palette.primary} and ${o.palette.secondary} in props, wardrobe or light.`,
    zone,
    "Indonesian people and local Indonesian setting where people appear; no real or recognisable public figures.",
    o.productName && o.plan.use_product_photo
      ? "Portrait 4:5 (1080x1350). No added text, captions, signage words or extra logos — only what is printed on the real product itself."
      : "Portrait 4:5 (1080x1350). Absolutely no text, letters, numbers, signage words, logos or watermarks anywhere in the image.",
  ]
    .filter(Boolean)
    .join(" ");
}
