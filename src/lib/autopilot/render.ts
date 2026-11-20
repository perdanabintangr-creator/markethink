import "server-only";
import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import sharp from "sharp";
import { isHero, slideCorners, slideTheme, type Look, type Slide, type SlideBrand } from "./slides";

/**
 * Renderer slide Autopilot Konten (1080×1350 JPEG). Empat gaya:
 * - classic: desain konten @marqthink.ai (skill marqthink-ig, render.py) — navy bercahaya, judul Montserrat ExtraBold.
 * - glossy: latar terang lavender, bola glossy & garis orbit, teks kecil di 4 sudut, judul raksasa (gradasi + serif
 *   miring), visual 3D AI di bawah (referensi founder 20 Nov: "5 Free VS Code", "7 GitHub Repos", "What if ChatGPT").
 * - bold: hitam dengan cahaya warna brand, judul condensed raksasa, objek 3D di tengah ("Design Trends", "20 AI UGC Ads").
 * - photo: foto penuh, judul putih besar + label sorot ("Brand with Claude", kampanye BSN).
 * Huruf digambar sebagai path dari file font asli (hasil sama di semua perangkat). Warna, logo & akun dari Brand Kit.
 */

export const W = 1080;
export const H = 1350;
const PAD_X = 96;
const PAD_TOP = 96;
const PAD_BOTTOM = 88;
const INNER = W - PAD_X * 2;

interface Fk {
  unitsPerEm: number;
  ascent: number;
  descent: number;
  layout(text: string): {
    glyphs: { path: { toSVG(): string } }[];
    positions: { xAdvance: number; xOffset: number; yOffset: number }[];
    advanceWidth: number;
  };
  hasGlyphForCodePoint(cp: number): boolean;
  getVariation?(v: Record<string, number>): Fk;
}

const DIR = path.join(process.cwd(), "public", "fonts", "autopilot");
const cache = new Map<string, Fk>();

type FontKey = "display" | "regular" | "medium" | "semibold" | "bold" | "heavy" | "condensed" | "serif";
const FILES: Record<FontKey, string> = {
  display: "Montserrat.ttf",
  regular: "Inter-Regular.otf",
  medium: "Inter-Medium.otf",
  semibold: "Inter-SemiBold.otf",
  bold: "Inter-Bold.otf",
  heavy: "plus-jakarta-sans-800.woff",
  condensed: "anton-400.woff",
  serif: "playfair-display-700.woff",
};

