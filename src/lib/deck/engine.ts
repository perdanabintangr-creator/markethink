import "server-only";
import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { resolveDeckTheme } from "@/lib/deck-theme";
import type { PresentationInput, SlideInput } from "@/lib/pptx";
import { DECK_MOODS, IMAGE_STYLE_PROMPT, type DeckMood, type ImageStyle, type MoodId } from "./moods";
import { SCENE_H, SCENE_W, type FontRole, type Scene, type SceneFont, type SceneItem, type SceneSlide } from "./scene";

/**
 * AI Art Director (Promax): menyusun deck "Signature" — font & bahasa bentuk sesuai mood tema, foto KV sebagai panggung,
 * kotak transparan bergaris, kicker berspasi, judul besar, kalimat pernyataan di bawah. Hasilnya Scene (lihat scene.ts)
 * yang teksnya sudah diukur dengan metrik font asli, jadi PPT, PDF & pratinjau tampil sama dan tidak meluber.
 */

const W = SCENE_W;
const H = SCENE_H;
const M = 0.75;
const TOP = 0.62;

// ---------------------------------------------------------------------------
// Font (metrik dari file font asli)
// ---------------------------------------------------------------------------

interface FkFont {
  unitsPerEm: number;
  ascent: number;
  descent: number;
  layout(text: string): { advanceWidth: number };
  hasGlyphForCodePoint(cp: number): boolean;
}

const FONT_DIR = path.join(process.cwd(), "public", "fonts", "deck");
const fontCache = new Map<string, { bytes: Uint8Array; fk: FkFont }>();

export function loadDeckFont(file: string) {
  let hit = fontCache.get(file);
  if (!hit) {
    const bytes = new Uint8Array(fs.readFileSync(path.join(FONT_DIR, `${file}.woff`)));
    hit = { bytes, fk: fontkit.create(bytes) as unknown as FkFont };
    fontCache.set(file, hit);
  }
  return hit;
}

/** Posisi baseline baris pertama dari atas kotak teks (pt) — sama dengan cara CSS memusatkan huruf di tinggi baris. */
export function baselineOffset(fk: FkFont, size: number, lh: number) {
  const a = fk.ascent / fk.unitsPerEm;
  const d = Math.abs(fk.descent) / fk.unitsPerEm;
  return ((lh - (a + d)) * size) / 2 + a * size;
}

export function textWidthPt(fk: FkFont, text: string, size: number, ls = 0) {
  return (fk.layout(text).advanceWidth / fk.unitsPerEm) * size + ls * Math.max(0, text.length - 1);
}

const GLYPH_SWAP: Record<string, string> = { "→": "»", "⇒": "»", "←": "«", "✓": "•", "✔": "•", "★": "•", "≥": ">=", "≤": "<=", "×": "x", "…": "..." };

/** Ganti/buang karakter yang tidak ada di font (emoji, panah) agar tidak muncul kotak kosong. */
function sanitize(fk: FkFont, text: string) {
  let out = "";
  for (const ch of text.replace(/[^\S\n]+/g, " ").trim()) {
    const cp = ch.codePointAt(0)!;
    if (ch === "\n" || fk.hasGlyphForCodePoint(cp)) out += ch;
    else if (GLYPH_SWAP[ch] && [...GLYPH_SWAP[ch]].every((c) => fk.hasGlyphForCodePoint(c.codePointAt(0)!))) out += GLYPH_SWAP[ch];
    else if (ch === "•") out += "-";
  }
  return out.replace(/[^\S\n]+/g, " ").replace(/ ?\n ?/g, "\n").trim();
}

