import "server-only";
import { z } from "zod";
import { presentationSchema, THEME_NAMES } from "@/lib/pptx";
import { Composer, loadDeckFont, moodOf, resolvePalette, textWidthPt, type Dims, type SignatureImageRequest } from "./engine";
import type { FontRole, Scene, SceneFont, SceneSlide } from "./scene";

/**
 * Carousel Instagram/TikTok & poster (1 slide) memakai mesin desain Signature: mood, font, palet & KV yang sama
 * dengan deck, tapi kanvas potret/persegi dan teks lebih besar untuk dibaca di HP.
 */

const short = (n: number) => z.string().max(n);

export const CAROUSEL_FORMATS = { "1:1": 7.5, "4:5": 9.375, "9:16": 13.333 } as const;
export type CarouselFormat = keyof typeof CAROUSEL_FORMATS;

export const carouselSlideSchema = z.object({
  kind: z
    .enum(["hook", "point", "list", "stat", "quote", "cta"])
    .describe("hook = slide pembuka yang menghentikan scroll; point = 1 poin/tips; list = 3–5 poin; stat = angka besar; quote = kutipan/testimoni; cta = ajakan penutup"),
  kicker: short(40).optional().describe("Label kecil di atas judul, 1–3 kata"),
  title: z.string().min(1).max(90).describe("Judul slide: pendek & kuat (≤ 8 kata)"),
  body: short(220).optional().describe("1–2 kalimat pendek"),
  bullets: z.array(short(90)).max(5).optional().describe("Untuk kind list"),
  stat: z.object({ value: short(14), label: short(60) }).optional().describe("Untuk kind stat"),
  image_prompt: short(400).optional().describe("Adegan foto/ilustrasi (bahasa Inggris), tanpa teks — terutama untuk hook"),
  image_id: short(40).optional().describe("ID foto milik user (mis. foto produk) untuk slide ini"),
});