function font(key: FontKey): Fk {
  let f = cache.get(key);
  if (!f) {
    const base = fontkit.create(new Uint8Array(fs.readFileSync(path.join(DIR, FILES[key])))) as unknown as Fk;
    // Montserrat variabel → ExtraBold (800), sama dengan judul di desain referensi.
    f = key === "display" && base.getVariation ? base.getVariation({ wght: 800 }) : base;
    cache.set(key, f);
  }
  return f;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Buang karakter yang tidak ada di font (emoji dll.) agar tidak muncul kotak kosong. */
function clean(fk: Fk, s: string) {
  return [...s.replace(/[​-‍﻿]/g, "")]
    .map((ch) => {
      const cp = ch.codePointAt(0)!;
      if (cp < 32) return "";
      return fk.hasGlyphForCodePoint(cp) ? ch : cp > 0xffff ? "" : " ";
    })
    .join("")
    .replace(/ {2,}/g, " ");
}

const widthOf = (fk: Fk, s: string, size: number, ls = 0) => (fk.layout(s).advanceWidth / fk.unitsPerEm) * size + ls * Math.max(0, [...s].length - 1);

/** Pecah teks per kata agar muat lebar maksimal (menghormati baris baru). */
export function wrap(fk: Fk, raw: string, size: number, maxW: number, ls = 0): string[] {
  const out: string[] = [];
  for (const para of raw.replace(/\\n/g, "\n").split("\n")) {
    const words = clean(fk, para).trim().split(/\s+/).filter(Boolean);
    let ln = "";
    for (const w of words) {
      const next = ln ? `${ln} ${w}` : w;
      if (!ln || widthOf(fk, next, size, ls) <= maxW) ln = next;
      else {
        out.push(ln);
        ln = w;
      }
    }
    if (ln) out.push(ln);
  }
  return out;
}

function baseline(fk: Fk, size: number, lh: number) {
  const a = fk.ascent / fk.unitsPerEm;
  const d = Math.abs(fk.descent) / fk.unitsPerEm;
  return ((lh - (a + d)) * size) / 2 + a * size;
}

/** Glyph path pada garis dasar `base`. `skew` > 0 = miring (italic palsu). */
function glyphs(fk: Fk, s: string, x: number, base: number, size: number, fill: string, ls = 0, skew = 0) {
  const run = fk.layout(s);
  const k = size / fk.unitsPerEm;
  let pen = 0;
  const parts: string[] = [];
  run.glyphs.forEach((g, i) => {
    const p = run.positions[i];
    const d = g.path.toSVG();
    if (d) parts.push(`<path transform="translate(${r2(x + pen + p.xOffset * k)} ${r2(base - p.yOffset * k)}) scale(${r2(k * 1000) / 1000} ${-r2(k * 1000) / 1000})" d="${d}"/>`);
    pen += p.xAdvance * k + ls;
  });
  const sk = skew ? ` transform="matrix(1 0 ${-skew} 1 ${r2(skew * base)} 0)"` : "";
  return `<g fill="${fill}"${sk}>${parts.join("")}</g>`;
}

/** Satu baris teks → path SVG (fill = warna atau url(#gradasi)). */
function line(fk: Fk, s: string, x: number, top: number, size: number, lh: number, fill: string, ls = 0) {
  return glyphs(fk, s, x, top + baseline(fk, size, lh), size, fill, ls);
}

function outlineLine(fk: Fk, s: string, x: number, top: number, size: number, stroke: string) {
  return line(fk, s, x, top, size, 1, "none").replace('<g fill="none">', `<g fill="none" stroke="${stroke}" stroke-width="${r2(3 * (fk.unitsPerEm / size))}">`);
}

// ---------------------------------------------------------------------------
// Teks kaya: kata di dalam *bintang* digambar serif miring (Playfair), sisanya font judul.
// ---------------------------------------------------------------------------
interface Word {
  t: string;
  serif: boolean;
}
const SERIF_SCALE = 1.06;
const SKEW = 0.2;

function richWords(raw: string, upper: boolean): Word[][] {
  return raw
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((para) => {
      const out: Word[] = [];
      para.split(/(\*[^*]+\*)/g).forEach((seg) => {
        const serif = /^\*[^*]+\*$/.test(seg);
        const txt = serif ? seg.slice(1, -1) : seg;
        for (const w of txt.split(/\s+/).filter(Boolean)) out.push({ t: upper && !serif ? w.toUpperCase() : w, serif });
      });
      return out;
    });
}

function wordW(main: Fk, w: Word, size: number, ls: number) {
  return w.serif ? widthOf(font("serif"), clean(font("serif"), w.t), size * SERIF_SCALE) : widthOf(main, clean(main, w.t), size, ls);
}
const spaceW = (main: Fk, size: number) => widthOf(main, " ", size) * 0.9;

function richWrap(main: Fk, raw: string, size: number, maxW: number, ls: number, upper: boolean): Word[][] {
  const out: Word[][] = [];
  for (const para of richWords(raw, upper)) {
    let cur: Word[] = [];
    let cw = 0;
    for (const w of para) {
      const ww = wordW(main, w, size, ls);
      const next = cur.length ? cw + spaceW(main, size) + ww : ww;
      if (!cur.length || next <= maxW) {
        cur.push(w);
        cw = next;
      } else {
        out.push(cur);
        cur = [w];
        cw = ww;
      }
    }
    if (cur.length) out.push(cur);
  }
  return out;
}

const richW = (main: Fk, ln: Word[], size: number, ls: number) => ln.reduce((a, w, k) => a + wordW(main, w, size, ls) + (k ? spaceW(main, size) : 0), 0);

function richDraw(main: Fk, ln: Word[], x: number, top: number, size: number, lh: number, fill: string, serifFill: string, ls: number) {
  const base = top + baseline(main, size, lh);
  let pen = x;
  return ln
    .map((w, k) => {
      if (k) pen += spaceW(main, size);
      const F = w.serif ? font("serif") : main;
      const sz = w.serif ? size * SERIF_SCALE : size;
      const t = clean(F, w.t);
      const out = glyphs(F, t, pen, base, sz, w.serif ? serifFill : fill, w.serif ? 0 : ls, w.serif ? SKEW : 0);
      pen += w.serif ? widthOf(F, t, sz) : widthOf(F, t, sz, ls);
      return out;
    })
    .join("");
}

/** Cari ukuran huruf terbesar agar teks muat (≤ maxLines baris, tiap baris ≤ maxW). */
function fitRich(main: Fk, texts: string[], maxW: number, maxLines: number, start: number, min: number, ls: (s: number) => number, upper: boolean) {
  for (let size = start; size >= min; size -= 4) {
    const lines = texts.flatMap((t) => (t ? richWrap(main, t, size, maxW, ls(size), upper) : []));
    if (lines.length <= maxLines && lines.every((l) => richW(main, l, size, ls(size)) <= maxW + 0.5)) return size;
  }
  return min;
}

/** Blok yang tingginya diketahui dan digambar pada posisi y. */
interface Block {
  h: number;
  mt: number;
  draw(y: number): string;
}

export interface RenderOptions {
  brand: SlideBrand;
  /** Logo brand (PNG/JPEG) — tanpa logo: nama brand sebagai wordmark. */
  logo?: { bytes: Buffer; mime: string } | null;
  /** Pakai logo Marqthink bawaan (akun @marqthink.ai). */
  marqthinkLogo?: boolean;
  en?: boolean;
  look?: Look;
  /** Gambar visual (path storage → isi file) untuk slide yang punya `image`. */
  images?: Record<string, Buffer>;
}

type Prepared = RenderOptions & {
  logoData?: { uri: string; w: number; h: number } | null;
  hero?: string | null;
  corners?: string[];
};

let defaultLogos: { dark: string; light: string } | null = null;
function marqLogos() {
  if (!defaultLogos) {
    const b64 = (f: string) => fs.readFileSync(path.join(process.cwd(), "public", "brand", f)).toString("base64");
    defaultLogos = { dark: b64("autopilot-logo-dark.png"), light: b64("autopilot-logo-light.png") };
  }
  return defaultLogos;
}

function mix(a: string, b: string, t: number) {
  const pa = a.replace("#", "").match(/../g)!.map((x) => parseInt(x, 16));
  const pb = b.replace("#", "").match(/../g)!.map((x) => parseInt(x, 16));
  return `#${pa.map((v, k) => Math.round(v + (pb[k] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** Gaya per tampilan. */
function paint(look: Look, dark: boolean) {
  const studio = look !== "classic";
  return {
    studio,
    ink: dark ? "#FFFFFF" : look === "classic" ? "#0A0F24" : "#0B1026",
    muted: dark ? (look === "bold" ? "#A6ADBF" : "#B4BCD3") : look === "classic" ? "#5B6478" : "#4A5168",
    corner: dark ? (look === "bold" ? "#6F7686" : "#7C86A6") : "#8A93A8",
    titleFont: (look === "bold" ? "condensed" : look === "classic" ? "display" : "heavy") as FontKey,
    upper: look === "bold",
  };
}

// ---------------------------------------------------------------------------
// Latar & dekorasi
// ---------------------------------------------------------------------------
function sphere(id: string, cx: number, cy: number, r: number, c1: string, c2: string) {
  return (
    `<radialGradient id="${id}" cx="${cx - r * 0.35}" cy="${cy - r * 0.4}" r="${r * 1.45}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".22" stop-color="${mix(c1, "#FFFFFF", 0.35)}"/><stop offset=".62" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>` +
    `|<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>`
  );
}

