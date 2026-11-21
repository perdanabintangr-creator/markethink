import { z } from "zod";
import { slideSchema, plainText, type Slide } from "./slides";
import { dedupeAccent } from "./tidy";

/**
 * Tim senior Autopilot: AI pemeriksa membaca konten sebagai kritikus + pemeriksa fakta, memberi skor 1–10, dan
 * memperbaiki yang lemah (hook, kejelasan, ajakan, fakta di luar data brand). Modul murni.
 */

export const reviewSchema = z.object({
  reviews: z.array(
    z.object({
      i: z.coerce.number().int().min(0),
      score: z.coerce.number().catch(7).transform((n) => Math.max(1, Math.min(10, n))),
      issues: z
        .preprocess((v) => (Array.isArray(v) ? v.map((x) => String(x).trim().slice(0, 200)).filter(Boolean) : typeof v === "string" ? [v.slice(0, 200)] : []), z.array(z.string()))
        .transform((a) => a.slice(0, 5)),
      // Perbaikan yang tidak valid diabaikan (draf asli dipakai), bukan menggagalkan seluruh pemeriksaan.
      fix: z
        .object({
          slides: z.array(slideSchema).max(10).optional(),
          caption: z.string().max(2200).optional(),
          script: z.string().max(4000).optional(),
        })
        .optional()
        .nullable()
        .catch(null),
    }),
  ),
});
export type TeamReview = z.infer<typeof reviewSchema>["reviews"][number];

export interface ReviewPost {
  kind: string;
  pillar: string | null;
  title: string;
  slides: Slide[];
  caption: string;
  script: string | null;
}

const slideText = (s: Slide) =>
  [s.label, s.title && plainText(s.title), s.accent, s.sub, s.body, ...(s.items ?? []), ...(s.options ?? []), s.button].filter(Boolean).join(" / ");

export function buildTeamReviewPrompt(o: { brandBlock: string; voice: string | null; catalog: string | null; posts: ReviewPost[]; en: boolean }) {
  const list = o.posts
    .map(
      (p, i) =>
        `### POST ${i} (${p.kind}, ${p.pillar ?? "-"}): ${p.title}\n` +
        (p.slides.length ? p.slides.map((s, k) => `slide ${k + 1} [${s.type}]: ${slideText(s)}`).join("\n") + "\n" : "") +
        (p.script ? `naskah: ${p.script.slice(0, 1500)}\n` : "") +
        `caption: ${p.caption}`,
    )
    .join("\n\n");
  return `Kamu tim senior (creative director + editor + pemeriksa fakta) yang memeriksa draf konten Instagram sebelum diserahkan ke pemilik brand.

DATA BRAND (satu-satunya sumber fakta):
${o.brandBlock || "- (Brand Kit kosong)"}
${o.voice ? `\n${o.voice}\n` : ""}${o.catalog ? `\n${o.catalog}\n` : ""}
Nilai tiap post 1–10 berdasarkan: kekuatan hook 2 detik pertama, satu ide jelas per slide, alur carousel (cover → takaran → poin → rangkuman → ajakan),
caption (hook + kata kunci di awal, satu ajakan, 3–5 hashtag), kesesuaian suara brand, dan FAKTA (angka/harga/promo/klaim harus ada di DATA BRAND).
- Skor ≥ 8 dan tidak ada masalah fakta: "fix" null.
- Skor < 8 ATAU ada klaim/angka/promo yang tidak ada di data brand: isi "fix" dengan versi perbaikan (slides LENGKAP dengan struktur & type sama,
  dan/atau caption/script baru). Pertahankan "visual", "corners", "num" & "label" dari slide asli. Jangan menambah fakta baru.
- "issues": maks 3 catatan singkat ${o.en ? "in English" : "Bahasa Indonesia"} untuk pemilik brand.

${list}

Balas HANYA JSON: {"reviews":[{"i":0,"score":8,"issues":["..."],"fix":null}]}`;
}

/** Gabungkan slide perbaikan dengan slide asli (field visual & ornamen dari aslinya dipertahankan). */
export function mergeFixedSlides(orig: Slide[], fixed: Slide[] | undefined) {
  if (!fixed?.length || fixed.length !== orig.length) return orig;
  return fixed.map((f, k) => dedupeAccent({ ...f, type: orig[k].type, visual: orig[k].visual ?? f.visual, image: orig[k].image, corners: orig[k].corners ?? f.corners }));
}
