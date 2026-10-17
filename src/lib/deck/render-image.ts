import "server-only";
import PptxGenJS from "pptxgenjs";
import type { DeckImages } from "@/lib/pptx";
import { baselineOffset, loadDeckFont } from "./engine";
import type { Scene, SceneItem, SceneSlide } from "./scene";

/**
 * Slide → gambar (SVG → JPEG Full HD lewat sharp). Teks digambar sebagai bentuk huruf (path) dari file font aslinya,
 * jadi hasilnya persis sama dengan pratinjau & PDF di aplikasi mana pun (PowerPoint, WPS, Google Slides, iPhone/Android).
 */

/** 144 px per inci: deck 16:9 → 1920×1080, carousel 4:5 → 1080×1350. */
const PPI = 144;

interface GlyphFont {
  unitsPerEm: number;
  layout(text: string): { glyphs: { path: { toSVG(): string } }[]; positions: { xAdvance: number; xOffset: number; yOffset: number }[] };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const n = (v: number) => Math.round(v * 100) / 100;

function textSvg(it: Extract<SceneItem, { t: "text" }>, scene: Scene) {
  const file = scene.fonts[it.font].file;
  const fk = loadDeckFont(file).fk as unknown as GlyphFont & Parameters<typeof baselineOffset>[0];
  const s = it.size / fk.unitsPerEm;
  const ls = it.ls ?? 0;
  const lineH = it.size * it.lh;
  const total = lineH * it.lines.length;
  const boxTop = it.y * 72;
  const top = it.valign === "middle" ? boxTop + (it.h * 72 - total) / 2 : it.valign === "bottom" ? boxTop + it.h * 72 - total : boxTop;
  const base = baselineOffset(fk, it.size, it.lh);
  const out: string[] = [];
  it.lines.forEach((line, k) => {
    const run = fk.layout(line);
    const width = run.positions.reduce((a, p) => a + p.xAdvance, 0) * s + ls * Math.max(0, line.length - 1);
    const x0 = it.align === "center" ? it.x * 72 + (it.w * 72 - width) / 2 : it.align === "right" ? (it.x + it.w) * 72 - width : it.x * 72;
    let pen = 0;
    const glyphs: string[] = [];
    run.glyphs.forEach((g, i) => {
      const p = run.positions[i];
      const d = g.path.toSVG();
      if (d) glyphs.push(`<path transform="translate(${n(pen + p.xOffset)} ${n(p.yOffset)})" d="${d}"/>`);
      pen += p.xAdvance + ls / s;
    });
    out.push(`<g transform="translate(${n(x0)} ${n(top + k * lineH + base)}) scale(${s} ${-s})">${glyphs.join("")}</g>`);
  });
  return `<g fill="#${it.color}" fill-opacity="${it.o ?? 1}">${out.join("")}</g>`;
}

function itemSvg(it: SceneItem, scene: Scene, images: DeckImages, defs: string[]) {
  const P = (v: number) => n(v * 72);
  switch (it.t) {
    case "rect": {
      const fill = it.fill ? `fill="#${it.fill}" fill-opacity="${it.fo ?? 1}"` : `fill="none"`;
      const stroke = it.line ? `stroke="#${it.line}" stroke-opacity="${it.lo ?? 1}" stroke-width="${it.lw ?? 0.75}"` : "";
      const rot = it.rot ? ` transform="rotate(${it.rot} ${P(it.x + it.w / 2)} ${P(it.y + it.h / 2)})"` : "";
      return `<rect x="${P(it.x)}" y="${P(it.y)}" width="${P(it.w)}" height="${P(it.h)}"${it.r ? ` rx="${P(it.r)}"` : ""} ${fill} ${stroke}${rot}/>`;
    }
    case "ellipse": {
      const fill = it.fill ? `fill="#${it.fill}" fill-opacity="${it.fo ?? 1}"` : `fill="none"`;
      const stroke = it.line ? `stroke="#${it.line}" stroke-opacity="${it.lo ?? 1}" stroke-width="${it.lw ?? 0.75}"` : "";
      return `<ellipse cx="${P(it.x + it.w / 2)}" cy="${P(it.y + it.h / 2)}" rx="${P(it.w / 2)}" ry="${P(it.h / 2)}" ${fill} ${stroke}/>`;
    }
    case "line":
      return `<line x1="${P(it.x1)}" y1="${P(it.y1)}" x2="${P(it.x2)}" y2="${P(it.y2)}" stroke="#${it.color}" stroke-opacity="${it.o ?? 1}" stroke-width="${it.lw}"/>`;
    case "img": {
      const img = images[it.key];
      if (!img) return "";
      const par = it.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice";
      return `<svg x="${P(it.x)}" y="${P(it.y)}" width="${P(it.w)}" height="${P(it.h)}" viewBox="0 0 ${img.width} ${img.height}" preserveAspectRatio="${par}"><image width="${img.width}" height="${img.height}" href="data:${img.mime};base64,${img.data}"/></svg>`;
    }
    case "grad": {
      const id = `g${defs.length}`;
      const [x1, y1, x2, y2] = { right: [0, 0, 1, 0], left: [1, 0, 0, 0], down: [0, 0, 0, 1], up: [0, 1, 0, 0] }[it.dir];
      const stops = [0, 0.2, 0.4, 0.6, 0.8, 1]
        .map((t) => {
          const k = t * t * (3 - 2 * t);
          return `<stop offset="${t}" stop-color="#${it.color}" stop-opacity="${n(it.from + (it.to - it.from) * k)}"/>`;
        })
        .join("");
      defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`);
      return `<rect x="${P(it.x)}" y="${P(it.y)}" width="${P(it.w)}" height="${P(it.h)}" fill="url(#${id})"/>`;
    }
    case "text":
      return textSvg(it, scene);
  }
}

export function slideSvg(slide: SceneSlide, scene: Scene, images: DeckImages) {
  const defs: string[] = [];
  const body = slide.items.map((it) => itemSvg(it, scene, images, defs)).join("");
  const W = n(scene.w * 72);
  const H = n(scene.h * 72);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(scene.w * PPI)}" height="${Math.round(scene.h * PPI)}" viewBox="0 0 ${W} ${H}"><defs>${defs.join("")}</defs><rect width="${W}" height="${H}" fill="#${esc(slide.bg)}"/>${body}</svg>`;
}

/** Semua slide → JPEG Full HD. */
export async function renderSlideImages(scene: Scene, images: DeckImages): Promise<Buffer[]> {
  const sharp = (await import("sharp")).default;
  return Promise.all(scene.slides.map((sl) => sharp(Buffer.from(slideSvg(sl, scene, images))).jpeg({ quality: 90, mozjpeg: true }).toBuffer()));
}

/** PPTX "tampilan persis": tiap slide = satu gambar penuh + catatan pembicara. */
export async function renderImagePptx(scene: Scene, slides: Buffer[], title: string): Promise<Uint8Array> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = title;
  pptx.company = "Markethink";
  slides.forEach((jpg, i) => {
    const slide = pptx.addSlide();
    slide.addImage({ data: `image/jpeg;base64,${jpg.toString("base64")}`, x: 0, y: 0, w: scene.w, h: scene.h });
    const notes = scene.slides[i]?.notes;
    if (notes) slide.addNotes(notes);
  });
  return (await pptx.write({ outputType: "uint8array" })) as Uint8Array;
}