function glossyBg(id: string, b: SlideBrand, cover: boolean, defs: string[]) {
  const tint = mix(b.royal, "#FFFFFF", 0.9);
  const tint2 = mix(b.cyan, "#FFFFFF", 0.85);
  defs.push(
    `<linearGradient id="${id}gbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="${mix(tint, "#FFFFFF", 0.4)}"/><stop offset="1" stop-color="${tint}"/></linearGradient>`,
    `<radialGradient id="${id}gb1" cx="${W + 80}" cy="120" r="620" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${mix(b.royal, "#FFFFFF", 0.55)}" stop-opacity=".55"/><stop offset="1" stop-color="${tint}" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="${id}gb2" cx="-60" cy="${H - 160}" r="640" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${tint2}" stop-opacity=".9"/><stop offset="1" stop-color="${tint2}" stop-opacity="0"/></radialGradient>`,
  );
  let bg = `<rect width="${W}" height="${H}" fill="url(#${id}gbg)"/><rect width="${W}" height="${H}" fill="url(#${id}gb1)"/><rect width="${W}" height="${H}" fill="url(#${id}gb2)"/>`;
  // Garis orbit tipis
  bg += `<g fill="none" stroke="${mix(b.royal, "#FFFFFF", 0.7)}" stroke-opacity=".55" stroke-width="2">`;
  bg += cover
    ? `<ellipse cx="${W / 2}" cy="${H * 0.68}" rx="640" ry="190" transform="rotate(-14 ${W / 2} ${H * 0.68})"/><path d="M-40 ${H * 0.36} C 300 ${H * 0.2}, 760 ${H * 0.18}, ${W + 60} ${H * 0.05}"/>`
    : `<path d="M-40 ${H - 260} C 320 ${H - 420}, 760 ${H - 150}, ${W + 60} ${H - 330}"/>`;
  bg += `</g>`;
  // Bola glossy kecil
  const spots = cover
    ? [
        [W - 70, 640, 22, b.blue, b.royal],
        [118, 760, 18, b.cyan, b.blue],
        [W - 210, H - 300, 14, b.royal, mix(b.royal, "#000000", 0.3)],
        [300, 250, 10, b.cyan, b.royal],
      ]
    : [
        [W - 64, H - 400, 18, b.blue, b.royal],
        [52, H - 250, 12, b.cyan, b.blue],
      ];
  spots.forEach(([cx, cy, r, c1, c2], k) => {
    const [d, el] = sphere(`${id}sp${k}`, cx as number, cy as number, r as number, c1 as string, c2 as string).split("|");
    defs.push(d);
    bg += el;
  });
  return bg;
}

function boldBg(id: string, b: SlideBrand, cover: boolean, defs: string[]) {
  defs.push(
    `<radialGradient id="${id}bb1" cx="${W / 2}" cy="${cover ? 520 : 0}" r="${cover ? 620 : 700}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${b.royal}" stop-opacity="${cover ? 0.55 : 0.35}"/><stop offset=".55" stop-color="${b.royal}" stop-opacity=".12"/><stop offset="1" stop-color="#06070B" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="${id}bb2" cx="${W}" cy="${H}" r="560" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${b.cyan}" stop-opacity=".18"/><stop offset="1" stop-color="${b.cyan}" stop-opacity="0"/></radialGradient>`,
  );
  return `<rect width="${W}" height="${H}" fill="#06070B"/><rect width="${W}" height="${H}" fill="url(#${id}bb1)"/><rect width="${W}" height="${H}" fill="url(#${id}bb2)"/>`;
}

/** Visual cadangan (tanpa gambar AI): bola glossy besar dengan cincin orbit warna brand. */
function fallbackHero(id: string, b: SlideBrand, cx: number, cy: number, size: number, dark: boolean, defs: string[]) {
  const R = size * 0.3;
  defs.push(
    `<radialGradient id="${id}fh" cx="${cx - R * 0.4}" cy="${cy - R * 0.45}" r="${R * 1.6}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".18" stop-color="${mix(b.cyan, "#FFFFFF", 0.4)}"/><stop offset=".55" stop-color="${b.blue}"/><stop offset="1" stop-color="${mix(b.royal, "#000000", dark ? 0.45 : 0.2)}"/></radialGradient>`,
    `<linearGradient id="${id}fr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${b.cyan}" stop-opacity=".2"/><stop offset=".5" stop-color="${dark ? "#FFFFFF" : b.royal}" stop-opacity=".85"/><stop offset="1" stop-color="${b.cyan}" stop-opacity=".2"/></linearGradient>`,
    `<radialGradient id="${id}fs" cx="${cx}" cy="${cy + R * 1.18}" r="${R * 1.1}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${dark ? "#000000" : mix(b.royal, "#0A0F24", 0.5)}" stop-opacity="${dark ? 0.6 : 0.22}"/><stop offset="1" stop-color="#000000" stop-opacity="0"/></radialGradient>`,
  );
  const ring = (front: boolean) =>
    `<path d="M${cx - R * 1.55} ${cy} A ${R * 1.55} ${R * 0.42} 0 0 ${front ? 0 : 1} ${cx + R * 1.55} ${cy}" fill="none" stroke="url(#${id}fr)" stroke-width="${r2(R * 0.07)}" stroke-linecap="round" transform="rotate(-16 ${cx} ${cy})"/>`;
  const small = [
    [cx + R * 1.25, cy - R * 0.95, R * 0.16, b.cyan, b.blue],
    [cx - R * 1.35, cy + R * 0.7, R * 0.11, b.blue, b.royal],
  ]
    .map(([x, y, r, c1, c2], k) => {
      const [d, el] = sphere(`${id}fx${k}`, x as number, y as number, r as number, c1 as string, c2 as string).split("|");
      defs.push(d);
      return el;
    })
    .join("");
  return `<ellipse cx="${cx}" cy="${cy + R * 1.18}" rx="${R * 1.1}" ry="${R * 0.22}" fill="url(#${id}fs)"/>${ring(false)}<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${id}fh)"/>${ring(true)}${small}`;
}

/** Teks kecil bertumpuk di sudut (gaya Glossy). */
function cornerStack(words: string, x: number, y: number, alignRight: boolean, fromBottom: boolean, color: string) {
  const F = font("semibold");
  const lines = words.toUpperCase().split(/\s+/).filter(Boolean).slice(0, 4).map((w) => clean(F, w));
  const lh = 22;
  const y0 = fromBottom ? y - lines.length * lh : y;
  return lines.map((l, k) => line(F, l, alignRight ? x - widthOf(F, l, 15, 2.2) : x, y0 + k * lh, 15, 1.4, color, 2.2)).join("");
}

