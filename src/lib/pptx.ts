import "server-only";
import PptxGenJS from "pptxgenjs";
import { z } from "zod";
import { PPTX_ICONS, PPTX_ICON_NAMES, type PptxIcon } from "./pptx-icons";
import { HERO_OVERLAY_PNG } from "./pptx-overlay";

// ---------------------------------------------------------------------------
// Skema isi presentasi (diisi oleh AI lewat tool create_presentation)
// ---------------------------------------------------------------------------

// Longgar: ikon yang tidak dikenal diganti "sparkles" saat render, supaya tool tidak gagal validasi.
const icon = z.string().max(30).describe(`Nama ikon, salah satu: ${PPTX_ICON_NAMES.join(", ")}`);
const short = (n: number) => z.string().max(n);

export const slideSchema = z.object({
  layout: z
    .enum([
      "agenda",
      "section",
      "bullets",
      "cards",
      "stats",
      "chart",
      "timeline",
      "comparison",
      "table",
      "quote",
      "image_text",
      "product",
      "gallery",
      "closing",
    ])
    .describe(
      "agenda = daftar isi bernomor; section = pembuka bab; bullets = poin dengan ikon; cards = 2-6 kartu ikon+judul+teks (fitur, pilar, strategi); stats = 2-4 angka besar; chart = grafik data (bar/line/pie/doughnut) + insight; timeline = 3-6 langkah/fase/jadwal; comparison = 2 kolom perbandingan (sebelum/sesudah, kita vs kompetitor); table = tabel data; quote = kutipan/insight kunci; image_text = gambar besar + teks; product = showcase produk/jasa: foto produk besar + 2-4 keunggulan (isi cards); gallery = 2-3 gambar berkaption (moodboard, contoh konten, lokasi, aktivasi); closing = penutup/CTA/kontak",
    ),
  kicker: short(40).optional().describe("Label kecil di atas judul, mis. 'STRATEGI' atau 'BAB 2'"),
  title: z.string().min(1).max(90).describe("Judul slide: singkat & tajam (maks ± 8 kata), bukan kalimat panjang"),
  subtitle: short(160).optional().describe("1 kalimat pendukung/insight utama slide"),
  bullets: z
    .array(short(140))
    .max(6)
    .optional()
    .describe("Untuk bullets/closing/agenda/image_text/chart(insight)/stats(takeaway): maks 6 poin, masing-masing ≤ 15 kata"),
  cards: z
    .array(z.object({ icon, title: short(40), text: short(160) }))
    .min(2)
    .max(6)
    .optional()
    .describe("Untuk layout cards: 2-6 kartu"),
  stats: z
    .array(z.object({ value: short(12), label: short(60), note: short(80).optional() }))
    .min(2)
    .max(4)
    .optional()
    .describe("Untuk layout stats, mis. {value:'68%', label:'Gen Z belanja via TikTok', note:'Sumber: ...'}"),
  chart: z
    .object({
      type: z.enum(["bar", "line", "pie", "doughnut"]),
      labels: z.array(short(30)).min(2).max(12),
      series: z
        .array(z.object({ name: short(30), values: z.array(z.number()) }))
        .min(1)
        .max(3)
        .describe("Jumlah values tiap seri = jumlah labels. pie/doughnut: 1 seri saja"),
      unit: short(10).optional().describe("Satuan, mis. '%', 'jt', 'Rp'"),
    })
    .optional()
    .describe("Untuk layout chart. Pakai angka nyata dari data/riset; bila perkiraan, sebut di subtitle"),
  steps: z
    .array(z.object({ title: short(40), text: short(120) }))
    .min(3)
    .max(6)
    .optional()
    .describe("Untuk layout timeline: 3-6 langkah/fase berurutan"),
  columns: z
    .array(z.object({ heading: short(40), bullets: z.array(short(110)).max(5) }))
    .length(2)
    .optional()
    .describe("Untuk layout comparison: tepat 2 kolom (kolom kanan = yang direkomendasikan)"),
  table: z
    .object({ headers: z.array(short(30)).min(2).max(5), rows: z.array(z.array(short(60))).min(1).max(7) })
    .optional()
    .describe("Untuk layout table"),
  quote: short(240).optional().describe("Untuk layout quote"),
  attribution: short(60).optional(),
  image_prompt: short(400)
    .optional()
    .describe(
      "Visual slide (wajib untuk image_text & product; dianjurkan untuk section, closing, cards, stats, quote, bullets bila mempercantik): deskripsi foto/ilustrasi dalam bahasa Inggris, spesifik ke brand/produk/suasana, tanpa teks di gambar",
    ),
  image_id: short(40)
    .optional()
    .describe(
      "ID gambar milik user (dari '[Gambar dari user: … — id: …]' atau gambar yang sudah kamu buat) untuk dipakai sebagai visual slide — utamakan foto produk/brand asli user dibanding image_prompt",
    ),
  gallery: z
    .array(z.object({ caption: short(80), image_prompt: short(300).optional(), image_id: short(40).optional() }))
    .min(2)
    .max(3)
    .optional()
    .describe("Untuk layout gallery: 2-3 gambar (image_id foto user atau image_prompt) + caption"),
  notes: short(1500).optional().describe("Catatan pembicara (speaker notes) yang membantu presenter"),
});

export const THEME_NAMES = ["midnight", "clean", "sunset", "forest", "ocean", "luxe", "coral", "corporate"] as const;

