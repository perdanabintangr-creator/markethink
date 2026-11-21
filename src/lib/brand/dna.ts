import { z } from "zod";
import { clip, FONT_IDS, styleDnaSchema, type StyleDna } from "@/lib/autopilot/style";
import { PILLAR_KEYS, type PillarMix } from "@/lib/autopilot/strategy";
import type { BrandResearch } from "@/lib/autopilot/research-shape";

/**
 * Brand DNA: hasil tim AI (Creative Director, Designer, Copywriter, Socmed Specialist) dari Brand Onboarding + riset.
 * Disimpan bervesi; Autopilot hanya jalan setelah klien ACC. Modul murni (diuji vitest).
 */

const list = (n: number, max = 200) =>
  z
    .array(clip(max))
    .transform((a) => a.slice(0, n))
    .default([]);
const hex = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/)
  .catch("#0A3DFF");

export const cdSchema = z.object({
  big_idea: clip(240).default(""),
  positioning: clip(400).default(""),
  mood_keywords: list(5, 40),
  moodboard: clip(600).default(""),
  pillars: z
    .array(z.object({ name: clip(60), description: clip(240).default("") }))
    .transform((a) => a.slice(0, 5))
    .default([]),
  consistency_notes: clip(800).default(""),
});

export const designerSchema = z.object({
  palette: z.object({
    primary: hex,
    secondary: hex,
    accent: hex.optional(),
    background: hex.optional(),
    rules: clip(400).default(""),
  }),
  typography: z.object({
    font: z.enum(FONT_IDS).catch("jakarta"),
    rules: clip(300).default(""),
  }),
  layout_rules: clip(400).default(""),
  image_style: z.object({
    type: clip(120).default(""),
    lighting: clip(160).default(""),
    angle: clip(160).default(""),
    composition: clip(200).default(""),
  }),
  casting_guide: clip(500).default(""),
  prompt_style_guide: clip(800).default(""),
  style_dna: styleDnaSchema,
});

export const copywriterSchema = z.object({
  tone: clip(240).default(""),
  pronoun: clip(40).default("kamu"),
  vocabulary: list(15, 40),
  forbidden: list(20, 60),
  hook_patterns: list(6, 160),
  cta_style: clip(240).default(""),
  sample_captions: list(3, 700),
});

const mixNum = z.coerce
  .number()
  .catch(0)
  .transform((n) => Math.max(0, Math.min(100, Math.round(n))));
export const socmedSchema = z.object({
  audience: z.object({
    profile: clip(400).default(""),
    problems: list(6),
    desires: list(6),
    active_times: clip(200).default(""),
  }),
  format_mix: z.object({
    carousel: z.coerce.number().catch(3),
    reel: z.coerce.number().catch(1),
    image: z.coerce.number().catch(2),
  }),
  pillar_mix: z.object({
    edukasi: mixNum,
    relatable: mixNum,
    insight: mixNum,
    produk: mixNum,
  }),
  posting_times: z
    .preprocess(
      (v) => (Array.isArray(v) ? v.map((x) => String(x).trim().replace(".", ":").padStart(5, "0")).filter((x) => /^([01]\d|2[0-3]):[0-5]\d$/.test(x)) : []),
      z.array(z.string()),
    )
    .transform((a) => [...new Set(a)].slice(0, 3))
    .default([]),
  competitor_benchmark: z.object({ works: list(5), gaps: list(5) }).default({ works: [], gaps: [] }),
});

export const brandDnaSchema = z.object({
  creative_director: cdSchema,
  designer: designerSchema,
  copywriter: copywriterSchema,
  socmed: socmedSchema,
});
export type BrandDna = z.infer<typeof brandDnaSchema>;
export type DnaRole = keyof BrandDna;
export const DNA_ROLES: DnaRole[] = ["creative_director", "designer", "copywriter", "socmed"];

