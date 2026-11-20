import "server-only";
import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import sharp from "sharp";
import { slideCorners, slideTheme, type Slide, type SlideBrand } from "./slides";

/**
 * Renderer slide Autopilot Konten (1080×1350 JPEG) — tiruan persis desain konten @marqthink.ai (skill marqthink-ig,
 * render.py): cover/penutup gelap dengan cahaya, isi terang, judul Montserrat ExtraBold dengan aksen gradasi, nomor
 * besar bergaris tepi, polling A/B/C, rangkuman bercentang, tombol gradasi. Huruf digambar sebagai path dari file font
 * aslinya (hasil sama di semua perangkat, siap diposting otomatis). Warna, logo & akun mengikuti Brand Kit.
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

type FontKey = "display" | "regular" | "medium" | "semibold" | "bold";
const FILES: Record<FontKey, string> = {
  display: "Montserrat.ttf",
  regular: "Inter-Regular.otf",
  medium: "Inter-Medium.otf",
  semibold: "Inter-SemiBold.otf",
  bold: "Inter-Bold.otf",
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
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (!line || widthOf(fk, next, size, ls) <= maxW) line = next;
      else {
        out.push(line);
        line = w;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function baseline(fk: Fk, size: number, lh: number) {
  const a = fk.ascent / fk.unitsPerEm;
  const d = Math.abs(fk.descent) / fk.unitsPerEm;
  return ((lh - (a + d)) * size) / 2 + a * size;
}

/** Satu baris teks → path SVG (fill = warna atau url(#gradasi)). */
function line(fk: Fk, s: string, x: number, top: number, size: number, lh: number, fill: string, ls = 0) {
  const run = fk.layout(s);
  const k = size / fk.unitsPerEm;
  const base = top + baseline(fk, size, lh);
  let pen = 0;
  const parts: string[] = [];
  run.glyphs.forEach((g, i) => {
    const p = run.positions[i];
    const d = g.path.toSVG();
    if (d) parts.push(`<path transform="translate(${r2(x + pen + p.xOffset * k)} ${r2(base - p.yOffset * k)}) scale(${r2(k * 1000) / 1000} ${-r2(k * 1000) / 1000})" d="${d}"/>`);
    pen += p.xAdvance * k + ls;
  });
  return `<g fill="${fill}">${parts.join("")}</g>`;
}

function outlineLine(fk: Fk, s: string, x: number, top: number, size: number, stroke: string) {
  return line(fk, s, x, top, size, 1, "none").replace('<g fill="none">', `<g fill="none" stroke="${stroke}" stroke-width="${r2(3 * (fk.unitsPerEm / size))}">`);
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
}

let defaultLogos: { dark: string; light: string } | null = null;
function marqLogos() {
  if (!defaultLogos) {
    const b64 = (f: string) => fs.readFileSync(path.join(process.cwd(), "public", "brand", f)).toString("base64");
    defaultLogos = { dark: b64("autopilot-logo-dark.png"), light: b64("autopilot-logo-light.png") };
  }
  return defaultLogos;
}