export const presentationSchema = z.object({
  title: z.string().min(1).max(90).describe("Judul presentasi"),
  subtitle: short(160).optional().describe("Subjudul, mis. nama brand / tujuan / tanggal"),
  theme: z
    .enum(THEME_NAMES)
    .default("midnight")
    .describe(
      "midnight = gelap ungu modern; clean = putih minimalis; sunset = hangat oranye (F&B, lifestyle); forest = hijau natural; ocean = biru tua segar; luxe = hitam-emas premium; coral = cerah playful (Gen Z); corporate = biru profesional (B2B)",
    ),
  brand_color: z
    .string()
    .regex(/^#?[0-9a-fA-F]{6}$/)
    .optional()
    .describe("Warna utama brand (hex, mis. #E11D48) bila diketahui"),
  cover_image_prompt: short(400)
    .optional()
    .describe("Hero visual cover (selalu isi): deskripsi foto/ilustrasi sinematik dalam bahasa Inggris yang menggambarkan brand/topik, tanpa teks"),
  cover_image_id: short(40).optional().describe("ID gambar user untuk cover (mis. foto produk/brand asli), diutamakan dibanding prompt"),
  cover_style: z
    .enum(["hero", "split"])
    .default("hero")
    .describe("hero = foto penuh satu slide dengan judul di atasnya (paling memukau); split = foto di separuh kanan"),
  slides: z.array(slideSchema).min(3).max(20).describe("Isi slide setelah cover (cover dibuat otomatis)"),
});

export type PresentationInput = z.infer<typeof presentationSchema>;
export type SlideInput = z.infer<typeof slideSchema>;

/** Gambar yang sudah dibuat untuk deck: key "cover" atau indeks slide (string). */
export type DeckImages = Record<string, { data: string; mime: string; width: number; height: number }>;

// ---------------------------------------------------------------------------
// Tema
// ---------------------------------------------------------------------------

interface Theme {
  dark: boolean;
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  onAccent: string;
}

const THEMES: Record<(typeof THEME_NAMES)[number], Theme> = {
  midnight: { dark: true, bg: "0B1020", surface: "151B2E", surface2: "1F2742", text: "F5F7FB", muted: "9AA4BF", accent: "7C5CFF", accent2: "22D3EE", onAccent: "FFFFFF" },
  clean: { dark: false, bg: "FFFFFF", surface: "F3F5FA", surface2: "E6EAF3", text: "0F172A", muted: "64748B", accent: "4F46E5", accent2: "0EA5E9", onAccent: "FFFFFF" },
  sunset: { dark: false, bg: "FFF9F3", surface: "FFEEDD", surface2: "FFE0C2", text: "3B1708", muted: "8A4B2A", accent: "EA580C", accent2: "DB2777", onAccent: "FFFFFF" },
  forest: { dark: false, bg: "F6FAF5", surface: "E6F0E3", surface2: "D3E5CE", text: "13261A", muted: "4F6B57", accent: "15803D", accent2: "CA8A04", onAccent: "FFFFFF" },
  ocean: { dark: true, bg: "06202E", surface: "0C3346", surface2: "114560", text: "EAF6FB", muted: "8FB8C9", accent: "06B6D4", accent2: "F59E0B", onAccent: "042029" },
  luxe: { dark: true, bg: "101010", surface: "1B1B1B", surface2: "272727", text: "F5F1E8", muted: "A8A29E", accent: "C9A227", accent2: "E7D9B0", onAccent: "141414" },
  coral: { dark: false, bg: "FFFFFF", surface: "FFF1F2", surface2: "FFE0E4", text: "1F1235", muted: "6B5B7B", accent: "F43F5E", accent2: "8B5CF6", onAccent: "FFFFFF" },
  corporate: { dark: false, bg: "FFFFFF", surface: "EEF2F7", surface2: "DDE5EF", text: "0B1F3A", muted: "5B6B82", accent: "0B5FFF", accent2: "00B894", onAccent: "FFFFFF" },
};

function resolveTheme(input: PresentationInput): Theme {
  const base = THEMES[input.theme] ?? THEMES.midnight;
  if (!input.brand_color) return base;
  const accent = input.brand_color.replace("#", "").toUpperCase();
  return { ...base, accent, onAccent: luminance(accent) > 0.55 ? "111111" : "FFFFFF" };
}

function luminance(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ---------------------------------------------------------------------------
// Konstanta & helper tata letak
// ---------------------------------------------------------------------------

const W = 13.333;
const H = 7.5;
const M = 0.65; // margin
const HEAD = "Calibri";
const BODY = "Calibri";

type Slide = PptxGenJS.Slide;

interface Ctx {
  pptx: PptxGenJS;
  t: Theme;
  deckTitle: string;
  total: number;
  images: DeckImages;
}

/** Perkirakan ukuran font agar teks muat di kotak (tanpa bergantung pada auto-fit PowerPoint). */
function fit(text: string, base: number, boxW: number, boxH: number, min = 10) {
  for (let size = base; size > min; size -= 1) {
    const charsPerLine = Math.max(1, Math.floor((boxW * 72) / (size * 0.52)));
    const lines = text
      .split("\n")
      .reduce((n, para) => n + Math.max(1, Math.ceil(para.length / charsPerLine)), 0);
    if (lines * size * 1.22 <= boxH * 72) return size;
  }
  return min;
}

function bg(slide: Slide, color: string) {
  slide.background = { color };
}

function iconTile(c: Ctx, slide: Slide, name: string | undefined, x: number, y: number, size: number, fill = c.t.accent) {
  slide.addShape(c.pptx.ShapeType.roundRect, { x, y, w: size, h: size, rectRadius: size * 0.28, fill: { color: fill }, line: { color: fill } });
  const png = PPTX_ICONS[(name ?? "sparkles") as PptxIcon] ?? PPTX_ICONS.sparkles;
  const s = size * 0.56;
  slide.addImage({ data: `image/png;base64,${png}`, x: x + (size - s) / 2, y: y + (size - s) / 2, w: s, h: s });
}

function header(c: Ctx, slide: Slide, s: { kicker?: string; title: string; subtitle?: string }, w = W - 2 * M) {
  let y = 0.55;
  if (s.kicker) {
    slide.addText(s.kicker.toUpperCase(), { x: M, y, w, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: c.t.accent, charSpacing: 3 });
    y += 0.34;
  }
  const size = fit(s.title, 34, w, 1.0, 22);
  slide.addText(s.title, { x: M, y, w, h: 1.0, fontFace: HEAD, fontSize: size, bold: true, color: c.t.text, valign: "top", margin: 0 });
  y += size > 28 ? 0.82 : 0.68;
  if (s.subtitle) {
    slide.addText(s.subtitle, { x: M, y: y + 0.05, w, h: 0.55, fontFace: BODY, fontSize: fit(s.subtitle, 17, w, 0.55, 12), color: c.t.muted, valign: "top", margin: 0 });
    y += 0.65;
  }
  return y + 0.3;
}

function footer(c: Ctx, slide: Slide, page: number, x0 = M, showPage = true) {
  slide.addShape(c.pptx.ShapeType.rect, { x: x0, y: H - 0.42, w: 0.35, h: 0.04, fill: { color: c.t.accent }, line: { color: c.t.accent } });
  slide.addText(c.deckTitle, { x: x0 + 0.45, y: H - 0.55, w: 6, h: 0.3, fontFace: BODY, fontSize: 9, color: c.t.muted, margin: 0 });
  if (!showPage) return;
  slide.addText(`${String(page).padStart(2, "0")} / ${String(c.total).padStart(2, "0")}`, {
    x: W - M - 1.5, y: H - 0.55, w: 1.5, h: 0.3, align: "right", fontFace: BODY, fontSize: 9, color: c.t.muted, margin: 0,
  });
}

/** Gambar AI dipotong rapi (cover) ke dalam kotak. */
function coverImage(c: Ctx, slide: Slide, key: string, x: number, y: number, w: number, h: number) {
  const img = c.images[key];
  if (!img) return false;
  const scale = Math.max(w / img.width, h / img.height);
  const iw = img.width * scale;
  const ih = img.height * scale;
  // w/h = ukuran gambar setelah diskalakan; sizing.crop = bagian tengah yang ditampilkan seukuran kotak.
  slide.addImage({
    data: `${img.mime};base64,${img.data}`,
    x,
    y,
    w: iw,
    h: ih,
    sizing: { type: "crop", x: (iw - w) / 2, y: (ih - h) / 2, w, h },
  });
  return true;
}

const hasImage = (c: Ctx, key: string) => Boolean(c.images[key]);

/** Gambar utuh (tidak dipotong) di tengah kotak — untuk foto produk. */
function containImage(c: Ctx, slide: Slide, key: string, x: number, y: number, w: number, h: number) {
  const img = c.images[key];
  if (!img) return false;
  const scale = Math.min(w / img.width, h / img.height);
  const iw = img.width * scale;
  const ih = img.height * scale;
  slide.addImage({ data: `${img.mime};base64,${img.data}`, x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih });
  return true;
}

/** Foto penuh satu slide + lapisan gelap agar teks putih terbaca. */
function heroBackground(c: Ctx, slide: Slide, key: string) {
  if (!coverImage(c, slide, key, 0, 0, W, H)) return false;
  // Lapisan gradasi gelap (PNG transparan) agar judul putih terbaca, foto tetap terlihat di kanan.
  slide.addImage({ data: `image/png;base64,${HERO_OVERLAY_PNG}`, x: 0, y: 0, w: W, h: H });
  return true;
}

function decorCircles(c: Ctx, slide: Slide, side: "right" | "left" = "right") {
  const x = side === "right" ? W - 4.2 : -2.2;
  slide.addShape(c.pptx.ShapeType.ellipse, { x, y: -1.6, w: 6.4, h: 6.4, fill: { color: c.t.accent, transparency: 82 }, line: { color: c.t.accent, transparency: 100 } });
  slide.addShape(c.pptx.ShapeType.ellipse, { x: x + 2.4, y: 3.6, w: 4.2, h: 4.2, fill: { color: c.t.accent2, transparency: 85 }, line: { color: c.t.accent2, transparency: 100 } });
}

// ---------------------------------------------------------------------------
// Layout slide
// ---------------------------------------------------------------------------

function cover(c: Ctx, input: PresentationInput) {
  const slide = c.pptx.addSlide();
  bg(slide, c.t.bg);
  if (input.cover_style !== "split" && hasImage(c, "cover")) {
    heroBackground(c, slide, "cover");
    const tw = W * 0.6;
    slide.addShape(c.pptx.ShapeType.roundRect, { x: M, y: 2.0, w: 0.9, h: 0.09, rectRadius: 0.04, fill: { color: c.t.accent }, line: { color: c.t.accent } });
    slide.addText(input.title, { x: M, y: 2.3, w: tw, h: 2.5, fontFace: HEAD, fontSize: fit(input.title, 50, tw, 2.5, 30), bold: true, color: "FFFFFF", valign: "top", margin: 0 });
    if (input.subtitle) {
      slide.addText(input.subtitle, { x: M, y: 4.9, w: tw, h: 1.0, fontFace: BODY, fontSize: fit(input.subtitle, 19, tw, 1.0, 12), color: "E5E7EB", valign: "top", margin: 0 });
    }
    slide.addText("Dibuat dengan Markethink", { x: M, y: H - 0.8, w: 5, h: 0.3, fontFace: BODY, fontSize: 10, color: "D1D5DB", margin: 0 });
    return;
  }
  const hasImg = coverImage(c, slide, "cover", W * 0.5, 0, W * 0.5, H);
  if (hasImg) {
    slide.addShape(c.pptx.ShapeType.rect, { x: W * 0.5 - 0.08, y: 0, w: 0.08, h: H, fill: { color: c.t.accent }, line: { color: c.t.accent } });
  } else {
    decorCircles(c, slide);
  }
  const tw = hasImg ? W * 0.5 - M - 0.5 : W * 0.62;
  slide.addShape(c.pptx.ShapeType.roundRect, { x: M, y: 1.55, w: 0.9, h: 0.09, rectRadius: 0.04, fill: { color: c.t.accent }, line: { color: c.t.accent } });
  const size = fit(input.title, 46, tw, 2.6, 28);
  slide.addText(input.title, { x: M, y: 1.85, w: tw, h: 2.6, fontFace: HEAD, fontSize: size, bold: true, color: c.t.text, valign: "top", margin: 0 });
  if (input.subtitle) {
    slide.addText(input.subtitle, { x: M, y: 4.6, w: tw, h: 1.1, fontFace: BODY, fontSize: fit(input.subtitle, 18, tw, 1.1, 12), color: c.t.muted, valign: "top", margin: 0 });
  }
  slide.addText("Dibuat dengan Markethink", { x: M, y: H - 0.8, w: 5, h: 0.3, fontFace: BODY, fontSize: 10, color: c.t.muted, margin: 0 });
}

function agenda(c: Ctx, slide: Slide, s: SlideInput, top: number) {
  const items = (s.bullets ?? []).slice(0, 8);
  const cols = items.length > 4 ? 2 : 1;
  const colW = (W - 2 * M - (cols - 1) * 0.6) / cols;
  const perCol = Math.ceil(items.length / cols);
  const rowH = Math.min(1.05, (H - top - 0.9) / perCol);
  items.forEach((item, i) => {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const x = M + col * (colW + 0.6);
    const y = top + row * rowH;
    slide.addText(String(i + 1).padStart(2, "0"), { x, y, w: 0.9, h: rowH * 0.8, fontFace: HEAD, fontSize: 30, bold: true, color: c.t.accent, valign: "middle", margin: 0 });
    slide.addText(item, { x: x + 1.0, y, w: colW - 1.0, h: rowH * 0.8, fontFace: BODY, fontSize: fit(item, 21, colW - 1, rowH * 0.8, 13), color: c.t.text, valign: "middle", margin: 0 });
    slide.addShape(c.pptx.ShapeType.line, { x: x + 1.0, y: y + rowH * 0.88, w: colW - 1.0, h: 0, line: { color: c.t.surface2, width: 1 } });
  });
}

function section(c: Ctx, s: SlideInput, idx: number, sectionNo: number) {
  const slide = c.pptx.addSlide();
  bg(slide, c.t.dark ? c.t.surface : c.t.accent);
  const fg = c.t.dark ? c.t.text : c.t.onAccent;
  const hasImg = coverImage(c, slide, String(idx), W * 0.55, 0, W * 0.45, H);
  const tw = hasImg ? W * 0.55 - M - 0.4 : W - 2 * M;
  slide.addText(String(sectionNo).padStart(2, "0"), {
    x: M - 0.1, y: 0.6, w: 4, h: 2.4, fontFace: HEAD, fontSize: 140, bold: true, color: c.t.dark ? c.t.accent : c.t.onAccent, transparency: c.t.dark ? 0 : 55, margin: 0,
  });
  slide.addText(s.title, { x: M, y: 3.35, w: tw, h: 1.6, fontFace: HEAD, fontSize: fit(s.title, 40, tw, 1.6, 26), bold: true, color: fg, valign: "top", margin: 0 });
  if (s.subtitle) {
    slide.addText(s.subtitle, { x: M, y: 5.05, w: tw, h: 1.0, fontFace: BODY, fontSize: 17, color: fg, transparency: 15, valign: "top", margin: 0 });
  }
  return slide;
}

function bullets(c: Ctx, slide: Slide, s: SlideInput, top: number, idx: number) {
  const items = (s.bullets ?? []).slice(0, 6);
  const hasImg = coverImage(c, slide, String(idx), W * 0.6, top - 0.1, W * 0.4 - M, H - top - 0.75);
  const areaW = hasImg ? W * 0.6 - M - 0.4 : W - 2 * M;
  const cols = !hasImg && items.length > 4 ? 2 : 1;
  const colW = (areaW - (cols - 1) * 0.5) / cols;
  const perCol = Math.ceil(items.length / cols);
  const rowH = Math.min(1.2, (H - top - 0.8) / Math.max(perCol, 1));
  items.forEach((b, i) => {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    const x = M + col * (colW + 0.5);
    const y = top + row * rowH;
    if (!hasImg) {
      // Baris kartu penuh: terlihat rapi walau tanpa gambar.
      const rh = rowH - 0.18;
      slide.addShape(c.pptx.ShapeType.roundRect, { x, y, w: colW, h: rh, rectRadius: 0.12, fill: { color: c.t.surface }, line: { color: c.t.surface2, width: 0.75 } });
      slide.addShape(c.pptx.ShapeType.rect, { x, y: y + 0.12, w: 0.07, h: rh - 0.24, fill: { color: i % 2 ? c.t.accent2 : c.t.accent }, line: { color: i % 2 ? c.t.accent2 : c.t.accent } });
      iconTile(c, slide, "circle-check", x + 0.3, y + (rh - 0.5) / 2, 0.5, i % 2 ? c.t.accent2 : c.t.accent);
      slide.addText(b, { x: x + 1.0, y, w: colW - 1.3, h: rh, fontFace: BODY, fontSize: fit(b, 20, colW - 1.3, rh - 0.1, 12), color: c.t.text, valign: "middle", margin: 0 });
      return;
    }
    iconTile(c, slide, "circle-check", x, y + 0.02, 0.5, i % 2 ? c.t.accent2 : c.t.accent);
    slide.addText(b, { x: x + 0.72, y, w: colW - 0.72, h: rowH - 0.15, fontFace: BODY, fontSize: fit(b, 21, colW - 0.72, rowH - 0.15, 12), color: c.t.text, valign: "top", margin: 0 });
  });
}

function cards(c: Ctx, slide: Slide, s: SlideInput, top: number, idx = -1) {
  const list = (s.cards ?? []).slice(0, 6);
  const n = list.length;
  // Dengan visual: foto di kiri, kartu 2 kolom di kanan.
  const withImg = coverImage(c, slide, String(idx), M, top, 4.0, H - top - 0.8);
  const left = withImg ? M + 4.3 : M;
  const areaW = W - M - left;
  const cols = withImg ? (n <= 2 ? 1 : 2) : n <= 3 ? n : n === 4 ? 4 : 3;
  const rows = Math.ceil(n / cols);
  const gap = 0.3;
  const cw = (areaW - (cols - 1) * gap) / cols;
  const ch = Math.min(rows === 1 ? 3.8 : 9, (H - top - 0.8 - (rows - 1) * gap) / rows);
  list.forEach((card, i) => {
    const x = left + (i % cols) * (cw + gap);
    const y = top + Math.floor(i / cols) * (ch + gap);
    slide.addShape(c.pptx.ShapeType.roundRect, {
      x, y, w: cw, h: ch, rectRadius: 0.14, fill: { color: c.t.surface }, line: { color: c.t.surface2, width: 0.75 },
    });
    const pad = 0.28;
    const fill = i % 2 ? c.t.accent2 : c.t.accent;
    if (rows > 1) {
      // Kartu pendek (2 baris): ikon di samping judul agar teks tetap besar.
      iconTile(c, slide, card.icon, x + pad, y + pad, 0.52, fill);
      slide.addText(card.title, { x: x + pad + 0.68, y: y + pad, w: cw - 2 * pad - 0.68, h: 0.52, fontFace: HEAD, fontSize: fit(card.title, 19, cw - 2 * pad - 0.68, 0.52, 12), bold: true, color: c.t.text, valign: "middle", margin: 0 });
      const bodyH = ch - 0.68 - 2 * pad;
      slide.addText(card.text, { x: x + pad, y: y + pad + 0.68, w: cw - 2 * pad, h: bodyH, fontFace: BODY, fontSize: fit(card.text, 15, cw - 2 * pad, bodyH, 10), color: c.t.muted, valign: "top", margin: 0 });
    } else {
      iconTile(c, slide, card.icon, x + pad, y + pad, 0.66, fill);
      const ty = y + pad + 0.85;
      slide.addText(card.title, { x: x + pad, y: ty, w: cw - 2 * pad, h: 0.55, fontFace: HEAD, fontSize: fit(card.title, 21, cw - 2 * pad, 0.55, 13), bold: true, color: c.t.text, valign: "top", margin: 0 });
      const bodyH = Math.max(0.5, ch - (ty - y) - 0.6 - pad);
      slide.addText(card.text, { x: x + pad, y: ty + 0.6, w: cw - 2 * pad, h: bodyH, fontFace: BODY, fontSize: fit(card.text, 16, cw - 2 * pad, bodyH, 10), color: c.t.muted, valign: "top", margin: 0 });
    }
  });
}

function stats(c: Ctx, slide: Slide, s: SlideInput, top: number, idx = -1) {
  const list = (s.stats ?? []).slice(0, 4);
  if (coverImage(c, slide, String(idx), W * 0.62, 0, W * 0.38, H)) {
    // Dengan visual: angka dalam grid 2 kolom di kiri, foto penuh tinggi di kanan.
    const areaW = W * 0.62 - M - 0.4;
    const cols = list.length > 2 ? 2 : 1;
    const gap = 0.3;
    const cw = (areaW - (cols - 1) * gap) / cols;
    const rows = Math.ceil(list.length / cols);
    const ch = Math.min(2.4, (H - top - 0.8 - (rows - 1) * gap) / rows);
    list.forEach((st, i) => {
      const x = M + (i % cols) * (cw + gap);
      const y = top + Math.floor(i / cols) * (ch + gap);
      const color = i % 2 ? c.t.accent2 : c.t.accent;
      slide.addShape(c.pptx.ShapeType.roundRect, { x, y, w: cw, h: ch, rectRadius: 0.14, fill: { color: c.t.surface }, line: { color: c.t.surface2, width: 0.75 } });
      slide.addText(st.value, { x: x + 0.3, y: y + 0.2, w: cw - 0.6, h: ch * 0.5, fontFace: HEAD, fontSize: fit(st.value, 48, cw - 0.6, ch * 0.5, 26), bold: true, color, valign: "middle", margin: 0 });
      slide.addText(st.label, { x: x + 0.3, y: y + 0.2 + ch * 0.5, w: cw - 0.6, h: ch * 0.4 - 0.2, fontFace: BODY, fontSize: fit(st.label, 17, cw - 0.6, ch * 0.4 - 0.2, 11), bold: true, color: c.t.text, valign: "top", margin: 0 });
    });
    return;
  }
  const takeaway = s.bullets?.length ? s.bullets.slice(0, 2) : [];
  const gap = 0.3;
  const cw = (W - 2 * M - (list.length - 1) * gap) / list.length;
  const ch = takeaway.length ? 2.6 : Math.min(3.4, H - top - 0.9);
  list.forEach((st, i) => {
    const x = M + i * (cw + gap);
    const color = i % 2 ? c.t.accent2 : c.t.accent;
    slide.addShape(c.pptx.ShapeType.roundRect, { x, y: top, w: cw, h: ch, rectRadius: 0.14, fill: { color: c.t.surface }, line: { color: c.t.surface2, width: 0.75 } });
    slide.addShape(c.pptx.ShapeType.rect, { x: x + 0.3, y: top + 0.3, w: 0.6, h: 0.07, fill: { color }, line: { color } });
    slide.addText(st.value, { x: x + 0.3, y: top + 0.5, w: cw - 0.6, h: 1.2, fontFace: HEAD, fontSize: fit(st.value, 60, cw - 0.6, 1.2, 30), bold: true, color, valign: "middle", margin: 0 });
    slide.addText(st.label, { x: x + 0.3, y: top + 1.7, w: cw - 0.6, h: 0.6, fontFace: BODY, fontSize: fit(st.label, 18, cw - 0.6, 0.6, 11), bold: true, color: c.t.text, valign: "top", margin: 0 });
    if (st.note) slide.addText(st.note, { x: x + 0.3, y: top + 2.25, w: cw - 0.6, h: ch - 2.35, fontFace: BODY, fontSize: 13, color: c.t.muted, valign: "top", margin: 0 });
  });
  if (takeaway.length) {
    const y = top + ch + 0.35;
    const h = H - y - 0.8;
    slide.addShape(c.pptx.ShapeType.roundRect, { x: M, y, w: W - 2 * M, h, rectRadius: 0.12, fill: { color: c.t.accent, transparency: c.t.dark ? 70 : 88 }, line: { color: c.t.accent, transparency: 100 } });
    iconTile(c, slide, "lightbulb", M + 0.3, y + (h - 0.55) / 2, 0.55);
    slide.addText(takeaway.join("\n"), { x: M + 1.1, y, w: W - 2 * M - 1.4, h, fontFace: BODY, fontSize: fit(takeaway.join("\n"), 19, W - 2 * M - 1.4, h - 0.2, 12), color: c.t.text, valign: "middle", margin: 0 });
  }
}

function chart(c: Ctx, slide: Slide, s: SlideInput, top: number) {
  const ch = s.chart;
  if (!ch) return bullets(c, slide, s, top, -1);
  const insights = (s.bullets ?? []).slice(0, 4);
  const cw = insights.length ? W * 0.6 - M : W - 2 * M;
  const h = H - top - 0.75;
  const colors = [c.t.accent, c.t.accent2, c.t.muted, "F59E0B", "10B981", "EF4444"];
  const pie = ch.type === "pie" || ch.type === "doughnut";
  const series = (pie ? ch.series.slice(0, 1) : ch.series).map((se) => ({
    name: se.name,
    labels: ch.labels,
    values: ch.labels.map((_, i) => se.values[i] ?? 0),
  }));
  const type =
    ch.type === "bar" ? c.pptx.ChartType.bar : ch.type === "line" ? c.pptx.ChartType.line : ch.type === "pie" ? c.pptx.ChartType.pie : c.pptx.ChartType.doughnut;
  slide.addShape(c.pptx.ShapeType.roundRect, { x: M, y: top, w: cw, h, rectRadius: 0.14, fill: { color: c.t.surface }, line: { color: c.t.surface2, width: 0.75 } });
  slide.addChart(type, series, {
    x: M + 0.2, y: top + 0.2, w: cw - 0.4, h: h - 0.4,
    chartColors: pie ? colors.slice(0, ch.labels.length) : colors.slice(0, series.length),
    showLegend: pie || series.length > 1,
    legendPos: "b",
    legendColor: c.t.muted,
    legendFontSize: 11,
    legendFontFace: BODY,
    catAxisLabelColor: c.t.muted,
    valAxisLabelColor: c.t.muted,
    catAxisLabelFontSize: 13,
    valAxisLabelFontSize: 11,
    catAxisLabelFontFace: BODY,
    valAxisLabelFontFace: BODY,
    valGridLine: { color: c.t.surface2, size: 0.75 },
    catGridLine: { style: "none" },
    catAxisLineShow: false,
    valAxisLineShow: false,
    showValue: !pie && series.length === 1 && ch.labels.length <= 8,
    dataLabelColor: c.t.text,
    dataLabelFontSize: 12,
    dataLabelFormatCode: ch.unit === "%" ? '0"%"' : "#,##0.##",
    showPercent: pie,
    holeSize: 58,
    barGapWidthPct: 60,
    lineSize: 3,
    lineDataSymbolSize: 8,
    ...(ch.type === "bar" ? { barDir: "col" as const } : {}),
  });
  if (insights.length) {
    const x = W * 0.6 + 0.2;
    const w = W - x - M;
    slide.addText("INSIGHT", { x, y: top, w, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: c.t.accent, charSpacing: 3, margin: 0 });
    const rowH = (h - 0.45) / insights.length;
    insights.forEach((b, i) => {
      const y = top + 0.45 + i * rowH;
      slide.addShape(c.pptx.ShapeType.rect, { x, y: y + 0.05, w: 0.06, h: Math.min(rowH - 0.25, 0.9), fill: { color: i % 2 ? c.t.accent2 : c.t.accent }, line: { color: i % 2 ? c.t.accent2 : c.t.accent } });
      slide.addText(b, { x: x + 0.25, y, w: w - 0.25, h: rowH - 0.15, fontFace: BODY, fontSize: fit(b, 18, w - 0.25, rowH - 0.15, 11), color: c.t.text, valign: "top", margin: 0 });
    });
  }
}

function timeline(c: Ctx, slide: Slide, s: SlideInput, top: number) {
  const steps = (s.steps ?? []).slice(0, 6);
  const n = steps.length;
  const colW = (W - 2 * M) / n;
  const lineY = top + 0.55;
  slide.addShape(c.pptx.ShapeType.line, { x: M + colW / 2, y: lineY, w: colW * (n - 1), h: 0, line: { color: c.t.surface2, width: 3 } });
  steps.forEach((st, i) => {
    const cx = M + i * colW + colW / 2;
    const color = i % 2 ? c.t.accent2 : c.t.accent;
    slide.addShape(c.pptx.ShapeType.ellipse, { x: cx - 0.42, y: lineY - 0.42, w: 0.84, h: 0.84, fill: { color }, line: { color: c.t.bg, width: 4 } });
    slide.addText(String(i + 1), { x: cx - 0.42, y: lineY - 0.42, w: 0.84, h: 0.84, align: "center", valign: "middle", fontFace: HEAD, fontSize: 20, bold: true, color: c.t.onAccent, margin: 0 });
    const x = M + i * colW + 0.12;
    const w = colW - 0.24;
    const cardY = lineY + 0.75;
    const cardH = Math.min(3.0, H - cardY - 0.8);
    slide.addShape(c.pptx.ShapeType.roundRect, { x, y: cardY, w, h: cardH, rectRadius: 0.12, fill: { color: c.t.surface }, line: { color: c.t.surface2, width: 0.75 } });
    slide.addText(st.title, { x: x + 0.2, y: cardY + 0.2, w: w - 0.4, h: 0.7, fontFace: HEAD, fontSize: fit(st.title, 19, w - 0.4, 0.7, 12), bold: true, color: c.t.text, valign: "top", margin: 0 });
    slide.addText(st.text, { x: x + 0.2, y: cardY + 0.9, w: w - 0.4, h: cardH - 1.1, fontFace: BODY, fontSize: fit(st.text, 15.5, w - 0.4, cardH - 1.1, 10), color: c.t.muted, valign: "top", margin: 0 });
  });
}

function comparison(c: Ctx, slide: Slide, s: SlideInput, top: number) {
  const cols = s.columns ?? [];
  const gap = 0.35;
  const cw = (W - 2 * M - gap) / 2;
  const maxItems = Math.max(...cols.map((col) => Math.min(col.bullets.length, 5)), 1);
  const h = Math.min(H - top - 0.8, 1.5 + maxItems * 0.95);
  cols.slice(0, 2).forEach((col, i) => {
    const x = M + i * (cw + gap);
    const hl = i === 1;
    slide.addShape(c.pptx.ShapeType.roundRect, {
      x, y: top, w: cw, h, rectRadius: 0.14,
      fill: { color: hl ? c.t.accent : c.t.surface },
      line: { color: hl ? c.t.accent : c.t.surface2, width: 0.75 },
    });
    const fg = hl ? c.t.onAccent : c.t.text;
    slide.addText(col.heading, { x: x + 0.4, y: top + 0.3, w: cw - 0.8, h: 0.6, fontFace: HEAD, fontSize: 25, bold: true, color: fg, valign: "middle", margin: 0 });
    const items = col.bullets.slice(0, 5);
    const rowH = Math.min(0.95, (h - 1.3) / Math.max(items.length, 1));
    items.forEach((b, j) => {
      const y = top + 1.1 + j * rowH;
      slide.addText(hl ? "✓" : "•", { x: x + 0.4, y, w: 0.35, h: 0.4, fontFace: BODY, fontSize: 20, bold: true, color: hl ? c.t.onAccent : c.t.muted, margin: 0 });
      slide.addText(b, { x: x + 0.8, y, w: cw - 1.2, h: rowH - 0.1, fontFace: BODY, fontSize: fit(b, 19, cw - 1.2, rowH - 0.1, 11), color: fg, valign: "top", margin: 0 });
    });
  });
}

function table(c: Ctx, slide: Slide, s: SlideInput, top: number) {
  const tb = s.table;
  if (!tb) return;
  const cols = tb.headers.length;
  const rows: PptxGenJS.TableRow[] = [
    tb.headers.map((h) => ({ text: h, options: { bold: true, color: c.t.onAccent, fill: { color: c.t.accent }, fontSize: 16 } })),
    ...tb.rows.slice(0, 7).map((r, i) =>
      Array.from({ length: cols }, (_, j) => ({
        text: r[j] ?? "",
        options: { color: j === 0 ? c.t.text : c.t.muted, bold: j === 0, fill: { color: i % 2 ? c.t.bg : c.t.surface }, fontSize: 15 },
      })),
    ),
  ];
  const w = W - 2 * M;
  slide.addTable(rows, {
    x: M, y: top, w, colW: Array(cols).fill(w / cols),
    fontFace: BODY, valign: "middle", margin: [8, 12, 8, 12],
    border: { type: "solid", color: c.t.surface2, pt: 0.75 },
    rowH: Math.min(0.78, (H - top - 0.9) / (rows.length || 1)),
  });
}

function quote(c: Ctx, s: SlideInput, idx: number) {
  const slide = c.pptx.addSlide();
  bg(slide, c.t.dark ? c.t.bg : c.t.surface);
  const hasImg = coverImage(c, slide, String(idx), W * 0.6, 0, W * 0.4, H);
  if (!hasImg) decorCircles(c, slide, "right");
  const tw = hasImg ? W * 0.6 - M - 0.6 : W - 2 * M - 2;
  slide.addText("“", { x: M - 0.1, y: 0.5, w: 2, h: 2, fontFace: "Georgia", fontSize: 150, bold: true, color: c.t.accent, margin: 0 });
  const q = s.quote || s.title;
  slide.addText(q, { x: M + 0.2, y: 2.2, w: tw, h: 3.0, fontFace: "Georgia", fontSize: fit(q, 32, tw, 3.0, 18), italic: true, color: c.t.text, valign: "top", margin: 0 });
  const by = s.attribution || (s.quote ? s.title : "");
  if (by) {
    slide.addShape(c.pptx.ShapeType.rect, { x: M + 0.2, y: 5.5, w: 0.5, h: 0.05, fill: { color: c.t.accent }, line: { color: c.t.accent } });
    slide.addText(by, { x: M + 0.85, y: 5.33, w: tw - 0.7, h: 0.4, fontFace: BODY, fontSize: 15, bold: true, color: c.t.muted, margin: 0 });
  }
  return slide;
}

function imageText(c: Ctx, s: SlideInput, idx: number) {
  const slide = c.pptx.addSlide();
  bg(slide, c.t.bg);
  const hasImg = coverImage(c, slide, String(idx), 0, 0, W * 0.46, H);
  if (!hasImg) {
    slide.addShape(c.pptx.ShapeType.rect, { x: 0, y: 0, w: W * 0.46, h: H, fill: { color: c.t.accent }, line: { color: c.t.accent } });
    iconTile(c, slide, "sparkles", W * 0.23 - 0.9, H / 2 - 0.9, 1.8, c.t.accent2);
  }
  const x = W * 0.46 + 0.6;
  const w = W - x - M;
  let y = 1.0;
  if (s.kicker) {
    slide.addText(s.kicker.toUpperCase(), { x, y, w, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: c.t.accent, charSpacing: 3, margin: 0 });
    y += 0.4;
  }
  slide.addText(s.title, { x, y, w, h: 1.4, fontFace: HEAD, fontSize: fit(s.title, 32, w, 1.4, 20), bold: true, color: c.t.text, valign: "top", margin: 0 });
  y += 1.5;
  if (s.subtitle) {
    slide.addText(s.subtitle, { x, y, w, h: 0.8, fontFace: BODY, fontSize: 17, color: c.t.muted, valign: "top", margin: 0 });
    y += 0.9;
  }
  const items = (s.bullets ?? []).slice(0, 4);
  const rowH = Math.min(0.9, (H - y - 0.8) / Math.max(items.length, 1));
  items.forEach((b, i) => {
    iconTile(c, slide, "circle-check", x, y + i * rowH + 0.03, 0.36);
    slide.addText(b, { x: x + 0.52, y: y + i * rowH, w: w - 0.52, h: rowH - 0.1, fontFace: BODY, fontSize: fit(b, 18, w - 0.52, rowH - 0.1, 11), color: c.t.text, valign: "top", margin: 0 });
  });
  return slide;
}

function product(c: Ctx, slide: Slide, s: SlideInput, top: number, idx: number) {
  // Panel visual produk di kiri (foto utuh), keunggulan di kanan.
  const panelW = W * 0.47 - M;
  const h = H - top - 0.8;
  slide.addShape(c.pptx.ShapeType.roundRect, { x: M, y: top, w: panelW, h, rectRadius: 0.16, fill: { color: c.t.surface }, line: { color: c.t.surface2, width: 0.75 } });
  slide.addShape(c.pptx.ShapeType.ellipse, { x: M + panelW * 0.15, y: top + h * 0.12, w: panelW * 0.7, h: panelW * 0.7, fill: { color: c.t.accent, transparency: c.t.dark ? 80 : 88 }, line: { color: c.t.accent, transparency: 100 } });
  if (!containImage(c, slide, String(idx), M + 0.25, top + 0.25, panelW - 0.5, h - 0.5)) {
    iconTile(c, slide, "package", M + panelW / 2 - 0.9, top + h / 2 - 0.9, 1.8);
  }
  const x = W * 0.47 + 0.4;
  const w = W - x - M;
  const feats = (s.cards ?? []).slice(0, 4);
  const items = feats.length ? feats : (s.bullets ?? []).slice(0, 4).map((b) => ({ icon: "circle-check", title: b, text: "" }));
  const rowH = Math.min(1.35, h / Math.max(items.length, 1));
  items.forEach((f, i) => {
    const y = top + i * rowH;
    iconTile(c, slide, f.icon, x, y + 0.05, 0.6, i % 2 ? c.t.accent2 : c.t.accent);
    slide.addText(f.title, { x: x + 0.8, y, w: w - 0.8, h: 0.45, fontFace: HEAD, fontSize: fit(f.title, 19, w - 0.8, 0.45, 12), bold: true, color: c.t.text, valign: "top", margin: 0 });
    if (f.text) {
      slide.addText(f.text, { x: x + 0.8, y: y + 0.45, w: w - 0.8, h: rowH - 0.6, fontFace: BODY, fontSize: fit(f.text, 15, w - 0.8, rowH - 0.6, 10), color: c.t.muted, valign: "top", margin: 0 });
    }
  });
}

function gallery(c: Ctx, slide: Slide, s: SlideInput, top: number, idx: number) {
  const items = (s.gallery ?? []).slice(0, 3);
  const n = Math.max(items.length, 1);
  const gap = 0.3;
  const cw = (W - 2 * M - (n - 1) * gap) / n;
  const ih = H - top - 1.55;
  items.forEach((g, k) => {
    const x = M + k * (cw + gap);
    if (!coverImage(c, slide, `${idx}-g${k}`, x, top, cw, ih)) {
      slide.addShape(c.pptx.ShapeType.roundRect, { x, y: top, w: cw, h: ih, rectRadius: 0.14, fill: { color: c.t.surface }, line: { color: c.t.surface2, width: 0.75 } });
      iconTile(c, slide, "camera", x + cw / 2 - 0.45, top + ih / 2 - 0.45, 0.9, k % 2 ? c.t.accent2 : c.t.accent);
    }
    slide.addShape(c.pptx.ShapeType.rect, { x, y: top + ih + 0.18, w: 0.4, h: 0.05, fill: { color: k % 2 ? c.t.accent2 : c.t.accent }, line: { color: k % 2 ? c.t.accent2 : c.t.accent } });
    slide.addText(g.caption, { x, y: top + ih + 0.3, w: cw, h: 0.55, fontFace: BODY, fontSize: fit(g.caption, 16, cw, 0.55, 11), bold: true, color: c.t.text, valign: "top", margin: 0 });
  });
}

function closing(c: Ctx, s: SlideInput, idx = -1) {
  const slide = c.pptx.addSlide();
  bg(slide, c.t.bg);
  if (heroBackground(c, slide, String(idx))) {
    slide.addShape(c.pptx.ShapeType.roundRect, { x: M, y: 1.6, w: 0.9, h: 0.09, rectRadius: 0.04, fill: { color: c.t.accent }, line: { color: c.t.accent } });
    slide.addText(s.title, { x: M, y: 1.9, w: W * 0.6, h: 1.6, fontFace: HEAD, fontSize: fit(s.title, 46, W * 0.6, 1.6, 26), bold: true, color: "FFFFFF", valign: "top", margin: 0 });
    if (s.subtitle) slide.addText(s.subtitle, { x: M, y: 3.55, w: W * 0.55, h: 0.8, fontFace: BODY, fontSize: 18, color: "E5E7EB", valign: "top", margin: 0 });
    (s.bullets ?? []).slice(0, 4).forEach((b, i) => {
      const y = 4.5 + i * 0.55;
      slide.addShape(c.pptx.ShapeType.ellipse, { x: M, y: y + 0.12, w: 0.16, h: 0.16, fill: { color: c.t.accent }, line: { color: c.t.accent } });
      slide.addText(b, { x: M + 0.35, y, w: W * 0.55, h: 0.45, fontFace: BODY, fontSize: 18, color: "FFFFFF", valign: "middle", margin: 0 });
    });
    return slide;
  }
  decorCircles(c, slide, "right");
  slide.addShape(c.pptx.ShapeType.roundRect, { x: M, y: 1.6, w: 0.9, h: 0.09, rectRadius: 0.04, fill: { color: c.t.accent }, line: { color: c.t.accent } });
  slide.addText(s.title, { x: M, y: 1.9, w: W * 0.62, h: 1.6, fontFace: HEAD, fontSize: fit(s.title, 44, W * 0.62, 1.6, 26), bold: true, color: c.t.text, valign: "top", margin: 0 });
  if (s.subtitle) slide.addText(s.subtitle, { x: M, y: 3.55, w: W * 0.6, h: 0.8, fontFace: BODY, fontSize: 17, color: c.t.muted, valign: "top", margin: 0 });
  const items = (s.bullets ?? []).slice(0, 4);
  items.forEach((b, i) => {
    const y = 4.5 + i * 0.55;
    slide.addShape(c.pptx.ShapeType.ellipse, { x: M, y: y + 0.12, w: 0.16, h: 0.16, fill: { color: c.t.accent }, line: { color: c.t.accent } });
    slide.addText(b, { x: M + 0.35, y, w: W * 0.6, h: 0.45, fontFace: BODY, fontSize: 18, color: c.t.text, valign: "middle", margin: 0 });
  });
  return slide;
}

// ---------------------------------------------------------------------------
// Bangun deck
// ---------------------------------------------------------------------------

/** Bangun file .pptx 16:9 dari outline terstruktur buatan AI. */
export async function buildPresentation(input: PresentationInput, images: DeckImages = {}): Promise<Uint8Array> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = input.title;
  pptx.company = "Markethink";
  pptx.author = "Markethink AI";
  const c: Ctx = { pptx, t: resolveTheme(input), deckTitle: input.title, total: input.slides.length + 1, images };

  cover(c, input);
  let sectionNo = 0;
  input.slides.forEach((s, i) => {
    const page = i + 2;
    let slide: Slide;
    if (s.layout === "section") slide = section(c, s, i, ++sectionNo);
    else if (s.layout === "quote") slide = quote(c, s, i);
    else if (s.layout === "image_text") slide = imageText(c, s, i);
    else if (s.layout === "closing") slide = closing(c, s, i);
    else {
      slide = pptx.addSlide();
      bg(slide, c.t.bg);
      const top = header(c, slide, s);
      if (s.layout === "agenda") agenda(c, slide, s, top);
      else if (s.layout === "cards" && s.cards?.length) cards(c, slide, s, top, i);
      else if (s.layout === "stats" && s.stats?.length) stats(c, slide, s, top, i);
      else if (s.layout === "product") product(c, slide, s, top, i);
      else if (s.layout === "gallery" && s.gallery?.length) gallery(c, slide, s, top, i);
      else if (s.layout === "chart") chart(c, slide, s, top);
      else if (s.layout === "timeline" && s.steps?.length) timeline(c, slide, s, top);
      else if (s.layout === "comparison" && s.columns?.length) comparison(c, slide, s, top);
      else if (s.layout === "table" && s.table) table(c, slide, s, top);
      else bullets(c, slide, s, top, i);
    }
    // Foto penuh tinggi di sisi kanan (stats/quote bergambar) → nomor halaman disembunyikan agar tidak menimpa foto.
    const rightPhoto = (s.layout === "stats" || s.layout === "quote") && hasImage(c, String(i));
    if (s.layout !== "section" && s.layout !== "closing") {
      footer(c, slide, page, s.layout === "image_text" ? W * 0.46 + 0.6 : M, !rightPhoto);
    }
    if (s.notes) slide.addNotes(s.notes);
  });

  const out = await pptx.write({ outputType: "nodebuffer" });
  return out instanceof Uint8Array ? out : new Uint8Array(out as ArrayBuffer);
}

export interface DeckImageRequest {
  key: string;
  aspect: string;
  /** Foto milik user (attachment) — gratis, diutamakan. */
  imageId?: string;
  /** Deskripsi untuk dibuat AI. */
  prompt?: string;
  product?: boolean;
}

const IMAGE_ASPECT: Partial<Record<SlideInput["layout"], string>> = {
  image_text: "3:4",
  product: "1:1",
  section: "3:4",
  quote: "3:4",
  cards: "3:4",
  stats: "3:4",
  bullets: "1:1",
  closing: "16:9",
};
// Urutan prioritas bila jumlah gambar AI dibatasi.
const IMAGE_PRIORITY: SlideInput["layout"][] = ["product", "image_text", "section", "gallery", "closing", "cards", "stats", "quote", "bullets"];

/**
 * Semua visual yang dibutuhkan deck: cover + slide bergambar + galeri. Foto milik user (imageId) selalu dipakai;
 * gambar AI (prompt) dibatasi `maxGenerated` dan diprioritaskan cover → produk → image_text → section → …
 */
export function deckImageRequests(input: PresentationInput, maxGenerated = 6): DeckImageRequest[] {
  const all: (DeckImageRequest & { rank: number })[] = [];
  const coverAspect = input.cover_style === "split" ? "4:5" : "16:9";
  if (input.cover_image_id) all.push({ key: "cover", aspect: coverAspect, imageId: input.cover_image_id, rank: -1 });
  else if (input.cover_image_prompt) all.push({ key: "cover", aspect: coverAspect, prompt: input.cover_image_prompt, rank: -1 });
  input.slides.forEach((s, i) => {
    const rank = IMAGE_PRIORITY.indexOf(s.layout) + i / 100;
    if (s.layout === "gallery") {
      (s.gallery ?? []).slice(0, 3).forEach((g, k) => {
        const key = `${i}-g${k}`;
        if (g.image_id) all.push({ key, aspect: "4:3", imageId: g.image_id, rank });
        else if (g.image_prompt) all.push({ key, aspect: "4:3", prompt: g.image_prompt, rank });
      });
      return;
    }
    const aspect = IMAGE_ASPECT[s.layout];
    if (!aspect) return;
    if (s.image_id) all.push({ key: String(i), aspect, imageId: s.image_id, rank, product: s.layout === "product" });
    else if (s.image_prompt) all.push({ key: String(i), aspect, prompt: s.image_prompt, rank, product: s.layout === "product" });
  });
  const owned = all.filter((r) => r.imageId);
  const generated = all
    .filter((r) => !r.imageId)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, maxGenerated);
  return [...owned, ...generated].map((r) => ({ key: r.key, aspect: r.aspect, imageId: r.imageId, prompt: r.prompt, product: r.product }));
}

