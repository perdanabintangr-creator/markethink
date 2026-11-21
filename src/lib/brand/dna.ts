import { z } from "zod";
import { clip, FONT_IDS, styleDnaSchema, type StyleDna } from "@/lib/autopilot/style";
import { PILLAR_KEYS, type PillarMix } from "@/lib/autopilot/strategy";
import type { BrandResearch } from "@/lib/autopilot/research-shape";

/**
 * Brand DNA: hasil tim AI (Creative Director, Designer, Copywriter, Socmed Specialist) dari Brand Onboarding + riset.
 * Disimpan bervesi; Autopilot hanya jalan setelah klien ACC. Modul murni (diuji vitest).
 */

/** Nilai apa pun → teks (objek/array digabung), lalu dipotong. Jawaban AI sering tidak persis sesuai bentuk. */
const asText = (v: unknown): string =>
  v === null || v === undefined
    ? ""
    : typeof v === "string"
      ? v
      : Array.isArray(v)
        ? v.map(asText).filter(Boolean).join(", ")
        : typeof v === "object"
          ? Object.values(v as object)
              .map(asText)
              .filter(Boolean)
              .join(" — ")
          : String(v);
const txt = (n: number, fallback = "") => z.preprocess((v) => asText(v) || fallback, clip(n));
const list = (n: number, max = 200) =>
  z.preprocess(
    (v) =>
      (Array.isArray(v) ? v : typeof v === "string" ? v.split(/\n+|;\s*/) : v && typeof v === "object" ? Object.values(v) : [])
        .map(asText)
        .map((x) => x.trim())
        .filter(Boolean),
    z.array(clip(max)).transform((a) => a.slice(0, n)),
  );
/** Objek wajib tapi toleran: hilang/bukan objek → {} (field memakai default). */
const obj = <T extends z.ZodRawShape>(shape: T) => z.preprocess((v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {}), z.object(shape));
const hex = z.preprocess(
  (v) => (typeof v === "string" && /^#?[0-9A-Fa-f]{6}$/.test(v.trim()) ? `#${v.trim().replace("#", "").toUpperCase()}` : v),
  z
    .string()
    .regex(/^#[0-9A-F]{6}$/)
    .catch("#0A3DFF"),
);
const hexOpt = z.preprocess(
  (v) => (typeof v === "string" && /^#?[0-9A-Fa-f]{6}$/.test(v.trim()) ? `#${v.trim().replace("#", "").toUpperCase()}` : undefined),
  z.string().optional(),
);

export const cdSchema = obj({
  big_idea: txt(240),
  positioning: txt(400),
  mood_keywords: list(5, 40),
  moodboard: txt(600),
  pillars: z.preprocess(
    (v) => (Array.isArray(v) ? v.map((p) => (typeof p === "string" ? { name: p } : p)).filter((p) => p && typeof p === "object") : []),
    z.array(obj({ name: txt(60, "Pilar"), description: txt(240) })).transform((a) => a.slice(0, 5)),
  ),
  consistency_notes: txt(800),
});

export const designerSchema = obj({
  palette: obj({ primary: hex, secondary: hex, accent: hexOpt, background: hexOpt, rules: txt(400) }),
  typography: obj({ font: z.enum(FONT_IDS).catch("jakarta"), rules: txt(300) }),
  layout_rules: txt(400),
  image_style: obj({ type: txt(120), lighting: txt(160), angle: txt(160), composition: txt(200) }),
  casting_guide: txt(500),
  prompt_style_guide: txt(800),
  style_dna: z.preprocess((v) => {
    const o = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
    return { ...o, name: asText(o.name) || "Brand DNA", description: asText(o.description) || "Gaya dari Brand DNA" };
  }, styleDnaSchema),
});

export const copywriterSchema = obj({
  tone: txt(240),
  pronoun: txt(40, "kamu"),
  vocabulary: list(15, 40),
  forbidden: list(20, 60),
  hook_patterns: list(6, 160),
  cta_style: txt(240),
  sample_captions: list(3, 700),
});

const mixNum = z.preprocess((v) => (typeof v === "string" ? v.replace("%", "") : v), z.coerce.number().catch(0)).transform((n) => Math.max(0, Math.min(100, Math.round(n))));
const count = (d: number) =>
  z.coerce
    .number()
    .catch(d)
    .transform((n) => Math.max(0, Math.min(14, Math.round(n))));
export const socmedSchema = obj({
  audience: obj({ profile: txt(400), problems: list(6), desires: list(6), active_times: txt(200) }),
  format_mix: obj({ carousel: count(3), reel: count(1), image: count(2) }),
  pillar_mix: obj({ edukasi: mixNum, relatable: mixNum, insight: mixNum, produk: mixNum }),
  posting_times: z
    .preprocess(
      (v) => (Array.isArray(v) ? v.map((x) => String(x).trim().replace(".", ":").padStart(5, "0")).filter((x) => /^([01]\d|2[0-3]):[0-5]\d$/.test(x)) : []),
      z.array(z.string()),
    )
    .transform((a) => [...new Set(a)].slice(0, 3)),
  competitor_benchmark: obj({ works: list(5), gaps: list(5) }),
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
/** Jawaban AI kadang dibungkus {"designer": {...}} → ambil isinya. */
export function unwrapRole(json: unknown, role: DnaRole): unknown {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const inner = (json as Record<string, unknown>)[role];
    if (inner && typeof inner === "object") return inner;
  }
  return json;
}

export function mergeDna(drafts: Partial<Record<DnaRole, unknown>>, cd: Partial<Record<DnaRole, unknown>>) {
  const pick = (role: DnaRole) => {
    const schema = {
      creative_director: cdSchema,
      designer: designerSchema,
      copywriter: copywriterSchema,
      socmed: socmedSchema,
    }[role] as z.ZodTypeAny;
    // Hanya objek yang dihitung (skema toleran akan menerima null sebagai objek kosong).
    const isObj = (v: unknown) => Boolean(v && typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length);
    const fromCd = unwrapRole(cd[role], role);
    if (isObj(fromCd)) {
      const a = schema.safeParse(fromCd);
      if (a.success) return a.data;
    }
    const fromDraft = unwrapRole(drafts[role], role);
    if (!isObj(fromDraft)) return null;
    const b = schema.safeParse(fromDraft);
    return b.success ? b.data : null;
  };
  const out = {
    creative_director: pick("creative_director"),
    designer: pick("designer"),
    copywriter: pick("copywriter"),
    socmed: pick("socmed"),
  };
  if (Object.values(out).some((v) => v === null)) return null;
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
