import "server-only";
import { deflateSync } from "node:zlib";
import PptxGenJS from "pptxgenjs";
import { PDFDocument, clip, degrees, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb, setCharacterSpacing, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { DeckImages } from "@/lib/pptx";
import { baselineOffset, loadDeckFont } from "./engine";
import type { FontRole, Scene, SceneItem } from "./scene";

/** Penggambar Scene → .pptx (bisa diedit) dan .pdf (font asli tertanam, tampil persis). */

// ---------------------------------------------------------------------------
// PNG gradasi transparan (dipakai PPT & PDF agar sama)
// ---------------------------------------------------------------------------

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Uint8Array) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

const gradCache = new Map<string, Buffer>();
export function gradientPng(color: string, from: number, to: number, dir: "right" | "left" | "down" | "up") {
  const id = `${color}-${from}-${to}-${dir}`;
  const hit = gradCache.get(id);
  if (hit) return hit;
  const N = 256;
  const horizontal = dir === "right" || dir === "left";
  const [w, h] = horizontal ? [N, 1] : [1, N];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(color.slice(i, i + 2), 16));
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    for (let x = 0; x < w; x++) {
      let t = (horizontal ? x : y) / (N - 1);
      if (dir === "left" || dir === "up") t = 1 - t;
      // Kurva halus (smoothstep) agar peralihan tidak bergaris.
      const s = t * t * (3 - 2 * t);
      const a = Math.round((from + (to - from) * s) * 255);
      raw.set([r, g, b, a], y * (1 + w * 4) + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array())]);
  gradCache.set(id, png);
  return png;
}

const alpha = (o: number | undefined) => Math.round((1 - (o ?? 1)) * 100);

// ---------------------------------------------------------------------------
// PPTX
// ---------------------------------------------------------------------------

export async function renderScenePptx(scene: Scene, images: DeckImages, title: string): Promise<Uint8Array> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = title;
  pptx.company = "Markethink";
  for (const sl of scene.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: sl.bg };
    for (const it of sl.items) drawPptx(pptx, slide, it, scene, images);
    if (sl.notes) slide.addNotes(sl.notes);
  }
  const out = (await pptx.write({ outputType: "uint8array" })) as Uint8Array;
  return out;
}