const ROLE_BRIEF: Record<Exclude<DnaRole, "creative_director">, string> = {
  designer: `Kamu DESIGNER senior. Hasilkan:
- palette {primary, secondary, accent, background (hex), rules: aturan pemakaian}. Ambil dari LOGO & foto asli bila ada; JANGAN default biru kecuali brand memang biru.
- typography {font: salah satu ${FONT_IDS.join("|")}, rules}
- layout_rules (aturan tata letak singkat)
- image_style {type (realistis/ilustrasi/3D), lighting, angle, composition}
- casting_guide: siapa talent di gambar (usia, gaya, gender, hijab/tidak, ekspresi) sesuai audiens & preferensi klien
- prompt_style_guide (BAHASA INGGRIS): panduan gaya untuk prompt image generation (setting khas brand, properti, palet, lighting, mood, yang dilarang)
- style_dna {name, description, bg light|dark|photo|solid|cream, bgColor?, font, upper, serifAccent, align left|center, titlePos top|bottom,
  hero below|above|full|none, ornaments[orbs|orbit|corners|grain|frame|grid|sticker], visualStyle 3d-glossy|clay-3d|photo-lifestyle|product-studio|flat-illustration|editorial-photo|minimal-object, imageHint, titleScale}`,
  copywriter: `Kamu COPYWRITER senior. Hasilkan:
- tone (mis. santai-ceria, pakai "kamu", slang ringan boleh), pronoun ("kamu"/"kak"/dll)
- vocabulary: kosakata khas brand; forbidden: kata terlarang (gabungkan Do & Don't klien + klise)
- hook_patterns: 3–6 pola hook favorit untuk brand ini (dengan contoh singkat)
- cta_style: gaya ajakan sesuai CTA utama klien
- sample_captions: 3 contoh caption pendek (≤ 400 karakter) dalam suara brand`,
  socmed: `Kamu SOCIAL MEDIA SPECIALIST. Hasilkan:
- audience {profile, problems[], desires[], active_times}
- format_mix per minggu {carousel, reel, image} (angka post)
- pillar_mix (persen, total 100) dengan kunci TETAP: edukasi, relatable, insight, produk — sesuai tujuan konten klien
- posting_times: 2–3 jam posting (HH:MM, WIB) sesuai kebiasaan audiens
- competitor_benchmark {works: yang berhasil di kompetitor/kategori, gaps: celah yang bisa diambil brand ini}`,
};

export function rolePrompt(role: Exclude<DnaRole, "creative_director">, ctx: string, en: boolean) {
  return `${ROLE_BRIEF[role]}

Semua berdasarkan DATA di bawah (profil dari klien = paling dipercaya; riset & analisis gambar = pendukung). Jangan mengarang fakta, harga, atau promo.
Bahasa: ${en ? "English" : "Bahasa Indonesia"} (kecuali prompt_style_guide & imageHint: English).

${ctx}

Balas HANYA JSON objek bagian ${role}.`;
}

export function cdPrompt(ctx: string, drafts: Partial<BrandDna>, en: boolean) {
  return `Kamu CREATIVE DIRECTOR. Kamu memimpin tim (Designer, Copywriter, Socmed Specialist) dan punya keputusan akhir.
1. Tulis bagianmu: big_idea (1 kalimat), positioning, mood_keywords (3–5), moodboard (deskripsi moodboard dari referensi & foto asli),
   pillars (3–5 pilar konten {name, description}), consistency_notes (catatan konsistensi & keputusanmu).
2. Cek konsistensi draf tim. Bila ada yang bertentangan dengan profil klien/big idea, KEMBALIKAN versi LENGKAP yang sudah kamu perbaiki
   untuk bagian itu (designer/copywriter/socmed). Bagian yang sudah tepat: isi null (draf tim dipakai apa adanya).
Bahasa: ${en ? "English" : "Bahasa Indonesia"}.

${ctx}

DRAF TIM:
${JSON.stringify(drafts).slice(0, 14_000)}

Balas HANYA JSON: {"creative_director":{...},"designer":null,"copywriter":null,"socmed":null}`;
}

/** Ringkasan Brand DNA untuk SEMUA agen Autopilot (strategist, copywriter, tim senior). */
export function dnaBlock(d: BrandDna, version: number) {
  const cd = d.creative_director;
  const cw = d.copywriter;
  const sm = d.socmed;
  return `BRAND DNA v${version} (WAJIB diikuti — sudah di-ACC pemilik brand):
- Big idea: ${cd.big_idea}${cd.positioning ? ` | Positioning: ${cd.positioning}` : ""}
- Mood: ${cd.mood_keywords.join(", ")}
- Pilar konten brand: ${cd.pillars.map((p) => `${p.name}${p.description ? ` (${p.description})` : ""}`).join("; ")}
- Audiens: ${sm.audience.profile}${sm.audience.problems.length ? ` | Masalah: ${sm.audience.problems.join("; ")}` : ""}${sm.audience.desires.length ? ` | Keinginan: ${sm.audience.desires.join("; ")}` : ""}
- Tone: ${cw.tone} (sapaan "${cw.pronoun}")${cw.vocabulary.length ? ` | Kosakata khas: ${cw.vocabulary.join(", ")}` : ""}
- Kata TERLARANG: ${cw.forbidden.join(", ") || "-"}
- Pola hook favorit: ${cw.hook_patterns.join(" | ")}
- Gaya CTA: ${cw.cta_style}
- Celah dari kompetitor: ${sm.competitor_benchmark.gaps.join("; ") || "-"}
${cw.sample_captions.length ? `Contoh caption suara brand (tiru gaya, jangan salin):\n${cw.sample_captions.map((c) => `> ${c.replace(/\n+/g, " ")}`).join("\n")}` : ""}`.trim();
}

