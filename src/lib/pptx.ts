import "server-only";
import PptxGenJS from "pptxgenjs";
import { z } from "zod";

export const slideSchema = z.object({
  layout: z
    .enum(["bullets", "two_column", "stats", "quote", "section", "closing"])
    .default("bullets")
    .describe(
      "bullets = judul + poin; two_column = perbandingan 2 kolom; stats = 2-4 angka besar; quote = kutipan/insight utama; section = pemisah bab; closing = penutup/CTA",
    ),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional().describe("Kalimat pendukung di bawah judul (opsional)"),
  bullets: z.array(z.string().max(220)).max(7).optional().describe("Poin singkat, maks 7 (layout bullets/closing)"),
  columns: z
    .array(z.object({ heading: z.string().max(60), bullets: z.array(z.string().max(160)).max(6) }))
    .max(2)
    .optional()
    .describe("Tepat 2 kolom untuk layout two_column"),
  stats: z
    .array(z.object({ value: z.string().max(16), label: z.string().max(80) }))
    .max(4)
    .optional()
    .describe("Untuk layout stats, mis. {value:'68%', label:'Gen Z belanja via TikTok'}"),
  quote: z.string().max(300).optional().describe("Untuk layout quote"),
  attribution: z.string().max(80).optional(),
  notes: z.string().max(1500).optional().describe("Catatan pembicara (speaker notes)"),
});

export const presentationSchema = z.object({
  title: z.string().min(1).max(120).describe("Judul presentasi"),
  subtitle: z.string().max(200).optional().describe("Subjudul / nama brand / tanggal"),
  theme: z.enum(["midnight", "clean", "sunset"]).default("midnight").describe("midnight = gelap elegan, clean = putih profesional, sunset = hangat & berani"),
  slides: z.array(slideSchema).min(1).max(25).describe("Isi slide setelah slide judul (slide judul dibuat otomatis)"),
});

export type PresentationInput = z.infer<typeof presentationSchema>;

interface Theme {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  titleBg: string;
  titleText: string;
}

const THEMES: Record<PresentationInput["theme"], Theme> = {
  midnight: {
    bg: "0F172A",
    surface: "1E293B",
    text: "F1F5F9",
    muted: "94A3B8",
    accent: "8B5CF6",
    accent2: "22D3EE",
    titleBg: "0B1020",
    titleText: "FFFFFF",
  },
  clean: {
    bg: "FFFFFF",
    surface: "F1F5F9",
    text: "0F172A",
    muted: "64748B",
    accent: "6D28D9",
    accent2: "0EA5E9",
    titleBg: "6D28D9",
    titleText: "FFFFFF",
  },
  sunset: {
    bg: "FFF7ED",
    surface: "FFEDD5",
    text: "431407",
    muted: "9A3412",
    accent: "EA580C",
    accent2: "DB2777",
    titleBg: "C2410C",
    titleText: "FFFFFF",
  },
};

const FONT = "Calibri";
const W = 13.333;
const H = 7.5;

