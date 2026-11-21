import { z } from "zod";

/**
 * Autopilot Konten — format slide (sama dengan skill konten @marqthink.ai, render.py).
 * Modul murni (tanpa server-only): dipakai generator, renderer, dan halaman ACC.
 */

export const SLIDE_TYPES = ["cover", "point", "poll", "list", "statement", "cta"] as const;
export type SlideType = (typeof SLIDE_TYPES)[number];

const text = (max: number) => z.string().trim().max(max);

export const slideSchema = z.object({
  type: z.enum(SLIDE_TYPES),
  title: text(120).optional(),
  accent: text(120).optional(),
  sub: text(260).optional(),
  body: text(260).optional(),
  label: text(28).optional(),
  num: text(3).optional(),
  options: z.array(text(80)).max(3).optional(),
  items: z.array(text(90)).max(6).optional(),
  button: text(40).optional(),
  tag: text(30).optional(),
  cta: text(30).optional(),
  theme: z.enum(["dark", "light"]).optional(),
  /** Deskripsi visual utama (bahasa Inggris) untuk dibuatkan gambar AI — cover & single image. */
  visual: text(400).optional(),
  /** Path gambar visual di storage (diisi server, bukan dari input pengguna). */
  image: text(300).optional(),
  /** Teks kecil di 4 sudut cover gaya Glossy (maks 4 frasa pendek). */
  corners: z.array(text(40)).max(4).optional(),
  /** Zona aman teks pada slide bervisual (dari Visual Director). */
  textZone: z.enum(["top", "bottom"]).optional(),
});
export type Slide = z.infer<typeof slideSchema>;

/** Gaya desain: classic (navy bercahaya), glossy (terang 3D), bold (gelap condensed), photo (foto penuh). */
export const LOOKS = ["glossy", "bold", "photo", "classic"] as const;
export type Look = (typeof LOOKS)[number];

export const POST_KINDS = ["carousel", "image", "reel"] as const;
export type PostKind = (typeof POST_KINDS)[number];

export const POST_STATUSES = ["draft", "approved", "script_ok", "rejected", "posted", "failed", "manual"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const PILLARS = ["Edukasi", "Relatable", "Insight & momen", "Produk/BTS"] as const;
export const FUNNELS = ["Awareness", "Consideration", "Acquisition"] as const;

/** Tema slide: Klasik = pertama & terakhir gelap; Glossy & Photo terang; Bold gelap (cover Photo memakai foto). */
export function slideTheme(s: Slide, i: number, n: number, look: Look = "classic"): "dark" | "light" {
  if (look === "bold") return "dark";
  if (look === "glossy") return "light";
  if (look === "photo") return i === 0 && isHero(s, i) ? "dark" : "light";
  return s.theme ?? (i === 0 || i === n - 1 ? "dark" : "light");
}

/** Slide yang memakai tata letak cover besar dengan visual utama (gaya studio). */
export function isHero(s: Slide, i: number) {
  return i === 0 && (s.type === "cover" || s.type === "statement");
}

/** Hapus penanda serif (*kata*) untuk teks polos. */
export const plainText = (s: string) => s.replace(/\*([^*]+)\*/g, "$1");

/** Teks pojok kanan atas ("2/6") dan kanan bawah ("Geser →"). */
export function slideCorners(s: Slide, i: number, n: number, en = false) {
  const tag = s.tag ?? (n > 1 ? `${i + 1}/${n}` : "");
  const cta = s.cta ?? (n > 1 && i < n - 1 ? (en ? "Swipe →" : "Geser →") : "");
  return { tag, cta };
}

/** Teks polos semua slide (untuk lint & pencarian). */
export function slidesText(slides: Slide[]) {
  return slides
    .map((s) => [s.title && plainText(s.title), s.accent, s.sub, s.body, s.label, ...(s.options ?? []), ...(s.items ?? []), s.button].filter(Boolean).join(" "))
    .join("\n");
}

/** Tema brand untuk render: warna utama (royal), tengah (blue), aksen (cyan), latar gelap. */
export interface SlideBrand {
  name: string;
  handle: string;
  royal: string;
  blue: string;
  cyan: string;
  navy: string;
}

const HEX = /^#?[0-9a-f]{6}$/i;
const norm = (h: string) => `#${h.replace("#", "").toUpperCase()}`;

function mixHex(a: string, b: string, t: number) {
  const pa = norm(a).slice(1).match(/../g)!.map((x) => parseInt(x, 16));
  const pb = norm(b).slice(1).match(/../g)!.map((x) => parseInt(x, 16));
  return `#${pa.map((v, k) => Math.round(v + (pb[k] - v) * t).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/** Palet dari Brand Kit; tanpa warna brand → palet Marqthink (navy, royal blue, cyan). */
export function brandPalette(o: { name?: string | null; handle?: string | null; primary?: string | null; secondary?: string | null }): SlideBrand {
  const royal = o.primary && HEX.test(o.primary.trim()) ? norm(o.primary.trim()) : "#0A3DFF";
  const cyan = o.secondary && HEX.test(o.secondary.trim()) ? norm(o.secondary.trim()) : royal === "#0A3DFF" ? "#00E5FF" : mixHex(royal, "#FFFFFF", 0.45);
  const handleRaw = (o.handle ?? "").trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "");
  const handle = handleRaw ? `@${handleRaw.replace(/^@/, "")}` : (o.name ?? "").trim();
  return {
    name: (o.name ?? "").trim() || "Brand",
    handle,
    royal,
    blue: royal === "#0A3DFF" && cyan === "#00E5FF" ? "#0A84FF" : mixHex(royal, cyan, 0.5),
    cyan,
    navy: royal === "#0A3DFF" ? "#0A0F23" : mixHex(royal, "#070A16", 0.88),
  };
}