function pill(text: string, xRight: number, yCenter: number, dark: boolean, look: Look) {
  const F = font("semibold");
  const t = clean(F, text);
  const w = widthOf(F, t, 22) + 34;
  const h = 46;
  const fill = dark ? "#FFFFFF" : "#0B1026";
  const op = dark ? (look === "photo" ? 0.22 : 0.12) : 0.07;
  return `<rect x="${r2(xRight - w)}" y="${yCenter - h / 2}" width="${r2(w)}" height="${h}" rx="${h / 2}" fill="${fill}" fill-opacity="${op}"/>` + line(F, t, xRight - w + 17, yCenter - 13.5, 22, 1.23, dark ? "#FFFFFF" : "#3B4258");
}

function swipePill(text: string, xRight: number, yCenter: number, dark: boolean, brand: SlideBrand) {
  const F = font("bold");
  const t = clean(F, text.toUpperCase());
  const w = widthOf(F, t, 20, 2.4) + 48;
  const h = 52;
  return (
    `<rect x="${r2(xRight - w)}" y="${yCenter - h / 2}" width="${r2(w)}" height="${h}" rx="${h / 2}" fill="${dark ? "#FFFFFF" : "#FFFFFF"}" fill-opacity="${dark ? 0.08 : 0.85}" stroke="${dark ? "#FFFFFF" : mix(brand.royal, "#FFFFFF", 0.55)}" stroke-opacity="${dark ? 0.35 : 1}" stroke-width="2"/>` +
    line(F, t, xRight - w + 24, yCenter - 12.5, 20, 1.25, dark ? "#FFFFFF" : brand.royal, 2.4)
  );
}

function logoMark(o: Prepared, x: number, yCenter: number, h: number, ink: string, id: string, center = false) {
  const b = o.brand;
  if (o.logoData) {
    const scale = Math.min(h / o.logoData.h, 300 / o.logoData.w);
    const w = o.logoData.w * scale;
    const hh = o.logoData.h * scale;
    return `<image href="${o.logoData.uri}" x="${r2(center ? x - w / 2 : x)}" y="${r2(yCenter - hh / 2)}" width="${r2(w)}" height="${r2(hh)}"/>`;
  }
  const F = font("display");
  const name = clean(F, b.name.toUpperCase()).slice(0, 26);
  const total = 48 + 14 + widthOf(F, name, 32, 0.5);
  const x0 = center ? x - total / 2 : x;
  return (
    `<rect x="${r2(x0)}" y="${yCenter - 24}" width="48" height="48" rx="14" fill="url(#${id}diag)"/>` +
    line(F, name.charAt(0), x0 + (48 - widthOf(F, name.charAt(0), 28)) / 2, yCenter - 17, 28, 1.2, "#FFFFFF") +
    line(F, name, x0 + 62, yCenter - 19, 32, 1.2, ink, 0.5)
  );
}

const DEFAULT_CORNERS = {
  id: ["Ide tulis tayang", "Brand naik kelas", "Simpan bagikan terapkan", "Geser untuk lanjut"],
  en: ["Plan write post", "Brand level up", "Save share apply", "Swipe to continue"],
};