/** Bangun file .pptx 16:9 dari outline terstruktur buatan AI. */
export async function buildPresentation(input: PresentationInput): Promise<Uint8Array> {
  const t = THEMES[input.theme] ?? THEMES.midnight;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = input.title;
  pptx.company = "Markethink";
  pptx.author = "Markethink AI";

  // --- Slide judul ---
  const cover = pptx.addSlide();
  cover.background = { color: t.titleBg };
  cover.addShape(pptx.ShapeType.rect, { x: 0, y: H - 0.18, w: W, h: 0.18, fill: { color: t.accent2 } });
  cover.addShape(pptx.ShapeType.rect, { x: 0.8, y: 2.35, w: 1.2, h: 0.08, fill: { color: t.accent2 } });
  cover.addText(input.title, {
    x: 0.8, y: 2.55, w: W - 1.6, h: 1.8, fontFace: FONT, fontSize: 44, bold: true, color: t.titleText, valign: "top", fit: "shrink",
  });
  if (input.subtitle) {
    cover.addText(input.subtitle, { x: 0.8, y: 4.45, w: W - 1.6, h: 0.9, fontFace: FONT, fontSize: 20, color: t.titleText, transparency: 15 });
  }
  cover.addText("Dibuat dengan Markethink", { x: 0.8, y: H - 0.85, w: 6, h: 0.4, fontFace: FONT, fontSize: 11, color: t.titleText, transparency: 35 });

  const total = input.slides.length;
  input.slides.forEach((s, i) => {
    const slide = pptx.addSlide();
    const dark = s.layout === "section" || s.layout === "quote";
    slide.background = { color: dark ? t.titleBg : t.bg };
    const textColor = dark ? t.titleText : t.text;

    if (s.layout === "section") {
      slide.addText(String(i + 1).padStart(2, "0"), { x: 0.8, y: 2.0, w: 3, h: 1, fontFace: FONT, fontSize: 40, bold: true, color: t.accent2 });
      slide.addText(s.title, { x: 0.8, y: 3.0, w: W - 1.6, h: 1.4, fontFace: FONT, fontSize: 40, bold: true, color: textColor, fit: "shrink" });
      if (s.subtitle) slide.addText(s.subtitle, { x: 0.8, y: 4.4, w: W - 1.6, h: 0.8, fontFace: FONT, fontSize: 18, color: textColor, transparency: 20 });
    } else if (s.layout === "quote") {
      slide.addText("“", { x: 0.7, y: 0.9, w: 1.5, h: 1.5, fontFace: "Georgia", fontSize: 120, color: t.accent2 });
      slide.addText(s.quote || s.title, {
        x: 1.2, y: 2.0, w: W - 2.4, h: 3.0, fontFace: "Georgia", fontSize: 30, italic: true, color: textColor, valign: "middle", fit: "shrink",
      });
      const by = s.attribution || (s.quote ? s.title : "");
      if (by) slide.addText(`— ${by}`, { x: 1.2, y: 5.2, w: W - 2.4, h: 0.6, fontFace: FONT, fontSize: 16, bold: true, color: t.titleText });
    } else {
      header(slide, pptx, t, s.title, s.subtitle);
      const top = s.subtitle ? 2.05 : 1.7;
      if (s.layout === "two_column" && s.columns?.length) {
        const colW = (W - 1.6 - 0.4) / 2;
        s.columns.slice(0, 2).forEach((col, c) => {
          const x = 0.8 + c * (colW + 0.4);
          slide.addShape(pptx.ShapeType.roundRect, { x, y: top, w: colW, h: H - top - 0.9, fill: { color: t.surface }, rectRadius: 0.12, line: { color: t.surface } });
          slide.addShape(pptx.ShapeType.rect, { x, y: top, w: colW, h: 0.08, fill: { color: c === 0 ? t.accent : t.accent2 } });
          slide.addText(col.heading, { x: x + 0.3, y: top + 0.25, w: colW - 0.6, h: 0.6, fontFace: FONT, fontSize: 20, bold: true, color: t.text });
          slide.addText(bulletRuns(col.bullets, t, 18), { x: x + 0.3, y: top + 0.95, w: colW - 0.6, h: H - top - 2.1, valign: "top", fit: "shrink" });
        });
      } else if (s.layout === "stats" && s.stats?.length) {
        const n = s.stats.length;
        const gap = 0.35;
        const boxW = (W - 1.6 - gap * (n - 1)) / n;
        s.stats.forEach((st, k) => {
          const x = 0.8 + k * (boxW + gap);
          slide.addShape(pptx.ShapeType.roundRect, { x, y: top + 0.3, w: boxW, h: 2.8, fill: { color: t.surface }, rectRadius: 0.15, line: { color: t.surface } });
          slide.addText(st.value, { x, y: top + 0.6, w: boxW, h: 1.3, align: "center", fontFace: FONT, fontSize: 48, bold: true, color: k % 2 ? t.accent2 : t.accent, fit: "shrink" });
          slide.addText(st.label, { x: x + 0.2, y: top + 1.9, w: boxW - 0.4, h: 1.0, align: "center", valign: "top", fontFace: FONT, fontSize: 15, color: t.muted, fit: "shrink" });
        });
        if (s.bullets?.length) {
          slide.addText(bulletRuns(s.bullets, t, 14), { x: 0.8, y: top + 3.4, w: W - 1.6, h: H - top - 4.3, valign: "top", fit: "shrink" });
        }
      } else if (s.bullets?.length) {
        slide.addText(bulletRuns(s.bullets, t, s.bullets.length > 5 ? 18 : 22), {
          x: 0.8, y: top, w: W - 1.6, h: H - top - 0.9, valign: "top", fit: "shrink", paraSpaceAfter: 10,
        });
      }
    }

    // Footer
    slide.addText("Markethink", { x: 0.8, y: H - 0.55, w: 4, h: 0.35, fontFace: FONT, fontSize: 10, color: dark ? t.titleText : t.muted, transparency: 30 });
    slide.addText(`${i + 2} / ${total + 1}`, { x: W - 2.3, y: H - 0.55, w: 1.5, h: 0.35, align: "right", fontFace: FONT, fontSize: 10, color: dark ? t.titleText : t.muted, transparency: 30 });
    if (s.notes) slide.addNotes(s.notes);
  });

  const out = await pptx.write({ outputType: "nodebuffer" });
  return out instanceof Uint8Array ? out : new Uint8Array(out as ArrayBuffer);
}

function header(slide: PptxGenJS.Slide, pptx: PptxGenJS, t: Theme, title: string, subtitle?: string) {
  slide.addShape(pptx.ShapeType.rect, { x: 0.8, y: 0.55, w: 0.9, h: 0.07, fill: { color: t.accent } });
  slide.addText(title, { x: 0.8, y: 0.7, w: W - 1.6, h: 0.9, fontFace: FONT, fontSize: 30, bold: true, color: t.text, fit: "shrink" });
  if (subtitle) slide.addText(subtitle, { x: 0.8, y: 1.5, w: W - 1.6, h: 0.5, fontFace: FONT, fontSize: 16, color: t.muted });
}

function bulletRuns(items: string[], t: Theme, size: number): PptxGenJS.TextProps[] {
  return items.map((b) => ({
    text: b,
    options: { bullet: { code: "25A0" }, fontFace: FONT, fontSize: size, color: t.text, breakLine: true, paraSpaceAfter: 8 },
  }));
}

/** Ringkasan teks presentasi (disimpan untuk konteks & ditampilkan di kartu chat). */
export function presentationOutline(input: PresentationInput) {
  return [
    `# ${input.title}${input.subtitle ? ` — ${input.subtitle}` : ""}`,
    ...input.slides.map((s, i) => {
      const body = [
        ...(s.bullets ?? []),
        ...(s.columns ?? []).flatMap((c) => [c.heading, ...c.bullets.map((b) => `  ${b}`)]),
        ...(s.stats ?? []).map((st) => `${st.value} — ${st.label}`),
        ...(s.quote ? [`"${s.quote}"`] : []),
      ];
      return `${i + 2}. ${s.title}${body.length ? `\n${body.map((b) => `   - ${b}`).join("\n")}` : ""}`;
    }),
  ].join("\n");
}