/** Bangun SVG satu slide. */
export function slideSvg(s: Slide, i: number, n: number, o: RenderOptions & { logoData?: { uri: string; w: number; h: number } | null }) {
  const b = o.brand;
  const theme = slideTheme(s, i, n);
  const dark = theme === "dark";
  const alt = dark && i === n - 1 && n > 1;
  const ink = dark ? "#FFFFFF" : "#0A0F24";
  const muted = dark ? "#B4BCD3" : "#5B6478";
  const corner = dark ? "#7C86A6" : "#8A93A8";
  const big = s.type === "cover" || s.type === "statement";
  const D = font("display");
  const id = `s${i}`;
  const defs: string[] = [];
  const blocks: Block[] = [];

  // Latar
  let bg = `<rect width="${W}" height="${H}" fill="${dark ? b.navy : "#F7F8FC"}"/>`;
  if (dark) {
    const [cx, cy] = alt ? [200, H + 420 - 500] : [W + 260 - 500, -300 + 500];
    const stops = alt
      ? `<stop offset="0" stop-color="${b.cyan}" stop-opacity=".35"/><stop offset=".35" stop-color="${b.royal}" stop-opacity=".35"/><stop offset=".7" stop-color="${b.navy}" stop-opacity="0"/>`
      : `<stop offset="0" stop-color="${b.royal}" stop-opacity=".95"/><stop offset=".38" stop-color="${b.royal}" stop-opacity=".45"/><stop offset=".7" stop-color="${b.navy}" stop-opacity="0"/>`;
    defs.push(`<radialGradient id="${id}glow" cx="${cx}" cy="${cy}" r="707" gradientUnits="userSpaceOnUse">${stops}</radialGradient>`);
    bg += `<circle cx="${cx}" cy="${cy}" r="500" fill="url(#${id}glow)"/>`;
  }
  const accStart = dark ? mix(b.royal, "#FFFFFF", 0.12) : b.royal;
  defs.push(
    `<linearGradient id="${id}acc" x1="${PAD_X}" y1="0" x2="${PAD_X + INNER}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${accStart}"/><stop offset="${dark ? 0.5 : 0.55}" stop-color="${b.blue}"/><stop offset="1" stop-color="${b.cyan}"/></linearGradient>`,
    `<linearGradient id="${id}diag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b.royal}"/><stop offset="1" stop-color="${b.cyan}"/></linearGradient>`,
    `<linearGradient id="${id}btn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${b.royal}"/><stop offset=".6" stop-color="${b.blue}"/><stop offset="1" stop-color="${b.cyan}"/></linearGradient>`,
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
        `<rect x="${PAD_X}" y="${y}" width="${r2(w)}" height="${h}" rx="${h / 2}" fill="${dark ? mix(b.blue, b.navy, 0.75) : mix(b.royal, "#FFFFFF", 0.88)}"/>` +
        line(F, t, PAD_X + 20, y + 10, 24, 1.21, dark ? mix(b.blue, "#FFFFFF", 0.5) : b.royal, 2),
    });
  }

  // Judul + aksen
  const size = big ? 100 : 76;
  const lh = big ? 1.04 : 1.08;
  const ls = big ? -1.5 : -1;
  const tLines = s.title ? wrap(D, s.title, size, INNER, ls) : [];
  const aLines = s.accent ? wrap(D, s.accent, size, INNER, ls) : [];
  if (tLines.length || aLines.length) {
    const all = [...tLines.map((l) => ({ l, acc: false })), ...aLines.map((l) => ({ l, acc: true }))];
    blocks.push({
      h: all.length * size * lh,
      mt: s.label ? 36 : 0,
      draw: (y) => all.map((x, k) => line(D, x.l, PAD_X, y + k * size * lh, size, lh, x.acc ? `url(#${id}acc)` : ink, ls)).join(""),
    });
  }

  // Polling A/B/C
  if (s.type === "poll" && s.options?.length) {
    const F = font("semibold");
    const opts = s.options.slice(0, 3);
    const textW = INNER - 80 - 104 - 36;
    const cards = opts.map((o) => {
      const ls2 = wrap(F, o, 40, textW);
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
            const cardFill = second ? mix(b.cyan, "#FFFFFF", 0.92) : "#FFFFFF";
            const cardStroke = second ? mix(b.cyan, "#FFFFFF", 0.78) : "#E3E8F2";
            const badge = k === 0 ? "#0A0F24" : k === 1 ? `url(#${id}diag)` : b.blue;
            const by = yy + (c.h - 104) / 2;
            const ty = yy + (c.h - c.ls2.length * 40 * 1.3) / 2;
            const out =
              `<rect x="${PAD_X + 1}" y="${yy + 1}" width="${INNER - 2}" height="${c.h - 2}" rx="32" fill="${cardFill}" stroke="${cardStroke}" stroke-width="2"/>` +
              `<rect x="${PAD_X + 40}" y="${r2(by)}" width="104" height="104" rx="24" fill="${badge}"/>` +
              line(D, "ABC"[k], PAD_X + 40 + (104 - widthOf(D, "ABC"[k], 52)) / 2, by + 26, 52, 1, "#FFFFFF") +
              c.ls2.map((l, j) => line(F, l, PAD_X + 40 + 104 + 36, ty + j * 52, 40, 1.3, "#0A0F24")).join("");
            yy += c.h + gap;
            return out;
          })
          .join("");
      },
    });
  }

  // Rangkuman bercentang
  if (s.type === "list" && s.items?.length) {
    const F = font("medium");
    const items = s.items.slice(0, 6).map((it) => {
      const ls2 = wrap(F, it, 38, INNER - 56 - 28);
      return { ls2, h: Math.max(56, ls2.length * 38 * 1.35) };
    });
    blocks.push({
      h: items.reduce((a, c) => a + c.h, 0) + 28 * (items.length - 1),
      mt: 56,
      draw: (y) => {
        let yy = y;
        return items
          .map((c) => {
            const out =
              `<rect x="${PAD_X}" y="${yy - 2}" width="56" height="56" rx="16" fill="url(#${id}diag)"/>` +
              `<path d="M${PAD_X + 14} ${yy + 27.5}l9.8 9.8L${PAD_X + 44.3} ${yy + 14.3}" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>` +
              c.ls2.map((l, j) => line(F, l, PAD_X + 84, yy + j * 38 * 1.35, 38, 1.35, dark ? "#E6EAF5" : "#0A0F24")).join("");
            yy += c.h + 28;
            return out;
          })
          .join("");
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

  // Bar atas: logo + tag
  const logoH = dark ? 74 : 58;
  const topCenter = PAD_TOP + 29;
  let logo = "";
  if (o.logoData) {
    const maxW = 300;
    const scale = Math.min(logoH / o.logoData.h, maxW / o.logoData.w);
    const w = o.logoData.w * scale;
    const h = o.logoData.h * scale;
    logo = `<image href="${o.logoData.uri}" x="${PAD_X}" y="${r2(topCenter - h / 2)}" width="${r2(w)}" height="${r2(h)}"/>`;
  } else {
    const F = D;
    const name = clean(F, b.name.toUpperCase()).slice(0, 26);
    logo =
      `<rect x="${PAD_X}" y="${topCenter - 24}" width="48" height="48" rx="14" fill="url(#${id}diag)"/>` +
      line(F, name.charAt(0), PAD_X + (48 - widthOf(F, name.charAt(0), 28)) / 2, topCenter - 17, 28, 1.2, "#FFFFFF") +
      line(F, name, PAD_X + 62, topCenter - 19, 32, 1.2, ink, 0.5);
  }
  const { tag, cta } = slideCorners(s, i, n, o.en);
  const R = font("regular");
  const SB = font("semibold");
  const tagT = clean(R, tag);
  const top = logo + (tagT ? line(R, tagT, W - PAD_X - widthOf(R, tagT, 26), topCenter - 16, 26, 1.23, corner) : "");

  // Bar bawah: akun + ajakan
  const botTop = H - PAD_BOTTOM - 34;
  const handle = clean(R, b.handle);
  const ctaT = clean(SB, cta);
  const bottom =
    (handle ? line(R, handle, PAD_X, botTop + 1, 26, 1.23, corner) : "") +
    (ctaT ? line(SB, ctaT, W - PAD_X - widthOf(SB, ctaT, 28), botTop, 28, 1.2, b.blue) : "");

  // Nomor besar bergaris tepi (slide terang)
  let num = "";
  if (s.num && !dark) {
    const t = clean(D, s.num).slice(0, 3);
    const nw = widthOf(D, t, 420);
    num = outlineLine(D, t, W - 40 - nw, H - 60 - 420, 420, "#E3E8F2");
  }

  // Isi di tengah area antara bar atas & bawah
  const mainTop = PAD_TOP + logoH - (dark ? 16 : 0);
  const mainBottom = botTop;
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

function mix(a: string, b: string, t: number) {
  const pa = a.replace("#", "").match(/../g)!.map((x) => parseInt(x, 16));
  const pb = b.replace("#", "").match(/../g)!.map((x) => parseInt(x, 16));
  return `#${pa.map((v, k) => Math.round(v + (pb[k] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

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

/** Render semua slide → JPEG 1080×1350 (kualitas 90). */
export async function renderSlides(slides: Slide[], o: RenderOptions): Promise<Buffer[]> {
  const n = slides.length;
  const logos = { dark: await logoData(o, "dark"), light: await logoData(o, "light") };
  return Promise.all(
    slides.map((s, i) => {
      const theme = slideTheme(s, i, n);
      const svg = slideSvg(s, i, n, { ...o, logoData: logos[theme] });
      return sharp(Buffer.from(svg)).jpeg({ quality: 90, progressive: true, mozjpeg: true }).toBuffer();
    }),
  );
}

/** Render satu slide (pratinjau di halaman ACC). `width` < 1080 untuk pratinjau ringan. */
export async function renderSlide(slides: Slide[], i: number, o: RenderOptions, width = W): Promise<Buffer> {
  const n = slides.length;
  const theme = slideTheme(slides[i], i, n);
  const svg = slideSvg(slides[i], i, n, { ...o, logoData: await logoData(o, theme) });
  let img = sharp(Buffer.from(svg));
  if (width < W) img = img.resize({ width });
  return img.jpeg({ quality: 86, progressive: true, mozjpeg: true }).toBuffer();
}