// ---------------------------------------------------------------------------
// Cover studio (glossy / bold / photo) dengan visual utama
// ---------------------------------------------------------------------------
function heroSlide(s: Slide, i: number, n: number, o: Prepared, look: Look) {
  const b = o.brand;
  const id = `h${i}`;
  const defs: string[] = [];
  const dark = look !== "glossy";
  const P = paint(look, dark);
  const main = font(P.titleFont);
  defs.push(
    `<linearGradient id="${id}diag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b.royal}"/><stop offset="1" stop-color="${b.cyan}"/></linearGradient>`,
    `<linearGradient id="${id}acc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${dark ? mix(b.royal, "#FFFFFF", 0.25) : b.royal}"/><stop offset=".55" stop-color="${b.blue}"/><stop offset="1" stop-color="${b.cyan}"/></linearGradient>`,
  );
  const { tag, cta } = slideCorners(s, i, n, o.en);
  let bg = "";
  let deco = "";
  let text = "";
  let hero = "";
  const lsOf = (size: number) => (look === "bold" ? size * 0.005 : -size * 0.022);
  const lhT = look === "bold" ? 0.98 : 1.02;
  const serifFill = dark ? "#FFFFFF" : `url(#${id}acc)`;

  if (look === "glossy") {
    bg = glossyBg(id, b, true, defs);
    const cs = (o.corners?.length ? o.corners : DEFAULT_CORNERS[o.en ? "en" : "id"]).slice(0, 4);
    const cc = "#7D85A0";
    deco += cornerStack(cs[0] ?? "", 64, 64, false, false, cc) + cornerStack(cs[1] ?? "", W - 64, 64, true, false, cc);
    deco += cornerStack(cs[2] ?? "", 64, H - 64, false, true, cc) + cornerStack(cs[3] ?? "", W - 64, H - 64, true, true, cc);
    deco += logoMark(o, W / 2, 92, 46, P.ink, id, true);

    // Judul tengah; angka besar (s.num) di kiri judul seperti "7 GitHub Repos".
    const num = s.num ? clean(main, s.num).slice(0, 3) : "";
    const texts = [s.title ?? "", s.accent ?? ""];
    let y = 196;
    if (num) {
      const size = fitRich(main, texts, INNER - 330, 4, 100, 60, lsOf, false);
      const tl = richWrap(main, s.title ?? "", size, INNER - 330, lsOf(size), false);
      const al = s.accent ? richWrap(main, s.accent, size, INNER - 330, lsOf(size), false) : [];
      const blockH = (tl.length + al.length) * size * lhT;
      const numSize = Math.min(440, blockH * 1.32);
      const nw = widthOf(main, num, numSize, -numSize * 0.03);
      const textW = Math.max(...[...tl, ...al].map((l) => richW(main, l, size, lsOf(size))));
      const x0 = (W - (nw + 26 + textW)) / 2;
      text += glyphs(main, num, x0, y + numSize * 0.78, numSize, `url(#${id}acc)`, -numSize * 0.03);
      const ty = y + (numSize * 0.86 - blockH) / 2;
      [...tl.map((l) => ({ l, acc: false })), ...al.map((l) => ({ l, acc: true }))].forEach((x, k) => {
        text += richDraw(main, x.l, x0 + nw + 26, ty + k * size * lhT, size, lhT, x.acc ? `url(#${id}acc)` : P.ink, serifFill, lsOf(size));
      });
      y += numSize * 0.86;
    } else {
      const size = fitRich(main, texts, INNER, 3, 124, 64, lsOf, false);
      const all = [
        ...richWrap(main, s.title ?? "", size, INNER, lsOf(size), false).map((l) => ({ l, acc: false })),
        ...(s.accent ? richWrap(main, s.accent, size, INNER, lsOf(size), false) : []).map((l) => ({ l, acc: true })),
      ];
      all.forEach((x, k) => {
        const w = richW(main, x.l, size, lsOf(size));
        text += richDraw(main, x.l, (W - w) / 2, y + k * size * lhT, size, lhT, x.acc ? `url(#${id}acc)` : P.ink, serifFill, lsOf(size));
      });
      y += all.length * size * lhT;
    }
    if (s.sub) {
      const F = font("medium");
      const ls2 = wrap(F, s.sub, 30, 800).slice(0, 2);
      y += 22;
      ls2.forEach((l, k) => (text += line(F, l, (W - widthOf(F, l, 30)) / 2, y + k * 42, 30, 1.4, P.muted)));
      y += ls2.length * 42;
    }
    // Visual utama di bawah judul
    const top = y + 30;
    const bottom = H - (n > 1 ? 150 : 110);
    const size = Math.max(420, Math.min(900, bottom - top + 60));
    const cy = top + (bottom - top) / 2;
    hero = o.hero
      ? `<image href="${o.hero}" x="${r2(W / 2 - size / 2)}" y="${r2(cy - size / 2)}" width="${size}" height="${size}"/>`
      : fallbackHero(id, b, W / 2, cy, size, false, defs);
    if (n > 1) text += swipePill(cta || (o.en ? "Swipe →" : "Geser →"), W / 2 + widthOf(font("bold"), clean(font("bold"), (cta || "Geser →").toUpperCase()), 20, 2.4) / 2 + 24, H - 92, false, b);
  } else if (look === "bold") {
    bg = boldBg(id, b, true, defs);
    deco += logoMark(o, PAD_X, PAD_TOP + 10, 50, "#FFFFFF", id);
    if (tag) deco += pill(tag, W - PAD_X + 20, PAD_TOP + 10, true, look);
    const size = fitRich(main, [s.title ?? "", s.accent ?? ""], INNER + 40, 3, 190, 96, lsOf, true);
    const all = [
      ...richWrap(main, s.title ?? "", size, INNER + 40, lsOf(size), true).map((l) => ({ l, acc: false })),
      ...(s.accent ? richWrap(main, s.accent, size, INNER + 40, lsOf(size), true) : []).map((l) => ({ l, acc: true })),
    ];
    const F = font("semibold");
    const subLines = s.sub ? wrap(F, s.sub.toUpperCase(), 26, INNER, 3).slice(0, 2) : [];
    const blockH = all.length * size * lhT + (subLines.length ? 28 + subLines.length * 38 : 0);
    let y = H - 170 - blockH;
    all.forEach((x, k) => {
      const w = richW(main, x.l, size, lsOf(size));
      text += richDraw(main, x.l, (W - w) / 2, y + k * size * lhT, size, lhT, x.acc ? `url(#${id}acc)` : "#FFFFFF", "#FFFFFF", lsOf(size));
    });
    y += all.length * size * lhT + 28;
    subLines.forEach((l, k) => (text += line(F, l, (W - widthOf(F, l, 26, 3)) / 2, y + k * 38, 26, 1.4, "#C9CEDB", 3)));
    const top = PAD_TOP + 60;
    const bottom = H - 170 - blockH - 20;
    const hs = Math.max(360, Math.min(820, bottom - top));
    const cy = top + (bottom - top) / 2;
    hero = o.hero
      ? `<image href="${o.hero}" x="${r2(W / 2 - hs / 2)}" y="${r2(cy - hs / 2)}" width="${hs}" height="${hs}"/>`
      : fallbackHero(id, b, W / 2, cy, hs, true, defs);
    const R = font("regular");
    const handle = clean(R, b.handle);
    if (handle) text += line(R, handle, PAD_X, H - PAD_BOTTOM - 30, 24, 1.23, "#7A8194");
    if (cta) text += line(font("semibold"), clean(font("semibold"), `${cta.replace(/\s*→\s*$/, "")} »`), W - PAD_X - widthOf(font("semibold"), clean(font("semibold"), `${cta.replace(/\s*→\s*$/, "")} »`), 28), H - PAD_BOTTOM - 32, 28, 1.2, "#FFFFFF");
  } else {
    // photo
    defs.push(
      `<linearGradient id="${id}ov" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000000" stop-opacity=".45"/><stop offset=".16" stop-color="#000000" stop-opacity="0"/><stop offset=".42" stop-color="#000000" stop-opacity="0"/><stop offset=".78" stop-color="#05060A" stop-opacity=".72"/><stop offset="1" stop-color="#05060A" stop-opacity=".9"/></linearGradient>`,
      `<linearGradient id="${id}pbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(b.royal, "#000000", 0.2)}"/><stop offset="1" stop-color="${mix(b.cyan, b.royal, 0.4)}"/></linearGradient>`,
    );
    bg = o.hero ? `<image href="${o.hero}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>` : `<rect width="${W}" height="${H}" fill="url(#${id}pbg)"/>` + fallbackHero(id, b, W / 2, 470, 760, true, defs);
    bg += `<rect width="${W}" height="${H}" fill="url(#${id}ov)"/>`;
    deco += logoMark(o, PAD_X, PAD_TOP, 50, "#FFFFFF", id);
    if (tag) deco += pill(tag, W - PAD_X + 20, PAD_TOP, true, look);
    const size = fitRich(main, [s.title ?? "", s.accent ?? ""], INNER, 4, 124, 70, lsOf, false);
    const all = [
      ...richWrap(main, s.title ?? "", size, INNER, lsOf(size), false).map((l) => ({ l, acc: false })),
      ...(s.accent ? richWrap(main, s.accent, size, INNER, lsOf(size), false) : []).map((l) => ({ l, acc: true })),
    ];
    const F = font("medium");
    const subLines = s.sub ? wrap(F, s.sub, 30, INNER - 60).slice(0, 2) : [];
    const kick = s.label ? clean(font("heavy"), s.label) : "";
    const kh = 64;
    const blockH = (kick ? kh + 22 : 0) + all.length * size * lhT + (subLines.length ? 26 + subLines.length * 42 : 0);
    let y = H - 150 - blockH;
    if (kick) {
      const kw = widthOf(font("heavy"), kick, 38, -0.5) + 40;
      text += `<rect x="${PAD_X - 6}" y="${y}" width="${r2(kw)}" height="${kh}" rx="10" fill="${mix(b.cyan, "#FFFFFF", 0.15)}" transform="rotate(-2 ${PAD_X} ${y + kh / 2})"/>`;
      text += `<g transform="rotate(-2 ${PAD_X} ${y + kh / 2})">${line(font("heavy"), kick, PAD_X + 14, y + 9, 38, 1.2, "#0B1026", -0.5)}</g>`;
      y += kh + 22;
    }
    const accFill = mix(b.cyan, "#FFFFFF", 0.1);
    all.forEach((x, k) => (text += richDraw(main, x.l, PAD_X, y + k * size * lhT, size, lhT, x.acc ? accFill : "#FFFFFF", accFill, lsOf(size))));
    y += all.length * size * lhT + 26;
    subLines.forEach((l, k) => (text += line(F, l, PAD_X, y + k * 42, 30, 1.4, "#E4E7EF")));
    const R = font("regular");
    const handle = clean(R, b.handle);
    if (handle) text += line(R, handle, PAD_X, H - PAD_BOTTOM - 26, 24, 1.23, "#C3C8D4");
    if (cta) {
      const t = clean(font("semibold"), cta);
      text += line(font("semibold"), t, W - PAD_X - widthOf(font("semibold"), t, 26), H - PAD_BOTTOM - 28, 26, 1.2, "#FFFFFF");
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs.join("")}</defs>${bg}${hero}${deco}${text}</svg>`;
}

// ---------------------------------------------------------------------------
// Slide isi (semua gaya) + cover klasik
// ---------------------------------------------------------------------------
export function slideSvg(s: Slide, i: number, n: number, o: Prepared) {
  const look: Look = o.look ?? "classic";
  if (look !== "classic" && isHero(s, i)) return heroSlide(s, i, n, o, look);
  const b = o.brand;
  const theme = slideTheme(s, i, n, look);
  const dark = theme === "dark";
  const P = paint(look, dark);
  const alt = dark && i === n - 1 && n > 1;
  const { ink, muted, corner } = P;
  const big = s.type === "cover" || s.type === "statement";
  const D = font(P.titleFont);
  const id = `s${i}`;
  const defs: string[] = [];
  const blocks: Block[] = [];

  // Latar
  let bg: string;
  if (look === "glossy") bg = glossyBg(id, b, false, defs);
  else if (look === "bold") bg = boldBg(id, b, false, defs);
  else {
    bg = `<rect width="${W}" height="${H}" fill="${dark ? b.navy : look === "photo" ? "#F6F4F0" : "#F7F8FC"}"/>`;
    if (dark) {
      const [cx, cy] = alt ? [200, H + 420 - 500] : [W + 260 - 500, -300 + 500];
      const stops = alt
        ? `<stop offset="0" stop-color="${b.cyan}" stop-opacity=".35"/><stop offset=".35" stop-color="${b.royal}" stop-opacity=".35"/><stop offset=".7" stop-color="${b.navy}" stop-opacity="0"/>`
        : `<stop offset="0" stop-color="${b.royal}" stop-opacity=".95"/><stop offset=".38" stop-color="${b.royal}" stop-opacity=".45"/><stop offset=".7" stop-color="${b.navy}" stop-opacity="0"/>`;
      defs.push(`<radialGradient id="${id}glow" cx="${cx}" cy="${cy}" r="707" gradientUnits="userSpaceOnUse">${stops}</radialGradient>`);
      bg += `<circle cx="${cx}" cy="${cy}" r="500" fill="url(#${id}glow)"/>`;
    }
  }
  const accStart = dark ? mix(b.royal, "#FFFFFF", look === "bold" ? 0.3 : 0.12) : b.royal;
  defs.push(
    `<linearGradient id="${id}acc" x1="${PAD_X}" y1="0" x2="${PAD_X + INNER}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${accStart}"/><stop offset="${dark ? 0.5 : 0.55}" stop-color="${b.blue}"/><stop offset="1" stop-color="${b.cyan}"/></linearGradient>`,
    `<linearGradient id="${id}diag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b.royal}"/><stop offset="1" stop-color="${b.cyan}"/></linearGradient>`,
    `<linearGradient id="${id}btn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${b.royal}"/><stop offset=".6" stop-color="${b.blue}"/><stop offset="1" stop-color="${b.cyan}"/></linearGradient>`,
    `<filter id="${id}sh" x="-10%" y="-20%" width="120%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="${mix(b.royal, "#0A0F24", 0.6)}" flood-opacity="${dark ? 0 : 0.12}"/></filter>`,
  );

  // Label (pil kecil)
  if (s.label) {
    const F = font("bold");
    const t = clean(F, s.label.toUpperCase());
    const w = widthOf(F, t, 24, 2) + 40;
    const h = 49;
    blocks.push({
      h,
      mt: 0,
      draw: (y) =>
        `<rect x="${PAD_X}" y="${y}" width="${r2(w)}" height="${h}" rx="${h / 2}" fill="${dark ? mix(b.blue, look === "bold" ? "#06070B" : b.navy, 0.75) : mix(b.royal, "#FFFFFF", 0.88)}"/>` +
        line(F, t, PAD_X + 20, y + 10, 24, 1.21, dark ? mix(b.blue, "#FFFFFF", 0.5) : b.royal, 2),
    });
  }

  // Judul + aksen (teks kaya: *kata* = serif miring)
  const size = look === "bold" ? (big ? 120 : 96) : big ? 100 : look === "classic" ? 76 : 80;
  const lh = look === "bold" ? 1.0 : big ? 1.04 : 1.08;
  const ls = look === "bold" ? 0.5 : look === "classic" ? (big ? -1.5 : -1) : -size * 0.02;
  const tLines = s.title ? richWrap(D, s.title, size, INNER, ls, P.upper) : [];
  const aLines = s.accent ? richWrap(D, s.accent, size, INNER, ls, P.upper) : [];
  if (tLines.length || aLines.length) {
    const all = [...tLines.map((l) => ({ l, acc: false })), ...aLines.map((l) => ({ l, acc: true }))];
    blocks.push({
      h: all.length * size * lh,
      mt: s.label ? 36 : 0,
      draw: (y) => all.map((x, k) => richDraw(D, x.l, PAD_X, y + k * size * lh, size, lh, x.acc ? `url(#${id}acc)` : ink, dark ? ink : `url(#${id}acc)`, ls)).join(""),
    });
  }

  const T = font(look === "classic" ? "display" : look === "bold" ? "condensed" : "heavy");
  // Polling A/B/C
  if (s.type === "poll" && s.options?.length) {
    const F = font("semibold");
    const opts = s.options.slice(0, 3);
    const textW = INNER - 80 - 104 - 36;
    const cards = opts.map((op) => {
      const ls2 = wrap(F, op, 40, textW);
      return { ls2, h: Math.max(104, ls2.length * 40 * 1.3) + 80 };
    });
    const gap = 32;
    blocks.push({
      h: cards.reduce((a, c) => a + c.h, 0) + gap * (cards.length - 1),
      mt: 64,
      draw: (y) => {
        let yy = y;
        return cards
          .map((c, k) => {
            const second = k === 1;
            const cardFill = dark ? (second ? mix(b.royal, "#06070B", 0.7) : "#10131C") : second ? mix(b.cyan, "#FFFFFF", 0.92) : "#FFFFFF";
            const cardStroke = dark ? (second ? mix(b.cyan, "#06070B", 0.5) : "#232838") : second ? mix(b.cyan, "#FFFFFF", 0.78) : "#E3E8F2";
            const badge = k === 0 ? (dark ? "#FFFFFF" : "#0A0F24") : k === 1 ? `url(#${id}diag)` : b.blue;
            const by = yy + (c.h - 104) / 2;
            const ty = yy + (c.h - c.ls2.length * 40 * 1.3) / 2;
            const L = "ABC"[k];
            const out =
              `<rect x="${PAD_X + 1}" y="${yy + 1}" width="${INNER - 2}" height="${c.h - 2}" rx="32" fill="${cardFill}" stroke="${cardStroke}" stroke-width="2" filter="url(#${id}sh)"/>` +
              `<rect x="${PAD_X + 40}" y="${r2(by)}" width="104" height="104" rx="24" fill="${badge}"/>` +
              line(T, L, PAD_X + 40 + (104 - widthOf(T, L, 52)) / 2, by + 26, 52, 1, k === 0 && dark ? "#06070B" : "#FFFFFF") +
              c.ls2.map((l, j) => line(F, l, PAD_X + 40 + 104 + 36, ty + j * 52, 40, 1.3, dark ? "#EEF1F8" : "#0A0F24")).join("");
            yy += c.h + gap;
            return out;
          })
          .join("");
      },
    });
  }

  // Rangkuman bercentang (gaya studio: di dalam kartu)
  if (s.type === "list" && s.items?.length) {
    const F = font("medium");
    const card = P.studio;
    const pad = card ? 44 : 0;
    const items = s.items.slice(0, 6).map((it) => {
      const ls2 = wrap(F, it, 38, INNER - 56 - 28 - pad * 2);
      return { ls2, h: Math.max(56, ls2.length * 38 * 1.35) };
    });
    const inner = items.reduce((a, c) => a + c.h, 0) + 28 * (items.length - 1);
    blocks.push({
      h: inner + pad * 2,
      mt: 56,
      draw: (y) => {
        let yy = y + pad;
        const box = card
          ? `<rect x="${PAD_X}" y="${y}" width="${INNER}" height="${inner + pad * 2}" rx="36" fill="${dark ? "#10131C" : "#FFFFFF"}" fill-opacity="${dark ? 1 : 0.9}" stroke="${dark ? "#232838" : mix(b.royal, "#FFFFFF", 0.86)}" stroke-width="2" filter="url(#${id}sh)"/>`
          : "";
        return (
          box +
          items
            .map((c) => {
              const x = PAD_X + pad;
              const out =
                `<rect x="${x}" y="${yy - 2}" width="56" height="56" rx="16" fill="url(#${id}diag)"/>` +
                `<path d="M${x + 14} ${yy + 27.5}l9.8 9.8L${x + 44.3} ${yy + 14.3}" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>` +
                c.ls2.map((l, j) => line(F, l, x + 84, yy + j * 38 * 1.35, 38, 1.35, dark ? "#E6EAF5" : "#0A0F24")).join("");
              yy += c.h + 28;
              return out;
            })
            .join("")
        );
      },
    });
  }

  // Sub & body
  for (const key of ["sub", "body"] as const) {
    const v = s[key];
    if (!v) continue;
    const F = font("regular");
    const ls2 = wrap(F, v, 36, Math.min(860, INNER));
    blocks.push({
      h: ls2.length * 36 * 1.45,
      mt: 44,
      draw: (y) => ls2.map((l, j) => line(F, l, PAD_X, y + j * 36 * 1.45, 36, 1.45, muted)).join(""),
    });
  }

  // Tombol (slide penutup)
  if (s.type === "cta" && s.button) {
    const F = font("bold");
    const t = clean(F, s.button);
    const w = widthOf(F, t, 36) + 96;
    const h = 100;
    blocks.push({
      h,
      mt: 64,
      draw: (y) => `<rect x="${PAD_X}" y="${y}" width="${r2(w)}" height="${h}" rx="${h / 2}" fill="url(#${id}btn)"/>` + line(F, t, PAD_X + 48, y + 28, 36, 1.22, "#FFFFFF"),
    });
  }

  // Bar atas: logo + penanda halaman
  const logoH = P.studio ? 50 : dark ? 74 : 58;
  const topCenter = PAD_TOP + 29;
  const logo = logoMark(o, PAD_X, topCenter, logoH, ink, id);
  const { tag, cta } = slideCorners(s, i, n, o.en);
  const R = font("regular");
  const SB = font("semibold");
  let top = logo;
  if (tag) {
    if (P.studio) top += pill(tag, W - PAD_X + 20, topCenter, dark, look);
    else {
      const tagT = clean(R, tag);
      top += line(R, tagT, W - PAD_X - widthOf(R, tagT, 26), topCenter - 16, 26, 1.23, corner);
    }
  }

  // Bar bawah: akun + ajakan
  const botTop = H - PAD_BOTTOM - 34;
  const handle = clean(R, b.handle);
  let bottom = handle ? line(R, handle, PAD_X, botTop + 1, 26, 1.23, corner) : "";
  if (cta) {
    if (P.studio) bottom += swipePill(cta, W - PAD_X + 20, botTop + 16, dark, b);
    else {
      const ctaT = clean(SB, cta);
      bottom += line(SB, ctaT, W - PAD_X - widthOf(SB, ctaT, 28), botTop, 28, 1.2, b.blue);
    }
  }

  // Nomor besar
  let num = "";
  if (s.num) {
    const t = clean(D, s.num).slice(0, 3);
    if (!dark && look === "classic") {
      const nw = widthOf(D, t, 420);
      num = outlineLine(D, t, W - 40 - nw, H - 60 - 420, 420, "#E3E8F2");
    } else if (P.studio) {
      const ns = look === "bold" ? 520 : 440;
      const nw = widthOf(D, t, ns);
      const op = dark ? 0.16 : 0.13;
      num = `<g opacity="${op}">${line(D, t, W - 30 - nw, H - 70 - ns, ns, 1, `url(#${id}diag)`)}</g>`;
    }
  }

  // Isi di tengah area antara bar atas & bawah
  const mainTop = PAD_TOP + logoH - (dark && !P.studio ? 16 : 0) + (P.studio ? 30 : 0);
  const mainBottom = botTop - (P.studio ? 20 : 0);
  const total = blocks.reduce((a, bk, k) => a + bk.h + (k ? bk.mt : 0), 0);
  let y = mainTop + Math.max(0, (mainBottom - mainTop - total) / 2);
  const body = blocks
    .map((bk, k) => {
      if (k) y += bk.mt;
      const out = bk.draw(r2(y));
      y += bk.h;
      return out;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs.join("")}</defs>${bg}${num}${top}${body}${bottom}</svg>`;
}

// ---------------------------------------------------------------------------
// Aset: logo & visual utama
// ---------------------------------------------------------------------------
/** Siapkan logo (PNG, tinggi 148 px) sebagai data URI untuk SVG. */
async function logoData(o: RenderOptions, theme: "dark" | "light") {
  if (o.marqthinkLogo && !o.logo) {
    const b64 = marqLogos()[theme];
    const meta = await sharp(Buffer.from(b64, "base64")).metadata();
    return { uri: `data:image/png;base64,${b64}`, w: meta.width ?? 280, h: meta.height ?? 70 };
  }
  if (!o.logo) return null;
  const png = await sharp(o.logo.bytes).resize({ height: 148, withoutEnlargement: true }).png().toBuffer();
  const meta = await sharp(png).metadata();
  return { uri: `data:image/png;base64,${png.toString("base64")}`, w: meta.width ?? 148, h: meta.height ?? 148 };
}

/** Visual utama → data URI. Glossy/Bold: persegi dengan tepi memudar agar menyatu ke latar. Photo: penuh 1080×1350. */
async function heroData(buf: Buffer, look: Look) {
  if (look === "photo") {
    const jpg = await sharp(buf).resize(W, H, { fit: "cover", position: "attention" }).jpeg({ quality: 88 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  }
  const S = 900;
  const img = await sharp(buf).resize(S, S, { fit: "cover" }).ensureAlpha().png().toBuffer();
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs><radialGradient id="m" cx="50%" cy="50%" r="50%"><stop offset=".58" stop-color="#fff" stop-opacity="1"/><stop offset=".97" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="${S}" height="${S}" fill="url(#m)"/></svg>`,
  );
  const png = await sharp(img).composite([{ input: await sharp(mask).png().toBuffer(), blend: "dest-in" }]).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function prepare(slides: Slide[], i: number, o: RenderOptions, logos: Partial<Record<"dark" | "light", Prepared["logoData"]>>): Promise<Prepared> {
  const look = o.look ?? "classic";
  const s = slides[i];
  const theme = slideTheme(s, i, slides.length, look);
  const logoTheme = look === "photo" && isHero(s, i) ? "dark" : theme;
  if (!(logoTheme in logos)) logos[logoTheme] = await logoData(o, logoTheme);
  let hero: string | null = null;
  if (look !== "classic" && isHero(s, i) && s.image && o.images?.[s.image]) {
    try {
      hero = await heroData(o.images[s.image], look);
    } catch (err) {
      console.error("[autopilot] visual gagal dibaca", err);
    }
  }
  return { ...o, look, logoData: logos[logoTheme] ?? null, hero, corners: slides[0]?.corners };
}

const toJpeg = (svg: string, width = W, quality = 90) => {
  let img = sharp(Buffer.from(svg));
  if (width < W) img = img.resize({ width });
  return img.jpeg({ quality, progressive: true, mozjpeg: true }).toBuffer();
};

/** Render semua slide → JPEG 1080×1350 (kualitas 90). */
export async function renderSlides(slides: Slide[], o: RenderOptions): Promise<Buffer[]> {
  const logos: Partial<Record<"dark" | "light", Prepared["logoData"]>> = {};
  const prepared: Prepared[] = [];
  for (let i = 0; i < slides.length; i++) prepared.push(await prepare(slides, i, o, logos));
  return Promise.all(slides.map((s, i) => toJpeg(slideSvg(s, i, slides.length, prepared[i]))));
}

/** Render satu slide (pratinjau di halaman ACC). `width` < 1080 untuk pratinjau ringan. */
export async function renderSlide(slides: Slide[], i: number, o: RenderOptions, width = W): Promise<Buffer> {
  return toJpeg(slideSvg(slides[i], i, slides.length, await prepare(slides, i, o, {})), width, 86);
}