function wrapLines(fk: FkFont, text: string, size: number, ls: number, maxPt: number) {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let cur = "";
    for (const word of para.split(" ").filter(Boolean)) {
      const next = cur ? `${cur} ${word}` : word;
      if (textWidthPt(fk, next, size, ls) <= maxPt) {
        cur = next;
        continue;
      }
      if (cur) lines.push(cur);
      cur = word;
      // Kata lebih panjang dari kotak → dipotong per huruf.
      while (textWidthPt(fk, cur, size, ls) > maxPt && cur.length > 1) {
        let k = cur.length - 1;
        while (k > 1 && textWidthPt(fk, cur.slice(0, k), size, ls) > maxPt) k--;
        lines.push(cur.slice(0, k));
        cur = cur.slice(k);
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

/** Isi kotak berisi beberapa kalimat → satu kalimat per baris (lebih mudah dipindai, seperti deck referensi). */
function lineUp(text: string) {
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/).map((t) => t.trim()).filter(Boolean);
  return parts.length >= 2 && parts.length <= 5 ? parts.map((t) => t.replace(/\.$/, "")).join("\n") : text;
}

// ---------------------------------------------------------------------------
// Palet
// ---------------------------------------------------------------------------

interface Pal {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  onAccent: string;
  dark: boolean;
}

const rgbOf = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
function relLum(hex: string) {
  const [r, g, b] = rgbOf(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
export function mix(a: string, b: string, t: number) {
  const pa = rgbOf(a);
  const pb = rgbOf(b);
  return pa
    .map((v, i) => Math.round((v * (1 - t) + pb[i] * t) * 255).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}
const cleanHex = (v: string | undefined) => (v && /^#?[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim().replace("#", "").toUpperCase() : undefined);

export function resolvePalette(input: Pick<PresentationInput, "theme" | "brand_color" | "design">): Pal {
  const base = resolveDeckTheme({ theme: input.theme, brand_color: input.brand_color });
  const p = input.design?.palette;
  const bg = cleanHex(p?.bg) ?? base.bg;
  const dark = relLum(bg) < 0.25;
  let text = cleanHex(p?.text) ?? base.text;
  if (contrast(text, bg) < 7) text = dark ? "FFFFFF" : "111827";
  let muted = cleanHex(p?.muted) ?? base.muted;
  if (contrast(muted, bg) < 3.6) muted = mix(text, bg, 0.3);
  let surface = cleanHex(p?.surface) ?? base.surface;
  if (contrast(surface, bg) < 1.08 || contrast(text, surface) < 4.5) surface = mix(bg, text, dark ? 0.08 : 0.05);
  const strong = (c: string) => {
    let out = c;
    for (let i = 0; i < 4 && contrast(out, bg) < 2.6; i++) out = mix(out, text, 0.3);
    return out;
  };
  const accent = strong(cleanHex(p?.accent) ?? cleanHex(input.brand_color) ?? base.accent);
  const accent2 = strong(cleanHex(p?.accent2) ?? base.accent2);
  return { bg, surface, text, muted, accent, accent2, dark, onAccent: relLum(accent) > 0.4 ? "111111" : "FFFFFF" };
}

/** Arahan gaya gambar deck (foto / ilustrasi 3D lucu / flat / cat air). */
export function imageStylePrompt(input: Pick<PresentationInput, "theme" | "design">) {
  const style = (input.design?.image_style as ImageStyle | undefined) ?? moodOf(input).imageStyle;
  return IMAGE_STYLE_PROMPT[style] ?? IMAGE_STYLE_PROMPT.photo;
}

/** Maskot / ilustrasi lucu → foto slide perlu KV sebagai acuan agar karakternya tidak berubah bentuk. */
export function deckNeedsReference(input: Pick<PresentationInput, "theme" | "design">) {
  const style = (input.design?.image_style as ImageStyle | undefined) ?? moodOf(input).imageStyle;
  return style === "3d" || style === "flat" || moodOf(input).id === "playful" || /maskot|mascot/i.test(input.design?.cast ?? "");
}

const THEME_MOOD: Record<string, MoodId> = { midnight: "modern", clean: "minimal", sunset: "warm", forest: "warm", ocean: "modern", luxe: "editorial", coral: "playful", corporate: "corporate" };
export const moodOf = (input: Pick<PresentationInput, "theme" | "design">): DeckMood =>
  DECK_MOODS[(input.design?.mood as MoodId) ?? THEME_MOOD[input.theme ?? ""] ?? "modern"] ?? DECK_MOODS.modern;

// ---------------------------------------------------------------------------
// Permintaan foto (KV + foto per slide dengan komposisi yang pas untuk tata letaknya)
// ---------------------------------------------------------------------------

export interface SignatureImageRequest {
  key: string;
  aspect: string;
  prompt?: string;
  imageId?: string;
  /** Arahan komposisi agar teks/kotak tidak menutupi subjek. */
  composition: string;
  product?: boolean;
}

const FULL = "Wide cinematic establishing shot; key subject in the upper-middle of the frame; lower half calm and darker so text panels can sit on top.";
const HALF = "Vertical composition, subject centered with breathing room, rich atmosphere.";
const PRIORITY: SlideInput["layout"][] = ["cards", "timeline", "section", "stats", "closing", "image_text", "product", "comparison", "quote", "gallery", "agenda", "bullets"];

const SIDE = "Vertical composition, main subject centered and fully in frame, clean uncluttered background.";

function slidePhoto(s: SlideInput, treatment: DeckMood["treatment"]): { aspect: string; composition: string } | null {
  if (treatment !== "stage") {
    if (s.layout === "product") return { aspect: "1:1", composition: "Product centered and fully visible." };
    return SPLIT_LAYOUTS.has(s.layout) ? { aspect: "3:4", composition: SIDE } : null;
  }
  switch (s.layout) {
    case "cards":
      return (s.cards?.length ?? 0) === 2
        ? { aspect: "16:9", composition: "Split composition: one subject in the left half and a contrasting second subject in the right half, both in the upper two-thirds; lower third calm and darker." }
        : { aspect: "16:9", composition: FULL };
    case "timeline":
    case "comparison":
    case "closing":
      return { aspect: "16:9", composition: FULL };
    case "section":
    case "quote":
      return { aspect: "16:9", composition: "Atmospheric wide shot; subject on the right third; the left half calm and darker for a large title." };
    case "stats":
    case "image_text":
    case "agenda":
    case "bullets":
      return { aspect: "3:4", composition: HALF };
    case "product":
      return { aspect: "1:1", composition: "Premium studio product shot, product centered and fully visible." };
    default:
      return null;
  }
}

export function signatureImageRequests(input: PresentationInput, maxGenerated = 8): SignatureImageRequest[] {
  const all: (SignatureImageRequest & { rank: number })[] = [];
  const treatment = moodOf(input).treatment;
  const coverAspect = treatment === "stage" ? "16:9" : "3:4";
  const coverComp =
    treatment === "stage"
      ? "Hero key visual: main subject(s) in the right half of the frame; the left 45% is calm, darker negative space for the title."
      : "Hero key visual, vertical composition, main subject centered and fully in frame, clean uncluttered background.";
  if (input.cover_image_id) all.push({ key: "cover", aspect: coverAspect, imageId: input.cover_image_id, composition: coverComp, rank: -1 });
  else all.push({ key: "cover", aspect: coverAspect, prompt: input.cover_image_prompt || input.title, composition: coverComp, rank: -1 });
  input.slides.forEach((s, i) => {
    const rank = (PRIORITY.indexOf(s.layout) + 1 || 20) + i / 100;
    if (s.layout === "gallery") {
      (s.gallery ?? []).slice(0, 3).forEach((g, k) => {
        const req = { key: `${i}-g${k}`, aspect: "4:3", composition: "Editorial photo, subject centered.", rank };
        if (g.image_id) all.push({ ...req, imageId: g.image_id });
        else if (g.image_prompt) all.push({ ...req, prompt: g.image_prompt });
      });
      return;
    }
    const photo = slidePhoto(s, treatment);
    if (!photo) return;
    if (s.image_id) all.push({ key: String(i), ...photo, imageId: s.image_id, rank, product: s.layout === "product" });
    else if (s.image_prompt) all.push({ key: String(i), ...photo, prompt: s.image_prompt, rank, product: s.layout === "product" });
  });
  const owned = all.filter((r) => r.imageId);
  const generated = all
    .filter((r) => !r.imageId)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, maxGenerated);
  return [...owned, ...generated].map((r) => ({ key: r.key, aspect: r.aspect, prompt: r.prompt, imageId: r.imageId, composition: r.composition, product: r.product }));
}

// ---------------------------------------------------------------------------
// Penyusun slide
// ---------------------------------------------------------------------------

interface TextOpts {
  size: number;
  min?: number;
  maxLines?: number;
  color?: string;
  o?: number;
  ls?: number;
  lh?: number;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  upper?: boolean;
  /** Tinggi kotak tetap (inci); teks dikecilkan/dipotong agar muat. */
  h?: number;
}

type Dims = Record<string, { width: number; height: number }>;

class Composer {
  items: SceneItem[] = [];
  /** Area isi (inci) — menyempit bila foto ditaruh di bingkai/separuh slide. */
  ax = M;
  aw = W - 2 * M;
  /** Foto yang sudah dipakai sebagai panel samping (tidak dipakai lagi oleh layout). */
  hidden = new Set<string>();
  constructor(
    readonly pal: Pal,
    readonly mood: DeckMood,
    readonly fonts: Record<FontRole, FkFont>,
    readonly images: Dims,
    /** Nomor slide — untuk variasi ornamen. */
    readonly seed = 0,
  ) {}

  has = (key: string) => Boolean(this.images[key]) && !this.hidden.has(key);

  measure(str: string | undefined, role: FontRole, w: number, o: TextOpts) {
    const fk = this.fonts[role];
    const ls = o.ls ?? 0;
    const lh = o.lh ?? 1.25;
    const maxLines = o.maxLines ?? 99;
    const min = Math.min(o.min ?? o.size, o.size);
    const text = sanitize(fk, o.upper ? (str ?? "").toUpperCase() : (str ?? ""));
    if (!text) return { lines: [] as string[], size: o.size, h: 0, ls, lh };
    let size = o.size;
    for (;;) {
      let lines = wrapLines(fk, text, size, ls, w * 72);
      const hh = (lines.length * size * lh) / 72;
      if (lines.length <= maxLines && (!o.h || hh <= o.h + 1e-6)) return { lines, size, h: hh, ls, lh };
      if (size - 1 < min) {
        const cap = Math.max(1, Math.min(maxLines, o.h ? Math.floor((o.h * 72) / (size * lh)) : maxLines));
        if (lines.length > cap) {
          lines = lines.slice(0, cap);
          let last = lines[cap - 1];
          while (last.length > 1 && textWidthPt(fk, `${last}…`, size, ls) > w * 72) last = last.slice(0, -1).trimEnd();
          lines[cap - 1] = `${last.replace(/[\s,.;:–-]+$/, "")}…`;
        }
        return { lines, size, h: (lines.length * size * lh) / 72, ls, lh };
      }
      size -= 1;
    }
  }

  /** Tulis teks; kembalikan tinggi terpakai (inci). */
  text(str: string | undefined, role: FontRole, x: number, y: number, w: number, o: TextOpts) {
    const m = this.measure(str, role, w, o);
    if (!m.lines.length) return 0;
    const h = o.h ?? m.h;
    this.items.push({ t: "text", x, y, w, h, lines: m.lines, font: role, size: m.size, color: o.color ?? this.pal.text, o: o.o, ls: m.ls || undefined, lh: m.lh, align: o.align, valign: o.valign });
    return h;
  }

  rect(x: number, y: number, w: number, h: number, p: { fill?: string; fo?: number; line?: string; lo?: number; lw?: number; r?: number; rot?: number } = {}) {
    this.items.push({ t: "rect", x, y, w, h, ...p });
  }
  ellipse(x: number, y: number, w: number, h: number, p: { fill?: string; fo?: number; line?: string; lo?: number; lw?: number } = {}) {
    this.items.push({ t: "ellipse", x, y, w, h, ...p });
  }
  line(x1: number, y1: number, x2: number, y2: number, color: string, lw = 0.75, o?: number) {
    this.items.push({ t: "line", x1, y1, x2, y2, color, lw, o });
  }
  grad(x: number, y: number, w: number, h: number, dir: "right" | "left" | "down" | "up", from: number, to: number, color = this.pal.bg) {
    this.items.push({ t: "grad", x, y, w, h, color, from, to, dir });
  }
  img(key: string, x: number, y: number, w: number, h: number, fit: "cover" | "contain" = "cover") {
    if (!this.has(key)) return false;
    this.items.push({ t: "img", key, x, y, w, h, fit });
    return true;
  }

  // ---- komponen ----

  get headUpper() {
    return this.mood.upper;
  }

  /** Foto penuh sebagai panggung + penggelap agar teks terbaca. */
  stage(key: string, dim = 0.3) {
    if (!this.img(key, 0, 0, W, H)) return false;
    this.rect(0, 0, W, H, { fill: this.pal.bg, fo: this.pal.dark ? dim : dim * 0.75 });
    // Aksen khas mood tetap terlihat di atas foto (garis balap / blok warna di tepi kanan).
    if (this.mood.decor === "speed")
      [0, 0.3].forEach((dx, k) => this.rect(W - 0.9 + dx, -1.2, k ? 0.07 : 0.16, H + 2.4, { fill: k ? this.pal.accent2 : this.pal.accent, fo: k ? 0.7 : 0.85, rot: 24 }));
    else if (this.mood.decor === "blocks") this.rect(W - 0.32, 0, 0.32, H, { fill: this.pal.accent });
    return true;
  }

  /** Ornamen khas mood (di belakang isi). cx/cy/r = posisi saran untuk ornamen bulat. */
  ambient(cx = W - 2.4, cy = H * 0.62, r = 2.6) {
    const { accent, accent2, dark, text } = this.pal;
    const rnd = (k: number) => {
      const v = Math.sin((this.seed + 1) * 12.9898 + k * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    // Slide dengan foto samping: ornamen tepi sudah digambar sebelum foto; ornamen besar tidak dipakai.
    if (this.hidden.has("__decor")) return;
    switch (this.mood.decor) {
      case "glow":
        this.ellipse(cx - r * 1.3, cy - r * 1.3, r * 2.6, r * 2.6, { fill: accent, fo: dark ? 0.07 : 0.05 });
        this.ellipse(cx - r, cy - r, r * 2, r * 2, { line: accent, lo: 0.16, lw: 0.75 });
        this.ellipse(cx - r * 0.62, cy - r * 0.62, r * 1.24, r * 1.24, { line: accent2, lo: 0.22, lw: 0.75 });
        return;
      case "confetti": {
        // Bulatan & "stiker" warna-warni di sudut — ceria tapi tidak mengganggu teks.
        const spots = [
          { x: W - 0.95, y: 0.55, d: 0.75, c: accent, o: 0.9 },
          { x: W - 1.85, y: 0.35, d: 0.28, c: accent2, o: 0.9 },
          { x: W - 0.5, y: 1.75, d: 0.36, c: accent2, o: 0.55 },
          { x: 0.25, y: H - 0.9, d: 0.55, c: accent2, o: 0.8 },
          { x: 0.95, y: H - 0.42, d: 0.22, c: accent, o: 0.7 },
          { x: W - 1.2, y: H - 0.85, d: 0.5, c: accent, o: 0.35 },
        ];
        spots.forEach((p, k) => {
          const j = (rnd(k) - 0.5) * 0.3;
          this.ellipse(p.x + j, p.y - j, p.d, p.d, { fill: p.c, fo: p.o });
        });
        this.rect(W - 2.0, H - 0.75, 0.4, 0.4, { fill: accent2, fo: 0.85, r: 0.1, rot: 15 + rnd(9) * 30 });
        this.rect(0.45, 0.42, 0.3, 0.3, { fill: accent, fo: 0.6, r: 0.08, rot: -20 + rnd(7) * 20 });
        return;
      }
      case "speed": {
        // Garis balap miring di sisi kanan.
        const base = W - 2.6 + rnd(1) * 0.6;
        [0, 0.42, 0.7].forEach((dx, k) =>
          this.rect(base + dx, -1.2, [0.26, 0.12, 0.05][k], H + 2.4, { fill: k === 1 ? accent2 : accent, fo: [0.9, 0.55, 0.35][k], rot: 24 }),
        );
        return;
      }
      case "organic":
        this.ellipse(cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8, { fill: accent2, fo: dark ? 0.14 : 0.12 });
        this.ellipse(-1.1, -1.3, 2.6, 2.6, { fill: accent, fo: 0.1 });
        this.ellipse(cx - r * 0.55, cy - r * 0.55, r * 1.1, r * 1.1, { line: accent, lo: 0.35, lw: 1 });
        return;
      case "arch":
        this.ellipse(cx - r, cy - r, r * 2, r * 2, { fill: accent, fo: 0.08 });
        this.rect(W - 2.9, 0.75, 2.1, H - 1.3, { line: accent, lo: 0.35, lw: 0.75, r: 1.05 });
        return;
      case "rules":
        this.line(M, 0.38, W - M, 0.38, accent, 1.25, 0.9);
        this.line(M, H - 0.32, W - M, H - 0.32, text, 0.5, 0.18);
        return;
      case "ornament":
        this.rect(0.24, 0.24, W - 0.48, H - 0.48, { line: accent, lo: 0.65, lw: 0.75 });
        this.rect(0.32, 0.32, W - 0.64, H - 0.64, { line: accent, lo: 0.3, lw: 0.5 });
        for (const [x, y] of [[W / 2, 0.28], [W / 2, H - 0.28]]) this.rect(x - 0.07, y - 0.07, 0.14, 0.14, { fill: accent, rot: 45 });
        return;
      case "blocks":
        this.rect(W - 0.32, 0, 0.32, H, { fill: accent });
        this.rect(W - 0.75, H - 0.9, 0.3, 0.3, { fill: accent2 });
        return;
      default:
        return;
    }
  }

  /** Label kecil di atas judul sesuai mood: teks berspasi, pil berwarna, atau batang aksen. */
  kicker(str: string | undefined, x: number, y: number, w: number, size = 9.5) {
    if (!str) return 0;
    const style = this.mood.kicker;
    if (style === "pill") {
      const m = this.measure(str, "strong", w - 0.4, { size, ls: 1.2, upper: true, maxLines: 1, min: 7.5 });
      const tw = Math.min(w, (Math.max(...m.lines.map((l) => textWidthPt(this.fonts.strong, l, m.size, m.ls))) + 0.1) / 72 + 0.36);
      const h = (m.size * 1.2) / 72 + 0.16;
      this.rect(x, y, tw, h, { fill: this.pal.accent, r: h / 2 });
      this.text(str, "strong", x + 0.18, y + 0.08, tw - 0.3, { size: m.size, ls: 1.2, upper: true, maxLines: 1, color: this.pal.onAccent, lh: 1.2 });
      return h;
    }
    if (style === "bar") {
      const h = this.text(str, "strong", x + 0.42, y, w - 0.42, { size, ls: 2, upper: true, color: this.pal.accent2, maxLines: 1, min: 8 });
      this.rect(x, y + h / 2 - 0.035, 0.3, 0.07, { fill: this.pal.accent });
      return h;
    }
    return this.text(str, "strong", x, y, w, { size, ls: 2.6, upper: true, color: this.pal.accent2, maxLines: 1, min: 8 });
  }

  /** Foto di samping (bingkai kartu / separuh slide), lalu area isi pindah ke sisi lain. */
  photoPanel(key: string, side: "left" | "right") {
    if (!this.has(key)) return false;
    const { pal, mood } = this;
    if (mood.treatment === "bleed") {
      const pw = W * 0.44;
      const x = side === "right" ? W - pw : 0;
      this.img(key, x, 0, pw, H);
      this.rect(x, 0, pw, H, { fill: pal.accent, fo: 0.06 });
      this.line(side === "right" ? x : pw, 0, side === "right" ? x : pw, H, pal.accent, 2.5);
      this.ax = side === "right" ? M : pw + 0.6;
      this.aw = side === "right" ? W - pw - M - 0.55 : W - M - this.ax;
    } else {
      const fw = W * 0.4;
      const fh = H - 1.0;
      const x = side === "right" ? W - fw - 0.55 : 0.55;
      const y = 0.5;
      const r = mood.radius ? Math.max(0.2, mood.radius * 1.3) : 0;
      // Bentuk latar khas mood di belakang bingkai.
      if (mood.decor === "confetti") this.rect(x + 0.18, y + 0.12, fw, fh, { fill: pal.accent2, fo: 0.9, r, rot: side === "right" ? 4 : -4 });
      else if (mood.decor === "organic") this.ellipse(x + fw - 1.6, y + fh - 2.2, 2.8, 2.8, { fill: pal.accent, fo: 0.85 });
      else if (mood.decor === "arch") this.rect(x - 0.22, y - 0.22, fw + 0.44, fh + 0.44, { line: pal.accent, lo: 0.5, lw: 0.75, r: r + 0.2 });
      const inset = mood.treatment === "frame" && mood.decor !== "none" ? Math.max(0.12, r * 0.35) : 0;
      if (inset) this.rect(x, y, fw, fh, { fill: pal.dark ? mix(pal.surface, pal.text, 0.06) : "FFFFFF", r });
      this.img(key, x + inset, y + inset, fw - inset * 2, fh - inset * 2);
      // Lapisan warna tipis agar semua foto terasa satu seri.
      this.rect(x + inset, y + inset, fw - inset * 2, fh - inset * 2, { fill: pal.accent, fo: 0.06 });
      if (!inset) this.rect(x, y, fw, fh, { line: pal.text, lo: 0.12, lw: 0.75 });
      this.ax = side === "right" ? M : x + fw + 0.6;
      this.aw = side === "right" ? x - M - 0.5 : W - M - this.ax;
    }
    this.hidden.add(key);
    return true;
  }

  header(s: Pick<SlideInput, "kicker" | "title" | "subtitle">, x: number, y: number, w: number, o: { size?: number; maxLines?: number; rule?: boolean; sub?: boolean } = {}) {
    let cy = y;
    if (s.kicker) cy += this.kicker(s.kicker, x, cy, w) + 0.12;
    cy += this.text(s.title, "head", x, cy, w, { size: o.size ?? 40, min: 24, maxLines: o.maxLines ?? 2, lh: 1.08, ls: this.mood.headTracking, upper: this.headUpper }) + 0.14;
    if (s.subtitle && o.sub !== false) cy += this.text(s.subtitle, "body", x, cy, w, { size: 13, min: 11, maxLines: 2, lh: 1.35, color: this.pal.muted }) + 0.1;
    if (o.rule ?? ["outline", "rule"].includes(this.mood.panel)) {
      this.line(x, cy + 0.06, x + w, cy + 0.06, this.pal.text, 0.6, 0.14);
      cy += 0.16;
    }
    return cy;
  }

  /** Kotak isi sesuai bahasa bentuk mood. Mengembalikan warna tinta di dalamnya. */
  panel(x: number, y: number, w: number, h: number, hl = false) {
    const { pal, mood } = this;
    const r = mood.radius || undefined;
    let ink = pal.text;
    let sub = pal.muted;
    switch (mood.panel) {
      case "outline":
        this.rect(x, y, w, h, { fill: hl ? pal.accent : pal.surface, fo: hl ? 0.16 : pal.dark ? 0.62 : 0.8, line: pal.accent, lo: hl ? 0.95 : 0.45, lw: 0.75, r });
        if (!r) this.line(x, y, x, y + h, pal.accent, 1.75, 0.9);
        break;
      case "solid":
        if (hl) {
          this.rect(x, y, w, h, { fill: pal.accent, fo: 1, r });
          ink = pal.onAccent;
          sub = pal.onAccent;
        } else this.rect(x, y, w, h, { fill: pal.surface, fo: 0.94, r });
        break;
      case "glass":
        this.rect(x, y, w, h, { fill: pal.surface, fo: pal.dark ? 0.55 : 0.72, line: hl ? pal.accent : pal.text, lo: hl ? 0.9 : 0.16, lw: hl ? 1 : 0.75, r });
        break;
      case "rule":
        if (hl) this.rect(x, y, w, h, { fill: pal.accent, fo: 0.09 });
        this.line(x, y, x + w, y, pal.accent, 1.5);
        break;
    }
    return { ink, sub, pad: mood.panel === "rule" ? 0.18 : 0.24, padX: mood.panel === "rule" ? (hl ? 0.18 : 0) : 0.24 };
  }

  /** Tinggi alami isi kotak (untuk kotak yang menyesuaikan isi). */
  panelHeight(w: number, p: { heading?: string; body?: string; index?: string }) {
    const pad = this.mood.panel === "rule" ? 0.18 : 0.24;
    const padX = this.mood.panel === "rule" ? 0 : 0.24;
    const iw = w - padX * 2;
    let h = pad * 1.8;
    if (p.index) h += 0.27;
    if (p.heading) {
      const [role, , o] = this.headingStyle();
      h += this.measure(p.heading, role, iw, o).h + 0.1;
    }
    if (p.body) h += this.measure(lineUp(p.body), "body", iw, { size: 10.5, lh: 1.42 }).h + 0.04;
    return h;
  }

  headingStyle(color?: string): [FontRole, number, TextOpts] {
    const loud = this.mood.upper || this.mood.panel === "outline";
    return loud
      ? ["strong", 0, { size: 12.5, min: 10, ls: 1.3, upper: true, maxLines: 2, color, lh: 1.2 }]
      : ["head", 0, { size: 15, min: 12, maxLines: 2, color, lh: 1.15 }];
  }

  /** Judul + isi di dalam kotak; teks menyesuaikan tinggi kotak. */
  panelBody(x: number, y: number, w: number, h: number, p: { heading?: string; body?: string; index?: string; hl?: boolean; center?: boolean; lh?: number }) {
    const c = this.panel(x, y, w, h, p.hl);
    const ix = x + c.padX;
    const iw = w - c.padX * 2;
    let cy = y + c.pad;
    const bottom = y + h - c.pad * 0.8;
    const align = p.center ? "center" : "left";
    if (p.index) cy += this.text(p.index, "strong", ix, cy, iw, { size: 9, ls: 1.6, color: c.ink === this.pal.text ? this.pal.accent2 : c.ink, maxLines: 1, align }) + 0.08;
    if (p.heading) {
      const [role, , o] = this.headingStyle(c.ink);
      cy += this.text(p.heading, role, ix, cy, iw, { ...o, align }) + 0.1;
    }
    if (p.body && bottom - cy > 0.15) this.text(lineUp(p.body), "body", ix, cy, iw, { size: 10.5, min: 8.5, lh: p.lh ?? 1.42, color: c.sub, o: c.sub === c.ink ? 0.88 : undefined, h: bottom - cy, align });
  }

  /** Kotak pernyataan (so-what) melebar di bawah slide. */
  statement(text: string, x: number, bottom: number, w: number) {
    const editorial = ["editorial", "warm", "beauty", "heritage"].includes(this.mood.id);
    const role: FontRole = editorial ? "head" : "strong";
    const o: TextOpts = { size: editorial ? 17 : 14.5, min: 11, maxLines: 2, lh: 1.25 };
    const m = this.measure(text, role, w - 0.6, o);
    const h = m.h + 0.4;
    const y = bottom - h;
    const c = this.panel(x, y, w, h);
    if (this.mood.panel === "outline") this.line(x, y, x, y + h, this.pal.accent, 3);
    this.text(text, role, x + Math.max(c.padX, 0.3), y + 0.2, w - 0.6, { ...o, color: c.ink });
    return h;
  }

  footnote(text: string) {
    this.text(text, "body", M, H - 0.5, W - 2 * M, { size: 8.5, min: 7.5, maxLines: 1, color: this.pal.muted, o: 0.9 });
  }

  /** Grid kotak (maks 3 kolom per baris bila > 4 kotak). */
  grid(n: number, x: number, y: number, w: number, h: number, gap = 0.2, maxCols = w < 8 ? 2 : 4) {
    const cols = n <= maxCols ? n : Math.min(3, maxCols);
    const rows = Math.ceil(n / cols);
    const cw = (w - gap * (cols - 1)) / cols;
    const ch = (h - gap * (rows - 1)) / rows;
    return Array.from({ length: n }, (_, i) => ({ x: x + (i % cols) * (cw + gap), y: y + Math.floor(i / cols) * (ch + gap), w: cw, h: ch }));
  }

  /** Daftar poin dengan penanda aksen; tinggi baris menyesuaikan ruang. */
  pointList(items: string[], x: number, y: number, w: number, bottom: number, size = 12) {
    if (!items.length) return;
    const gap = 0.2;
    // Kecilkan huruf sampai semua poin muat; tiap poin setinggi isinya.
    let sz = size;
    const heights = () => items.map((b) => this.measure(b, "body", w - 0.28, { size: sz, lh: 1.35 }).h);
    while (sz > 9 && heights().reduce((a, b) => a + b + gap, -gap) > bottom - y) sz -= 0.5;
    const hs = heights();
    const each = Math.max(0.2, (bottom - y - gap * (items.length - 1)) / items.length);
    let cy = y;
    items.forEach((b, i) => {
      const h = Math.min(hs[i], each * 1.6, bottom - cy);
      if (h < 0.15) return;
      this.rect(x, cy + sz / 72 / 2 - 0.02, 0.09, 0.09, { fill: this.pal.accent, r: this.mood.radius ? 0.045 : undefined });
      this.text(b, "body", x + 0.28, cy, w - 0.28, { size: sz, min: 8.5, lh: 1.35, h, color: this.pal.text, o: 0.92 });
      cy += h + gap;
    });
  }
}

// ---------------------------------------------------------------------------
// Tata letak per jenis slide
// ---------------------------------------------------------------------------

const limitOf = (s: SlideInput) => H - (s.source ? 0.78 : 0.6);

function cover(c: Composer, input: PresentationInput) {
  const has = c.img("cover", 0, 0, W, H);
  if (has) {
    c.rect(0, 0, W, H, { fill: c.pal.bg, fo: c.pal.dark ? 0.18 : 0.1 });
    c.grad(0, 0, W * 0.72, H, "right", 0.95, 0);
    c.grad(0, H * 0.55, W, H * 0.45, "down", 0, 0.85);
    if (c.mood.decor === "speed" || c.mood.decor === "blocks") c.ambient(W - 3, H / 2, 3);
  } else c.ambient(W - 3, H / 2, 3);
  const x = c.ax + 0.3;
  const w = has ? 6.4 : Math.min(8.6, c.aw - 0.3);
  const upper = c.mood.upper || ["tech", "sport", "bold", "heritage"].includes(c.mood.id);
  const d = input.design;
  const blocks = [
    { str: input.title, role: "head" as const, o: { size: 56, min: 32, maxLines: 3, lh: 1.0, upper, ls: c.mood.headTracking }, gap: 0.2 },
    { str: d?.tagline, role: "strong" as const, o: { size: 17, min: 13, maxLines: 2, lh: 1.2, color: c.pal.accent2 }, gap: 0.16 },
    { str: input.subtitle, role: "body" as const, o: { size: 12, min: 10, maxLines: 3, lh: 1.45, color: c.pal.muted }, gap: 0 },
  ].filter((b) => b.str);
  const kh = d?.cover_kicker ? 0.42 : 0;
  const total = kh + blocks.reduce((sum, b) => sum + c.measure(b.str, b.role, w, b.o).h + b.gap, 0);
  let y = Math.max(0.8, (H - total) / 2 - 0.15);
  const start = y;
  if (kh) y += c.kicker(d?.cover_kicker, x, y, w, 10) + 0.2;
  for (const b of blocks) y += c.text(b.str, b.role, x, y, w, b.o) + b.gap;
  if (c.mood.kicker !== "pill") c.line(c.ax, start, c.ax, y, c.pal.accent, 2);
  if (d?.presenter) c.text(d.presenter, "strong", x, H - 0.85, w, { size: 8.5, ls: 2.4, upper: true, color: c.pal.muted, maxLines: 1 });
}

function section(c: Composer, s: SlideInput, i: number, no: number) {
  if (c.stage(String(i), 0.2)) c.grad(0, 0, W * 0.68, H, "right", 0.95, 0);
  else c.ambient(W - 2.6, H / 2, 2.8);
  const x = c.ax;
  const w = Math.min(7, c.aw);
  let y = 1.7;
  y += c.text(String(no).padStart(2, "0"), "head", x, y, 4, { size: 92, color: c.pal.accent, lh: 1, ls: c.mood.headTracking }) + 0.2;
  if (s.kicker) y += c.kicker(s.kicker, x, y, w, 10) + 0.12;
  y += c.text(s.title, "head", x, y, w, { size: 42, min: 28, maxLines: 3, lh: 1.05, upper: c.headUpper, ls: c.mood.headTracking }) + 0.16;
  c.text(s.subtitle, "body", x, y, Math.min(6.4, c.aw), { size: 14, min: 11, maxLines: 3, lh: 1.4, color: c.pal.muted });
}

function cards(c: Composer, s: SlideInput, i: number) {
  const list = s.cards ?? [];
  const key = String(i);
  const limit = limitOf(s);
  if (list.length === 2 && c.has(key)) {
    // "Duo split": dua subjek kiri-kanan, garis cahaya di tengah, dua kotak di bawah (seperti 'The Player Meets The Creator').
    c.stage(key, 0.26);
    c.grad(0, 0, W, 2.8, "down", 0.9, 0);
    c.grad(0, H * 0.42, W, H * 0.58, "down", 0, 0.92);
    c.grad(W / 2 - 0.7, 0, 0.7, H, "right", 0, 0.22, c.pal.accent);
    c.grad(W / 2, 0, 0.7, H, "right", 0.22, 0, c.pal.accent);
    c.rect(W / 2 - 0.01, 0, 0.02, H, { fill: c.pal.accent, fo: 0.95 });
    c.header(s, M, TOP, W - 2 * M, { size: 38, rule: false, sub: false });
    const py = 4.05;
    const natural = Math.max(...list.map((card) => c.panelHeight(W / 2 - M - 0.35, { heading: card.title, body: card.text })));
    const ph = Math.min(Math.max(1.5, natural + 0.2), limit - py - (s.takeaway ? 0.45 : 0));
    const pw = W / 2 - M - 0.35;
    list.forEach((card, k) => c.panelBody(k ? W / 2 + 0.35 : M, py, pw, ph, { heading: card.title, body: card.text }));
    if (s.takeaway) c.text(s.takeaway, "body", M, py + ph + 0.18, W - 2 * M, { size: 10.5, maxLines: 1, min: 9, color: c.pal.muted });
    return;
  }
  const photo = c.stage(key, 0.36);
  if (photo) {
    c.grad(0, 0, W, 3, "down", 0.9, 0);
    c.grad(0, H * 0.3, W, H * 0.7, "down", 0, 0.94);
  } else c.ambient();
  const hb = c.header(s, c.ax, TOP, photo ? W * 0.7 : c.aw, { rule: !photo && undefined });
  const stmt = s.takeaway ? c.measure(s.takeaway, "strong", c.aw - 0.6, { size: 14.5, maxLines: 2, lh: 1.25 }).h + 0.4 + 0.22 : 0;
  const rows = list.length > (c.aw < 8 ? 2 : 4) ? 2 : 1;
  const top = Math.max(hb + 0.3, photo ? (rows > 1 ? 2.9 : 3.65) : hb + 0.3);
  const boxes = c.grid(list.length, c.ax, top, c.aw, Math.min(rows > 1 ? 3.6 : 2.6, limit - stmt - top));
  boxes.forEach((b, k) => c.panelBody(b.x, b.y, b.w, b.h, { heading: list[k].title, body: list[k].text, index: photo ? undefined : String(k + 1).padStart(2, "0") }));
  if (s.takeaway) c.statement(s.takeaway, c.ax, limit, c.aw);
}

function stats(c: Composer, s: SlideInput, i: number) {
  const list = s.stats ?? [];
  const photo = c.img(String(i), 0, 0, W * 0.42, H);
  if (photo) {
    c.rect(0, 0, W * 0.42, H, { fill: c.pal.bg, fo: 0.12 });
    c.grad(W * 0.42 - 1.8, 0, 1.8, H, "right", 0, 1);
  } else c.ambient(W - 1.6, H - 1.2, 2.2);
  const x0 = photo ? W * 0.42 + 0.4 : c.ax;
  const w = photo ? W - x0 - M : c.aw;
  const limit = limitOf(s);
  const hb = c.header(s, x0, TOP + (photo ? 0.35 : 0), w);
  const stmt = s.takeaway ? c.measure(s.takeaway, "strong", w - 0.6, { size: 14.5, maxLines: 2, lh: 1.25 }).h + 0.62 : 0;
  const cols = w < 5 || (w < 8 && list.length >= 4) ? 2 : 4;
  const rows = Math.ceil(list.length / Math.min(cols, list.length));
  const boxH = (photo || w < 8 ? 1.6 : 2.3) * rows + 0.18 * (rows - 1);
  const y = hb + (photo ? 0.3 : 0.45);
  const boxes = c.grid(list.length, x0, y, w, boxH, 0.18, cols);
  boxes.forEach((b, k) => {
    const st = list[k];
    const p = c.panel(b.x, b.y, b.w, b.h);
    let cy = b.y + 0.2;
    const ix = b.x + Math.max(p.padX, 0.2);
    const iw = b.w - Math.max(p.padX, 0.2) * 2;
    cy += c.text(st.value, "head", ix, cy, iw, { size: photo || w < 8 ? 30 : 46, min: 13, maxLines: 1, color: c.pal.accent, lh: 1.05, ls: c.mood.headTracking }) + 0.08;
    cy += c.text(st.label, "strong", ix, cy, iw, { size: 10.5, min: 8.5, maxLines: 2, color: p.ink, lh: 1.25 }) + 0.04;
    if (st.note) c.text(st.note, "body", ix, cy, iw, { size: 8.5, min: 7.5, maxLines: 2, color: p.sub, lh: 1.3, h: Math.max(0.2, b.y + b.h - cy - 0.12) });
  });
  const listTop = y + boxH + 0.3;
  if (s.bullets?.length) c.pointList(s.bullets.slice(0, 3), x0, listTop, w, Math.min(limit - stmt, listTop + s.bullets.slice(0, 3).length * 0.5), 11.5);
  if (s.takeaway) c.statement(s.takeaway, x0, limit, w);
}

function timeline(c: Composer, s: SlideInput, i: number) {
  const steps = s.steps ?? [];
  const n = steps.length;
  const limit = limitOf(s);
  if (c.stage(String(i), 0.32)) {
    // Garis waktu di atas panggung foto (seperti 'The Battle Arena').
    c.grad(0, 0, W, 3.3, "down", 0.92, 0);
    c.grad(0, H * 0.48, W, H * 0.52, "down", 0, 0.94);
    c.header(s, M, TOP, W * 0.62, { rule: false });
    const lineY = 4.2;
    const span = W - 2 * M - 0.7;
    const colW = (W - 2 * M) / n;
    c.line(M, lineY, W - M, lineY, c.pal.accent, 1.25, 0.6);
    steps.forEach((st, k) => {
      const cx = M + 0.35 + (n > 1 ? (k * span) / (n - 1) : 0);
      c.ellipse(cx - 0.22, lineY - 0.22, 0.44, 0.44, { fill: c.pal.accent, fo: 0.25 });
      c.ellipse(cx - 0.09, lineY - 0.09, 0.18, 0.18, { fill: k === n - 1 ? c.pal.text : c.pal.accent2 });
      const lw = Math.min(colW, 2 * Math.min(cx - 0.3, W - 0.3 - cx));
      c.text(st.title, "strong", cx - lw / 2, lineY + 0.32, lw, { size: 11, min: 9, maxLines: 2, align: "center", lh: 1.2, color: k === n - 1 ? c.pal.accent2 : c.pal.text });
    });
    const sy = 5.2;
    const sh = Math.min(1.25, limit - sy - (s.takeaway ? 0.4 : 0));
    c.panel(M, sy, W - 2 * M, sh);
    steps.forEach((st, k) => c.text(st.text, "body", M + k * colW + 0.22, sy + 0.2, colW - 0.34, { size: 9.5, min: 8, lh: 1.35, h: sh - 0.32, color: c.pal.text, o: 0.86 }));
    if (s.takeaway) c.text(s.takeaway, "strong", M, sy + sh + 0.14, W - 2 * M, { size: 10.5, maxLines: 1, min: 9, color: c.pal.muted });
    return;
  }
  // Tanpa foto: tahapan berbingkai tersambung garis, tahap terakhir disorot.
  c.ambient(W - 1.4, H - 1, 2);
  const hb = c.header(s, M, TOP, W - 2 * M);
  const gap = 0.24;
  const colW = (W - 2 * M - gap * (n - 1)) / n;
  const by = hb + 0.45;
  const bh = 1.0;
  const stmt = s.takeaway ? c.measure(s.takeaway, "strong", W - 2 * M - 0.6, { size: 14.5, maxLines: 2, lh: 1.25 }).h + 0.62 : 0;
  steps.forEach((st, k) => {
    const x = M + k * (colW + gap);
    if (k < n - 1) c.line(x + colW, by + bh / 2, x + colW + gap, by + bh / 2, c.pal.accent, 1, 0.7);
    const p = c.panel(x, by, colW, bh, k === n - 1);
    const ix = x + Math.max(p.padX, 0.18);
    const iw = colW - Math.max(p.padX, 0.18) * 2;
    c.text(`${String(k + 1).padStart(2, "0")}`, "strong", ix, by + 0.16, iw, { size: 8.5, ls: 1.6, color: p.ink === c.pal.text ? c.pal.accent2 : p.ink, maxLines: 1 });
    c.text(st.title, "strong", ix, by + 0.4, iw, { size: 12, min: 9, maxLines: 2, lh: 1.15, color: p.ink, h: bh - 0.48 });
    c.text(st.text, "body", x, by + bh + 0.2, colW, { size: 10, min: 8.5, lh: 1.4, color: c.pal.muted, h: Math.max(0.4, limit - stmt - (by + bh + 0.2)) });
  });
  if (s.takeaway) c.statement(s.takeaway, M, limit, W - 2 * M);
}

function comparison(c: Composer, s: SlideInput, i: number) {
  const cols = (s.columns ?? []).slice(0, 2);
  if (c.stage(String(i), 0.74)) c.grad(0, 0, W, 2.6, "down", 0.6, 0);
  else c.ambient(W / 2, H + 0.4, 3.2);
  const limit = limitOf(s);
  const hb = c.header(s, M, TOP, W - 2 * M);
  const stmt = s.takeaway ? c.measure(s.takeaway, "strong", W - 2 * M - 0.6, { size: 14.5, maxLines: 2, lh: 1.25 }).h + 0.62 : 0;
  const y = hb + 0.3;
  const pw = (W - 2 * M - 0.3) / 2;
  const bodies = cols.map((col) => (col.bullets ?? []).join("\n"));
  const natural = Math.max(...cols.map((col, k) => c.panelHeight(pw, { heading: col.heading, body: bodies[k] })));
  const h = Math.min(limit - stmt - y, Math.max(2.2, natural * 1.25 + 0.3));
  cols.forEach((col, k) => c.panelBody(M + k * (pw + 0.3), y, pw, h, { heading: col.heading, body: bodies[k], hl: k === 1, lh: 1.75 }));
  if (s.takeaway) c.statement(s.takeaway, M, limit, W - 2 * M);
}

const TERM = /^(.{2,34}?)\s*(?::|—|–| - )\s+(.{3,})$/;

function list(c: Composer, s: SlideInput, i: number, agenda: boolean) {
  const items = (s.bullets ?? []).slice(0, 6);
  const photo = c.img(String(i), W * 0.62, 0, W * 0.38, H);
  if (photo) {
    c.rect(W * 0.62, 0, W * 0.38, H, { fill: c.pal.bg, fo: 0.12 });
    c.grad(W * 0.62, 0, 1.8, H, "right", 1, 0);
  } else c.ambient(W - 2.7, H * 0.48, 2.1);
  const X = c.ax;
  const w = photo ? W * 0.62 - M - 0.35 : c.aw < W - 2 * M ? c.aw : W * 0.62 - M - 0.35;
  const limit = limitOf(s);
  const hb = c.header(s, X, TOP, w);
  const stmt = s.takeaway ? c.measure(s.takeaway, "strong", W - 2 * M - 0.6, { size: 14.5, maxLines: 2, lh: 1.25 }).h + 0.62 : 0;
  const top = hb + 0.3;
  const rowH = Math.min(0.95, (limit - stmt - top) / Math.max(1, items.length));
  const termW = w < 7 ? 2.4 : 3.0;
  items.forEach((b, k) => {
    const y = top + k * rowH;
    c.rect(X, y + 0.06, 0.05, rowH - 0.26, { fill: c.pal.accent });
    if (agenda) {
      c.text(String(k + 1).padStart(2, "0"), "head", X + 0.28, y, 0.9, { size: 20, color: c.pal.accent, maxLines: 1, lh: 1.1 });
      c.text(b, "head", X + 1.1, y + 0.02, w - 1.1, { size: 17, min: 12, maxLines: 2, lh: 1.15, h: rowH - 0.18, upper: c.headUpper });
      return;
    }
    const m = TERM.exec(b);
    if (m) {
      c.text(m[1], "head", X + 0.28, y, termW - 0.3, { size: 17, min: 12, maxLines: 2, lh: 1.1, upper: c.mood.upper || c.mood.panel === "outline", ls: c.mood.headTracking });
      c.text(m[2], "body", X + termW + 0.2, y + 0.02, w - termW - 0.2, { size: 10.5, min: 8.5, lh: 1.4, color: c.pal.muted, h: rowH - 0.2 });
    } else c.text(b, "body", X + 0.28, y + 0.02, w - 0.28, { size: 13, min: 9.5, lh: 1.35, h: rowH - 0.2, o: 0.95 });
  });
  if (s.takeaway) c.statement(s.takeaway, X, limit, photo || c.aw < W - 2 * M ? w : W - 2 * M);
}

function chart(c: Composer, s: SlideInput) {
  const ch = s.chart;
  c.ambient(1.2, H - 0.8, 1.8);
  const limit = limitOf(s);
  const lw = 4.3;
  const hb = c.header(s, M, TOP, lw, { size: 28, maxLines: 3 });
  const stmt = s.takeaway ? c.measure(s.takeaway, "strong", W - 2 * M - 0.6, { size: 14.5, maxLines: 2, lh: 1.25 }).h + 0.62 : 0;
  c.pointList((s.bullets ?? []).slice(0, 4), M, hb + 0.25, lw, limit - stmt - 0.1, 11);
  const px = M + lw + 0.45;
  const pw = W - M - px;
  const py = TOP + 0.05;
  const ph = limit - stmt - py;
  c.panel(px, py, pw, ph);
  if (!ch) return s.takeaway && c.statement(s.takeaway, M, limit, W - 2 * M);
  const labels = ch.labels;
  const series = ch.series.slice(0, 3);
  const colors = [c.pal.accent, c.pal.accent2, c.pal.muted];
  const unit = ch.unit ? ` ${ch.unit}`.replace(" %", "%") : "";
  const fmt = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}${unit}`;
  const ix = px + 0.4;
  const iw = pw - 0.8;
  let iy = py + 0.35;
  if (series.length > 1) {
    series.forEach((sr, k) => {
      const lx = ix + k * 1.9;
      c.rect(lx, iy + 0.04, 0.14, 0.14, { fill: colors[k] });
      c.text(sr.name, "body", lx + 0.22, iy, 1.6, { size: 9, maxLines: 1, color: c.pal.muted });
    });
    iy += 0.4;
  }
  const ib = py + ph - 0.62;
  if (ch.type === "pie" || ch.type === "doughnut") {
    const vals = series[0]?.values ?? [];
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const rowH = Math.min(0.62, (ib + 0.3 - iy) / Math.max(1, labels.length));
    labels.forEach((l, k) => {
      const y = iy + k * rowH;
      const pct = (vals[k] ?? 0) / total;
      c.text(l, "body", ix, y, iw * 0.7, { size: 10.5, maxLines: 1, min: 8.5 });
      c.text(`${Math.round(pct * 100)}%`, "strong", ix + iw * 0.7, y, iw * 0.3, { size: 10.5, maxLines: 1, align: "right" });
      c.rect(ix, y + 0.26, iw, 0.12, { fill: c.pal.text, fo: 0.1 });
      c.rect(ix, y + 0.26, Math.max(0.02, iw * pct), 0.12, { fill: k % 2 ? c.pal.accent2 : c.pal.accent });
    });
  } else {
    const max = Math.max(1e-9, ...series.flatMap((sr) => sr.values));
    const gw = iw / labels.length;
    const area = ib - iy - 0.3;
    c.line(ix, ib, ix + iw, ib, c.pal.text, 0.6, 0.3);
    if (ch.type === "line") {
      series.forEach((sr, k) => {
        const pts = labels.map((_, j) => ({ x: ix + gw * (j + 0.5), y: ib - ((sr.values[j] ?? 0) / max) * area }));
        pts.slice(1).forEach((p, j) => c.line(pts[j].x, pts[j].y, p.x, p.y, colors[k], 2));
        pts.forEach((p, j) => {
          c.ellipse(p.x - 0.07, p.y - 0.07, 0.14, 0.14, { fill: colors[k] });
          if (k === 0) c.text(fmt(sr.values[j] ?? 0), "strong", p.x - gw / 2, p.y - 0.34, gw, { size: 9, maxLines: 1, align: "center", min: 7 });
        });
      });
    } else {
      const bw = Math.min(0.7, (gw * 0.7) / series.length);
      labels.forEach((_, j) => {
        series.forEach((sr, k) => {
          const v = sr.values[j] ?? 0;
          const bh = Math.max(0.02, (v / max) * area);
          const bx = ix + gw * j + (gw - bw * series.length) / 2 + k * bw;
          c.rect(bx + 0.02, ib - bh, bw - 0.04, bh, { fill: colors[k], r: c.mood.radius ? 0.04 : undefined });
          if (series.length === 1) c.text(fmt(v), "strong", bx - 0.3, ib - bh - 0.28, bw + 0.6, { size: 9, maxLines: 1, align: "center", min: 7 });
        });
      });
    }
    labels.forEach((l, j) => c.text(l, "body", ix + gw * j, ib + 0.1, gw, { size: 9, min: 7, maxLines: 2, align: "center", color: c.pal.muted, lh: 1.15 }));
  }
  if (s.takeaway) c.statement(s.takeaway, M, limit, W - 2 * M);
}

function table(c: Composer, s: SlideInput) {
  const t = s.table;
  c.ambient(W - 1.2, H - 0.6, 1.6);
  const limit = limitOf(s);
  const hb = c.header(s, M, TOP, W - 2 * M);
  if (!t) return;
  const stmt = s.takeaway ? c.measure(s.takeaway, "strong", W - 2 * M - 0.6, { size: 14.5, maxLines: 2, lh: 1.25 }).h + 0.62 : 0;
  const ncol = t.headers.length;
  const weight = t.headers.map((h, k) => Math.max(6, Math.min(40, Math.max(h.length, ...t.rows.map((r) => (r[k] ?? "").length)))));
  const sum = weight.reduce((a, b) => a + b, 0);
  const tw = W - 2 * M;
  const widths = weight.map((v) => (v / sum) * tw);
  const top = hb + 0.3;
  const rowH = Math.max(0.36, Math.min(0.62, (limit - stmt - top) / (t.rows.length + 1)));
  let x = M;
  c.rect(M, top, tw, rowH, { fill: c.pal.accent, r: c.mood.radius ? 0.06 : undefined });
  t.headers.forEach((h, k) => {
    c.text(h, "strong", x + 0.16, top, widths[k] - 0.24, { size: 10.5, min: 8, maxLines: 2, color: c.pal.onAccent, h: rowH, valign: "middle", upper: c.mood.panel === "outline", ls: c.mood.panel === "outline" ? 1 : 0 });
    x += widths[k];
  });
  t.rows.forEach((r, j) => {
    const y = top + rowH * (j + 1);
    if (j % 2 === 0) c.rect(M, y, tw, rowH, { fill: c.pal.surface, fo: c.pal.dark ? 0.6 : 0.85 });
    c.line(M, y + rowH, M + tw, y + rowH, c.pal.text, 0.5, 0.1);
    let cx = M;
    for (let k = 0; k < ncol; k++) {
      c.text(r[k] ?? "", k === 0 ? "strong" : "body", cx + 0.16, y, widths[k] - 0.24, { size: 10, min: 8, maxLines: 2, h: rowH, valign: "middle", lh: 1.2 });
      cx += widths[k];
    }
  });
  if (s.takeaway) c.statement(s.takeaway, M, limit, W - 2 * M);
}

function quote(c: Composer, s: SlideInput, i: number) {
  if (c.stage(String(i), 0.4)) c.grad(0, 0, W * 0.8, H, "right", 0.92, 0);
  else c.ambient(W - 2.2, H / 2, 2.6);
  let y = 1.25;
  y += c.text("“", "head", c.ax, y, 2, { size: 110, color: c.pal.accent, lh: 0.9, o: 0.9 }) - 0.3;
  y += c.text(s.quote ?? s.title, "head", c.ax, y, Math.min(8.6, c.aw), { size: 30, min: 18, maxLines: 6, lh: 1.22, upper: false }) + 0.3;
  if (s.attribution) c.text(`— ${s.attribution}`, "strong", c.ax, y, Math.min(8, c.aw), { size: 10.5, ls: 2, upper: true, color: c.pal.accent2, maxLines: 1 });
}

function closing(c: Composer, s: SlideInput, i: number, presenter?: string) {
  const photo = c.stage(String(i), 0.22);
  if (photo) {
    c.grad(0, H * 0.25, W, H * 0.75, "down", 0, 0.95);
    c.grad(0, 0, W, 1.6, "down", 0.6, 0);
  } else c.ambient(W - 2.6, H * 0.45, 2.8);
  const X = c.ax;
  const w = c.aw;
  const chips = (s.bullets ?? []).slice(0, 5);
  const titleO: TextOpts = { size: 40, min: 26, maxLines: 2, lh: 1.08, upper: c.headUpper, ls: c.mood.headTracking };
  const subO: TextOpts = { size: 14, min: 11, maxLines: 2, lh: 1.4, color: c.pal.muted };
  const th = c.measure(s.title, "head", w * (w < 8 ? 1 : 0.8), titleO).h;
  const sh = s.subtitle ? c.measure(s.subtitle, "body", w * (w < 8 ? 1 : 0.75), subO).h + 0.12 : 0;
  const chipH = chips.length ? 0.95 + (w < 8 && chips.length > 2 ? 0.85 * Math.ceil(chips.length / 2 - 1) : 0) : 0;
  const kh = s.kicker ? 0.32 : 0;
  let y = (photo ? H - 0.95 - (presenter ? 0.25 : 0) : (H + kh + th + sh + chipH) / 2) - (kh + th + 0.18 + sh + chipH);
  if (s.kicker) y += c.kicker(s.kicker, X, y, w, 10) + 0.14;
  y += c.text(s.title, "head", X, y, w * (w < 8 ? 1 : 0.8), titleO) + 0.18;
  if (s.subtitle) y += c.text(s.subtitle, "body", X, y, w * (w < 8 ? 1 : 0.75), subO) + 0.12;
  if (chips.length) {
    const gap = 0.16;
    const perRow = w < 8 ? 2 : chips.length;
    const cw = Math.min(3.2, (w - gap * (perRow - 1)) / perRow);
    chips.forEach((b, k) => c.panelBody(X + (k % perRow) * (cw + gap), y + 0.1 + Math.floor(k / perRow) * 0.85, cw, 0.72, { body: b }));
  }
  if (presenter) c.text(presenter, "strong", X, H - 0.55, w, { size: 8.5, ls: 2.4, upper: true, color: c.pal.muted, maxLines: 1 });
}

function imageText(c: Composer, s: SlideInput, i: number) {
  const photo = c.img(String(i), 0, 0, W * 0.45, H);
  if (photo) {
    c.rect(0, 0, W * 0.45, H, { fill: c.pal.bg, fo: 0.1 });
    c.grad(W * 0.45 - 1.6, 0, 1.6, H, "right", 0, 1);
  }
  const x0 = photo ? W * 0.45 + 0.45 : c.ax;
  const w = photo ? W - x0 - M : c.aw;
  const limit = limitOf(s);
  const hb = c.header(s, x0, TOP + 0.3, w);
  const stmt = s.takeaway ? c.measure(s.takeaway, "strong", w - 0.6, { size: 14.5, maxLines: 2, lh: 1.25 }).h + 0.62 : 0;
  c.pointList((s.bullets ?? []).slice(0, 5), x0, hb + 0.25, w, limit - stmt - 0.1, 12.5);
  if (s.takeaway) c.statement(s.takeaway, x0, limit, w);
}

function product(c: Composer, s: SlideInput, i: number) {
  c.ambient(3.2, H / 2, 2.6);
  const fw = 5.0;
  c.panel(M, TOP, fw, H - TOP - 0.62);
  c.img(String(i), M + 0.25, TOP + 0.25, fw - 0.5, H - TOP - 1.12, "contain");
  const x0 = M + fw + 0.45;
  const w = W - x0 - M;
  const limit = limitOf(s);
  const hb = c.header(s, x0, TOP, w);
  const list = (s.cards ?? []).slice(0, 4);
  const boxes = c.grid(list.length, x0, hb + 0.25, w, limit - hb - 0.25 - (s.takeaway ? 0.5 : 0), 0.18).map((b, k, arr) =>
    arr.length === 4 ? { ...b, w: (w - 0.18) / 2, x: x0 + (k % 2) * ((w - 0.18) / 2 + 0.18), y: hb + 0.25 + Math.floor(k / 2) * ((limit - hb - 0.25 - (s.takeaway ? 0.5 : 0) - 0.18) / 2 + 0.18), h: (limit - hb - 0.25 - (s.takeaway ? 0.5 : 0) - 0.18) / 2 } : b,
  );
  boxes.forEach((b, k) => c.panelBody(b.x, b.y, b.w, b.h, { heading: list[k].title, body: list[k].text }));
  if (s.takeaway) c.text(s.takeaway, "strong", x0, limit - 0.35, w, { size: 11, maxLines: 1, min: 9, color: c.pal.accent2 });
}

function gallery(c: Composer, s: SlideInput, i: number) {
  c.ambient(W / 2, H + 0.6, 3);
  const items = (s.gallery ?? []).slice(0, 3);
  const limit = limitOf(s);
  const hb = c.header(s, M, TOP, W - 2 * M);
  const gap = 0.3;
  const fw = (W - 2 * M - gap * (items.length - 1)) / items.length;
  const fh = limit - hb - 0.3 - 0.55;
  items.forEach((g, k) => {
    const x = M + k * (fw + gap);
    c.rect(x, hb + 0.3, fw, fh, { fill: c.pal.surface, line: c.pal.accent, lo: 0.4, lw: 0.75, r: c.mood.radius || undefined });
    c.img(`${i}-g${k}`, x + 0.07, hb + 0.37, fw - 0.14, fh - 0.14);
    c.text(g.caption, "body", x, hb + 0.3 + fh + 0.12, fw, { size: 10, min: 8.5, maxLines: 2, color: c.pal.muted, lh: 1.3 });
  });
}

/** Layout yang bisa memakai foto samping (bingkai / separuh slide). */
const SPLIT_LAYOUTS = new Set<SlideInput["layout"]>(["section", "cards", "stats", "agenda", "bullets", "quote", "closing", "image_text"]);

export interface SceneOptions {
  /** Ukuran asli foto yang tersedia (key "cover", indeks slide, "i-gk"). */
  images: Dims;
}

/** Susun seluruh deck Signature menjadi Scene. */
export function buildScene(input: PresentationInput, opts: SceneOptions): Scene {
  const pal = resolvePalette(input);
  const mood = moodOf(input);
  const fontsMeta: Record<FontRole, SceneFont> = { head: mood.head, body: mood.body, strong: mood.strong };
  const fk = {
    head: loadDeckFont(mood.head.file).fk,
    body: loadDeckFont(mood.body.file).fk,
    strong: loadDeckFont(mood.strong.file).fk,
  };
  const slides: SceneSlide[] = [];
  const make = (fn: (c: Composer) => void, s?: SlideInput, key?: string) => {
    const c = new Composer(pal, mood, fk, opts.images, slides.length);
    // Mood berbingkai/separuh: foto jadi panel samping (kiri-kanan bergantian), isi menyesuaikan area sisanya.
    if (key && mood.treatment !== "stage" && (!s || SPLIT_LAYOUTS.has(s.layout))) {
      if (["confetti", "rules", "ornament"].includes(mood.decor)) c.ambient();
      if (c.photoPanel(key, key === "cover" || slides.length % 2 ? "right" : "left")) c.hidden.add("__decor");
    }
    fn(c);
    if (s?.source) c.footnote(`Sumber: ${s.source}`);
    slides.push({ bg: pal.bg, items: c.items, notes: s?.notes });
  };
  make((c) => cover(c, input), undefined, "cover");
  let sectionNo = 0;
  input.slides.forEach((s, i) => {
    make((c) => {
      switch (s.layout) {
        case "section":
          return section(c, s, i, ++sectionNo);
        case "cards":
          return s.cards?.length ? cards(c, s, i) : list(c, s, i, false);
        case "stats":
          return s.stats?.length ? stats(c, s, i) : list(c, s, i, false);
        case "timeline":
          return s.steps?.length ? timeline(c, s, i) : list(c, s, i, false);
        case "comparison":
          return s.columns?.length ? comparison(c, s, i) : list(c, s, i, false);
        case "chart":
          return chart(c, s);
        case "table":
          return table(c, s);
        case "quote":
          return quote(c, s, i);
        case "closing":
          return closing(c, s, i, input.design?.presenter);
        case "image_text":
          return imageText(c, s, i);
        case "product":
          return s.cards?.length ? product(c, s, i) : imageText(c, s, i);
        case "gallery":
          return gallery(c, s, i);
        case "agenda":
          return list(c, s, i, true);
        default:
          return list(c, s, i, false);
      }
    }, s, String(i));
  });
  return { v: 1, w: W, h: H, mood: mood.id, fonts: fontsMeta, slides };
}