function drawPptx(pptx: PptxGenJS, slide: PptxGenJS.Slide, it: SceneItem, scene: Scene, images: DeckImages) {
  switch (it.t) {
    case "rect":
    case "ellipse": {
      const shape = it.t === "ellipse" ? pptx.ShapeType.ellipse : it.r ? pptx.ShapeType.roundRect : pptx.ShapeType.rect;
      slide.addShape(shape, {
        x: it.x,
        y: it.y,
        w: it.w,
        h: it.h,
        rectRadius: it.r,
        rotate: it.rot,
        fill: it.fill ? { color: it.fill, transparency: alpha(it.fo) } : { type: "none" },
        line: it.line ? { color: it.line, transparency: alpha(it.lo), width: it.lw ?? 0.75 } : { type: "none" },
      });
      return;
    }
    case "line": {
      const x = Math.min(it.x1, it.x2);
      const y = Math.min(it.y1, it.y2);
      slide.addShape(pptx.ShapeType.line, {
        x,
        y,
        w: Math.max(0.001, Math.abs(it.x2 - it.x1)),
        h: Math.max(0.001, Math.abs(it.y2 - it.y1)),
        flipV: (it.x2 - it.x1) * (it.y2 - it.y1) < 0,
        line: { color: it.color, width: it.lw, transparency: alpha(it.o) },
      });
      return;
    }
    case "grad":
      slide.addImage({ data: `image/png;base64,${gradientPng(it.color, it.from, it.to, it.dir).toString("base64")}`, x: it.x, y: it.y, w: it.w, h: it.h });
      return;
    case "img": {
      const img = images[it.key];
      if (!img) return;
      const data = `${img.mime};base64,${img.data}`;
      if (it.fit === "contain") {
        const sc = Math.min(it.w / img.width, it.h / img.height);
        slide.addImage({ data, x: it.x + (it.w - img.width * sc) / 2, y: it.y + (it.h - img.height * sc) / 2, w: img.width * sc, h: img.height * sc });
      } else {
        const sc = Math.max(it.w / img.width, it.h / img.height);
        const iw = img.width * sc;
        const ih = img.height * sc;
        slide.addImage({ data, x: it.x, y: it.y, w: iw, h: ih, sizing: { type: "crop", x: (iw - it.w) / 2, y: (ih - it.h) / 2, w: it.w, h: it.h } });
      }
      return;
    }
    case "text": {
      const f = scene.fonts[it.font];
      slide.addText(
        it.lines.map((l, k) => ({ text: l, options: { breakLine: k < it.lines.length - 1 } })),
        {
          x: it.x,
          y: it.y,
          w: it.w + 0.08,
          h: Math.max(it.h, (it.lines.length * it.size * it.lh) / 72),
          margin: 0,
          fontFace: f.family,
          bold: f.bold,
          fontSize: it.size,
          color: it.color,
          transparency: it.o !== undefined ? alpha(it.o) : undefined,
          charSpacing: it.ls,
          lineSpacing: it.size * it.lh,
          align: it.align ?? "left",
          valign: it.valign ?? "top",
          fit: "none",
          wrap: true,
        },
      );
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

const hexRgb = (hex: string) => rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);

/** Path kotak (sudut membulat bila r > 0); ox/oy = geser titik asal (untuk kotak yang diputar di titik tengahnya). */
function roundRectPath(w: number, h: number, r: number, ox = 0, oy = 0) {
  const k = Math.min(r, w / 2, h / 2);
  const X = (v: number) => v + ox;
  const Y = (v: number) => v + oy;
  if (!k) return `M ${X(0)} ${Y(0)} H ${X(w)} V ${Y(h)} H ${X(0)} Z`;
  return `M ${X(k)} ${Y(0)} H ${X(w - k)} Q ${X(w)} ${Y(0)} ${X(w)} ${Y(k)} V ${Y(h - k)} Q ${X(w)} ${Y(h)} ${X(w - k)} ${Y(h)} H ${X(k)} Q ${X(0)} ${Y(h)} ${X(0)} ${Y(h - k)} V ${Y(k)} Q ${X(0)} ${Y(0)} ${X(k)} ${Y(0)} Z`;
}

export async function renderScenePdf(scene: Scene, images: DeckImages, title: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(title);
  doc.setProducer("Markethink");
  const fonts = {} as Record<FontRole, PDFFont>;
  const embedded = new Map<string, PDFFont>();
  for (const role of ["head", "body", "strong"] as FontRole[]) {
    const file = scene.fonts[role].file;
    if (!embedded.has(file)) embedded.set(file, await doc.embedFont(loadDeckFont(file).bytes, { subset: true }));
    fonts[role] = embedded.get(file)!;
  }
  const imgCache = new Map<string, PDFImage | null>();
  const getImg = async (key: string) => {
    if (imgCache.has(key)) return imgCache.get(key)!;
    const src = images[key];
    let out: PDFImage | null = null;
    try {
      if (src?.mime.includes("png")) out = await doc.embedPng(Buffer.from(src.data, "base64"));
      else if (src?.mime.includes("jpeg") || src?.mime.includes("jpg")) out = await doc.embedJpg(Buffer.from(src.data, "base64"));
    } catch (err) {
      console.warn("[deck-pdf] gambar dilewati", key, err instanceof Error ? err.message : err);
    }
    imgCache.set(key, out);
    return out;
  };
  const gradCachePdf = new Map<string, PDFImage>();
  const PW = scene.w * 72;
  const PH = scene.h * 72;
  for (const sl of scene.slides) {
    const page = doc.addPage([PW, PH]);
    page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: hexRgb(sl.bg) });
    for (const it of sl.items) {
      if (it.t === "img") {
        const img = await getImg(it.key);
        if (img) drawPdfImage(page, img, it, PH);
      } else if (it.t === "grad") {
        const id = `${it.color}-${it.from}-${it.to}-${it.dir}`;
        let g = gradCachePdf.get(id);
        if (!g) {
          g = await doc.embedPng(gradientPng(it.color, it.from, it.to, it.dir));
          gradCachePdf.set(id, g);
        }
        page.drawImage(g, { x: it.x * 72, y: PH - (it.y + it.h) * 72, width: it.w * 72, height: it.h * 72 });
      } else drawPdf(page, it, PH, fonts, scene);
    }
  }
  return doc.save();
}