/** Ukuran asli gambar PNG/JPEG/WebP dari byte-nya (untuk crop yang pas). */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50) {
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const len = (b[i + 2] << 8) + b[i + 3];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: (b[i + 5] << 8) + b[i + 6], width: (b[i + 7] << 8) + b[i + 8] };
      }
      i += 2 + len;
    }
    return null;
  }
  if (b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (chunk === "VP8X") return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    if (chunk === "VP8 ") return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
  }
  return null;
}

/** Ringkasan teks presentasi (disimpan untuk konteks & ditampilkan di kartu chat). */
export function presentationOutline(input: PresentationInput) {
  return [
    `# ${input.title}${input.subtitle ? ` — ${input.subtitle}` : ""}`,
    ...input.slides.map((s, i) => {
      const body = [
        ...(s.bullets ?? []),
        ...(s.cards ?? []).map((cd) => `${cd.title}: ${cd.text}`),
        ...(s.columns ?? []).flatMap((col) => [col.heading, ...col.bullets.map((b) => `  ${b}`)]),
        ...(s.stats ?? []).map((st) => `${st.value} — ${st.label}`),
        ...(s.steps ?? []).map((st, j) => `${j + 1}. ${st.title}: ${st.text}`),
        ...(s.chart ? [`Grafik ${s.chart.type}: ${s.chart.labels.join(", ")}`] : []),
        ...(s.table ? [`Tabel: ${s.table.headers.join(" | ")}`] : []),
        ...(s.quote ? [`"${s.quote}"`] : []),
      ];
      return `${i + 2}. ${s.title}${body.length ? `\n${body.map((b) => `   - ${b}`).join("\n")}` : ""}`;
    }),
  ].join("\n");
}