export const carouselSchema = z.object({
  title: z.string().min(1).max(90).describe("Topik/nama file carousel"),
  format: z.enum(["1:1", "4:5", "9:16"]).default("4:5").describe("4:5 = feed Instagram (paling umum); 1:1 = persegi; 9:16 = Story/Reels/TikTok"),
  theme: z.enum(THEME_NAMES).optional(),
  brand_color: z.string().regex(/^#?[0-9a-fA-F]{6}$/).optional(),
  design: presentationSchema.shape.design,
  slides: z.array(carouselSlideSchema).min(1).max(10).describe("1 slide = poster; 5–8 slide = carousel edukasi/promo"),
  caption: short(2200).optional().describe("Caption siap posting + hashtag relevan"),
});

export type CarouselInput = z.infer<typeof carouselSchema>;

const M = 0.6;

function canvasOf(format: CarouselFormat) {
  return { W: 7.5, H: CAROUSEL_FORMATS[format] };
}

/** Foto yang dibutuhkan: slide pertama = KV (cover), slide lain bila ada image_prompt/image_id. */
export function carouselImageRequests(input: CarouselInput, maxGenerated: number): SignatureImageRequest[] {
  const treatment = moodOf({ theme: input.theme ?? "midnight", design: input.design }).treatment;
  const aspect = treatment === "stage" ? input.format : input.format === "9:16" ? "1:1" : "4:3";
  const composition =
    treatment === "stage"
      ? "Main subject in the upper half of the frame; the lower 45% calm and darker so large text can sit on top."
      : "Subject centered and fully in frame, clean uncluttered background.";
  const all: SignatureImageRequest[] = [];
  input.slides.forEach((s, i) => {
    const key = i === 0 ? "cover" : String(i);
    if (s.image_id) all.push({ key, aspect, imageId: s.image_id, composition });
    else if (s.image_prompt) all.push({ key, aspect, prompt: s.image_prompt, composition });
  });
  const owned = all.filter((r) => r.imageId);
  return [...owned, ...all.filter((r) => !r.imageId).slice(0, maxGenerated)];
}

export function buildCarouselScene(input: CarouselInput, images: Dims, extras: { handle?: string; brandName?: string } = {}): Scene {
  const design = { theme: input.theme ?? "midnight", brand_color: input.brand_color, design: input.design };
  const pal = resolvePalette(design);
  const mood = moodOf(design);
  const { W, H } = canvasOf(input.format);
  const fk = { head: loadDeckFont(mood.head.file).fk, body: loadDeckFont(mood.body.file).fk, strong: loadDeckFont(mood.strong.file).fk };
  const fonts: Record<FontRole, SceneFont> = { head: mood.head, body: mood.body, strong: mood.strong };
  const total = input.slides.length;
  const tall = input.format === "9:16";
  const slides: SceneSlide[] = input.slides.map((s, i) => {
    const c = new Composer(pal, mood, fk, images, i, W, H);
    const key = i === 0 ? "cover" : String(i);
    const hasImg = c.has(key);
    const footY = H - 0.62;
    let top = M + (tall ? 0.6 : 0.2);
    const bottom = footY - 0.2;

    // Foto: panggung penuh (mood stage) atau bingkai di bagian atas (mood lain); tanpa foto → ornamen mood.
    if (hasImg && mood.treatment === "stage") {
      c.img(key, 0, 0, W, H);
      c.rect(0, 0, W, H, { fill: pal.bg, fo: pal.dark ? 0.2 : 0.12 });
      c.grad(0, H * 0.3, W, H * 0.7, "down", 0, 0.96);
      top = H * (tall ? 0.5 : 0.46);
    } else if (hasImg) {
      const ph = H * (tall ? 0.42 : 0.47);
      const r = mood.radius ? Math.max(0.2, mood.radius * 1.3) : 0;
      if (mood.decor === "confetti") c.rect(M + 0.14, M + 0.1, W - 2 * M, ph, { fill: pal.accent2, fo: 0.9, r, rot: 3 });
      const inset = mood.treatment === "frame" ? Math.max(0.1, r * 0.3) : 0;
      if (inset) c.rect(M, M, W - 2 * M, ph, { fill: pal.dark ? pal.surface : "FFFFFF", r });
      if (mood.treatment === "bleed") c.img(key, 0, 0, W, ph + M);
      else c.img(key, M + inset, M + inset, W - 2 * M - inset * 2, ph - inset * 2);
      top = (mood.treatment === "bleed" ? ph + M : M + ph) + 0.4;
    } else c.ambient(W - 1.2, H * 0.78, W * 0.35);

    const x = M;
    const w = W - 2 * M;
    const big = hasImg ? 0.8 : 1;
    // Isi disusun di composer terpisah, lalu digeser ke tengah area isi agar slide tidak kosong di bawah.
    const frame = c;
    const content = new Composer(pal, mood, fk, images, i, W, H);
    {
    const c = content;
    let y = top;
    if (s.kicker) y += c.kicker(s.kicker, x, y, w, 11) + 0.18;
    switch (s.kind) {
      case "hook":
      case "cta": {
        y += c.text(s.title, "head", x, y, w, { size: s.kind === "hook" ? 46 * big : 38 * big, min: 24, maxLines: 5, lh: 1.04, upper: mood.upper, ls: mood.headTracking }) + 0.25;
        if (s.body) y += c.text(s.body, "body", x, y, w, { size: 18, min: 13, maxLines: 4, lh: 1.4, color: pal.muted }) + 0.3;
        if (s.kind === "cta" && (extras.handle || extras.brandName)) {
          const label = extras.handle ?? extras.brandName ?? "";
          const pw = Math.min(w, textWidthPt(fk.strong, label, 15) / 72 + 0.6);
          c.rect(x, y, pw, 0.52, { fill: pal.accent, r: mood.radius ? 0.26 : 0 });
          c.text(label, "strong", x + 0.3, y, pw - 0.4, { size: 15, maxLines: 1, color: pal.onAccent, h: 0.52, valign: "middle" });
        }
        break;
      }
      case "point": {
        y += c.text(String(i).padStart(2, "0"), "head", x, y, 2, { size: 54 * big, color: pal.accent, lh: 1 }) + 0.15;
        y += c.text(s.title, "head", x, y, w, { size: 36 * big, min: 20, maxLines: 4, lh: 1.08, upper: mood.upper, ls: mood.headTracking }) + 0.25;
        if (s.body) c.text(s.body, "body", x, y, w, { size: 18, min: 13, lh: 1.45, color: pal.text, o: 0.9, maxLines: 8 });
        break;
      }
      case "list": {
        y += c.text(s.title, "head", x, y, w, { size: 36 * big, min: 20, maxLines: 3, lh: 1.08, upper: mood.upper, ls: mood.headTracking }) + 0.3;
        c.pointList((s.bullets ?? (s.body ? [s.body] : [])).slice(0, 5), x, y, w, bottom, 18);
        break;
      }
      case "stat": {
        y += c.text(s.stat?.value ?? "", "head", x, y, w, { size: 96 * big, min: 40, maxLines: 1, color: pal.accent, lh: 1 }) + 0.15;
        if (s.stat?.label) y += c.text(s.stat.label, "strong", x, y, w, { size: 18, min: 13, maxLines: 2, lh: 1.25 }) + 0.25;
        y += c.text(s.title, "head", x, y, w, { size: 26 * big, min: 18, maxLines: 3, lh: 1.1 }) + 0.2;
        if (s.body) c.text(s.body, "body", x, y, w, { size: 17, min: 12, lh: 1.4, color: pal.muted, maxLines: 5 });
        break;
      }
      case "quote": {
        y += c.text("“", "head", x, y, 2, { size: 110, color: pal.accent, lh: 0.85 }) - 0.2;
        y += c.text(s.body ?? s.title, "head", x, y, w, { size: 28 * big, min: 18, maxLines: 7, lh: 1.2 }) + 0.25;
        if (s.body) c.text(s.title, "strong", x, y, w, { size: 13, ls: 1.5, upper: true, color: pal.accent2, maxLines: 1 });
        break;
      }
    }

    }
    const textItems = content.items.filter((it) => "y" in it && "h" in it) as { y: number; h: number }[];
    const used = textItems.length ? Math.max(...textItems.map((it) => it.y + it.h)) - top : 0;
    const shift = Math.max(0, (bottom - top - used) * (hasImg ? 0.3 : 0.42));
    for (const it of content.items) {
      if ("y" in it) frame.items.push({ ...it, y: it.y + shift });
      else frame.items.push({ ...it, y1: it.y1 + shift, y2: it.y2 + shift });
    }
    const c2 = frame;
    // Kaki slide: logo / akun brand di kiri, nomor halaman & ajakan geser di kanan.
    if (images.logo) c2.logo(x, footY, 1.4, 0.36, "left");
    else if (extras.handle || extras.brandName) c2.text(extras.handle ?? extras.brandName, "strong", x, footY, w * 0.6, { size: 11, maxLines: 1, color: pal.muted, h: 0.36, valign: "middle" });
    if (total > 1) {
      const label = i === 0 ? "Geser →" : `${i + 1}/${total}`;
      c2.text(label, "strong", x + w * 0.5, footY, w * 0.5, { size: 11, maxLines: 1, align: "right", color: i === 0 ? pal.accent : pal.muted, h: 0.36, valign: "middle", ls: 1 });
    }
    return { bg: pal.bg, items: frame.items };
  });
  return { v: 1, w: W, h: H, mood: mood.id, fonts, slides };
}