function drawPdfImage(page: PDFPage, img: PDFImage, it: Extract<SceneItem, { t: "img" }>, PH: number) {
  const bx = it.x * 72;
  const by = PH - (it.y + it.h) * 72;
  const bw = it.w * 72;
  const bh = it.h * 72;
  const sc = it.fit === "contain" ? Math.min(bw / img.width, bh / img.height) : Math.max(bw / img.width, bh / img.height);
  const iw = img.width * sc;
  const ih = img.height * sc;
  page.pushOperators(pushGraphicsState(), rectangle(bx, by, bw, bh), clip(), endPath());
  page.drawImage(img, { x: bx + (bw - iw) / 2, y: by + (bh - ih) / 2, width: iw, height: ih });
  page.pushOperators(popGraphicsState());
}

function drawPdf(page: PDFPage, it: SceneItem, PH: number, fonts: Record<FontRole, PDFFont>, scene: Scene) {
  switch (it.t) {
    case "rect": {
      const style = {
        color: it.fill ? hexRgb(it.fill) : undefined,
        opacity: it.fill ? (it.fo ?? 1) : 0,
        borderColor: it.line ? hexRgb(it.line) : undefined,
        borderOpacity: it.line ? (it.lo ?? 1) : undefined,
        borderWidth: it.line ? (it.lw ?? 0.75) : 0,
      };
      if (!it.fill && !it.line) return;
      if (it.rot)
        page.drawSvgPath(roundRectPath(it.w * 72, it.h * 72, (it.r ?? 0) * 72, (-it.w * 72) / 2, (-it.h * 72) / 2), {
          x: (it.x + it.w / 2) * 72,
          y: PH - (it.y + it.h / 2) * 72,
          rotate: degrees(-it.rot),
          ...style,
        });
      else if (it.r) page.drawSvgPath(roundRectPath(it.w * 72, it.h * 72, it.r * 72), { x: it.x * 72, y: PH - it.y * 72, ...style });
      else page.drawRectangle({ x: it.x * 72, y: PH - (it.y + it.h) * 72, width: it.w * 72, height: it.h * 72, ...style });
      return;
    }
    case "ellipse":
      if (!it.fill && !it.line) return;
      page.drawEllipse({
        x: (it.x + it.w / 2) * 72,
        y: PH - (it.y + it.h / 2) * 72,
        xScale: (it.w / 2) * 72,
        yScale: (it.h / 2) * 72,
        color: it.fill ? hexRgb(it.fill) : undefined,
        opacity: it.fill ? (it.fo ?? 1) : 0,
        borderColor: it.line ? hexRgb(it.line) : undefined,
        borderOpacity: it.line ? (it.lo ?? 1) : undefined,
        borderWidth: it.line ? (it.lw ?? 0.75) : 0,
      });
      return;
    case "line":
      page.drawLine({ start: { x: it.x1 * 72, y: PH - it.y1 * 72 }, end: { x: it.x2 * 72, y: PH - it.y2 * 72 }, thickness: it.lw, color: hexRgb(it.color), opacity: it.o ?? 1 });
      return;
    case "text": {
      const font = fonts[it.font];
      const fk = loadDeckFont(scene.fonts[it.font].file).fk;
      const ls = it.ls ?? 0;
      const lineH = it.size * it.lh;
      const total = lineH * it.lines.length;
      const boxTop = it.y * 72;
      const top = it.valign === "middle" ? boxTop + (it.h * 72 - total) / 2 : it.valign === "bottom" ? boxTop + it.h * 72 - total : boxTop;
      const base = baselineOffset(fk, it.size, it.lh);
      if (ls) page.pushOperators(pushGraphicsState(), setCharacterSpacing(ls));
      it.lines.forEach((line, k) => {
        const tw = font.widthOfTextAtSize(line, it.size) + ls * Math.max(0, line.length - 1);
        const x = it.align === "center" ? it.x * 72 + (it.w * 72 - tw) / 2 : it.align === "right" ? (it.x + it.w) * 72 - tw : it.x * 72;
        page.drawText(line, { x, y: PH - (top + k * lineH + base), size: it.size, font, color: hexRgb(it.color), opacity: it.o ?? 1 });
      });
      if (ls) page.pushOperators(popGraphicsState());
      return;
    }
  }
}