/** Panduan visual dari Designer untuk Visual Director (prompt image generation). */
export function visualGuide(d: BrandDna) {
  const ds = d.designer;
  return `BRAND VISUAL GUIDE (Designer, wajib): ${ds.prompt_style_guide}
Image style: ${[ds.image_style.type, ds.image_style.lighting, ds.image_style.angle, ds.image_style.composition].filter(Boolean).join("; ")}.
Casting: ${ds.casting_guide}
Palette: primary ${ds.palette.primary}, secondary ${ds.palette.secondary}${ds.palette.accent ? `, accent ${ds.palette.accent}` : ""}. ${ds.palette.rules}`;
}

/** Campuran pilar Socmed → pengaturan Autopilot (custom). */
export function pillarMixFromDna(d: BrandDna): PillarMix | null {
  const m = d.socmed.pillar_mix;
  const total = PILLAR_KEYS.reduce((a, k) => a + m[k], 0);
  return total > 0 ? m : null;
}

export const styleDnaFrom = (d: BrandDna): StyleDna => ({
  ...d.designer.style_dna,
  name: d.designer.style_dna.name || "Brand DNA",
});

/** Gabungkan draf peran + revisi CD (CD menang bila valid). */
export function mergeDna(drafts: Partial<Record<DnaRole, unknown>>, cd: Partial<Record<DnaRole, unknown>>) {
  const pick = (role: DnaRole) => {
    const schema = {
      creative_director: cdSchema,
      designer: designerSchema,
      copywriter: copywriterSchema,
      socmed: socmedSchema,
    }[role] as z.ZodTypeAny;
    const a = schema.safeParse(cd[role]);
    if (a.success) return a.data;
    const b = schema.safeParse(drafts[role]);
    return b.success ? b.data : null;
  };
  const out = {
    creative_director: pick("creative_director"),
    designer: pick("designer"),
    copywriter: pick("copywriter"),
    socmed: pick("socmed"),
  };
  const parsed = brandDnaSchema.safeParse(out);
  return parsed.success ? parsed.data : null;
}

const PROFILE_LABELS: Record<string, string> = {
  category: "Kategori/industri",
  instagram: "Instagram",
  target_audience: "Target audiens",
  content_goal: "Tujuan konten utama",
  location: "Lokasi/area layanan",
  cta_primary: "CTA utama",
  cta_link: "Link CTA",
  website: "Website",
  maps: "Google Maps",
  tiktok: "TikTok",
  color_primary: "Warna utama",
  color_secondary: "Warna kedua",
  fonts: "Font/gaya huruf",
  products: "Produk/layanan & harga",
  promos: "Promo berjalan",
  usp: "Keunggulan (USP)",
  competitor_accounts: "Akun kompetitor",
  reference_accounts: "Akun referensi gaya",
  caption_examples: "Contoh caption disukai",
  brand_voice: "Gaya bicara",
  voice_dont: "Kata terlarang",
  visual_dont: "Visual terlarang",
  sensitive: "Hal sensitif (halal, SARA, dll)",
  talent_pref: "Preferensi talent",
  notes: "Catatan",
};

/** Profil brand dari onboarding sebagai teks untuk tim AI. */
export function profileBlock(name: string, kit: Record<string, unknown>) {
  const lines = [`- Nama brand: ${name}`];
  for (const [k, label] of Object.entries(PROFILE_LABELS)) {
    const v = kit[k];
    if (typeof v === "string" && v.trim()) lines.push(`- ${label}: ${v.trim()}`);
  }
  return lines.join("\n");
}

/** Konteks untuk tim AI: profil klien (paling dipercaya) + riset; riset gagal → fallback profil saja. */
export function dnaContext(profile: string, research: BrandResearch | null) {
  const ai = research?.asset_insights;
  const r = research
    ? [
        "RISET (web, gambar, aset):",
        `- Bisnis: ${research.business.summary}`,
        `- Kategori: ${research.business.category}`,
        `- Produk: ${research.business.products.map((p) => p.name).join(", ") || "-"}`,
        `- KV riset: ${research.kv.primary}/${research.kv.secondary}, ${research.kv.mood}`,
        `- Subjek visual: ${research.visual_subjects.join("; ") || "-"}`,
        ...(ai
          ? [
              "ANALISIS ASET KLIEN:",
              `- Logo: ${ai.logo ?? "-"}`,
              `- Foto asli: ${ai.photos ?? "-"}`,
              `- Feed: ${ai.feed ?? "-"}`,
              `- Kompetitor: ${ai.competitors ?? "-"}`,
              `- Referensi: ${ai.references ?? "-"}`,
            ]
          : []),
      ].join("\n")
    : "RISET: tidak tersedia (fallback) — gunakan profil klien saja, jangan mengarang.";
  return `PROFIL DARI KLIEN (paling dipercaya):\n${profile}\n\n${r}`;
}
