import { z } from "zod";
import { opts, type ToolForm } from "../fields";
import { t } from "./common";

export const adcopyForm: ToolForm = {
  fields: [
    { type: "text", name: "brand", label: "Nama brand *", required: true, max: 100, placeholder: "mis. Kopi Senja", half: true },
    {
      type: "select",
      name: "platform",
      label: "Platform iklan",
      options: opts([
        ["meta", "Meta (Facebook & Instagram)"],
        ["tiktok", "TikTok Ads"],
        ["google", "Google Search Ads"],
        ["shopee", "Shopee Ads"],
      ]),
      default: "meta",
      half: true,
    },
    {
      type: "textarea",
      name: "product",
      label: "Produk & harga *",
      required: true,
      min: 10,
      max: 1200,
      rows: 3,
      placeholder: "mis. Kopi susu literan gula aren 1 liter Rp45rb (isi 6 gelas), tahan 5 hari di kulkas, dikirim instan Jabodetabek.",
    },
    { type: "text", name: "offer", label: "Promo / penawaran (opsional)", max: 200, placeholder: "mis. Beli 2 gratis ongkir + bonus 250 ml, s.d. 31 Okt", half: true },
    { type: "text", name: "landing", label: "Iklan diarahkan ke", max: 200, placeholder: "mis. Toko Shopee / WhatsApp / kopisenja.id", half: true },
    {
      type: "select",
      name: "objective",
      label: "Tujuan iklan",
      options: opts([
        ["penjualan", "Penjualan"],
        ["leads", "Leads / chat WhatsApp"],
        ["traffic", "Traffic ke website/toko"],
        ["awareness", "Awareness"],
        ["install", "Install aplikasi"],
      ]),
      default: "penjualan",
      half: true,
    },
    { type: "number", name: "count", label: "Jumlah variasi", min: 6, max: 10, default: 8, suffix: "variasi", half: true },
    { type: "textarea", name: "audience", label: "Target audiens (opsional)", max: 600, rows: 2, placeholder: "mis. Pekerja kantoran 22-35 th Jabodetabek, ngopi tiap hari, sering beli kopi Rp25rb/gelas" },
    {
      type: "textarea",
      name: "usp",
      label: "Keunggulan & bukti (opsional)",
      max: 1000,
      rows: 3,
      hint: "Tulis bukti yang benar-benar ada: rating, jumlah terjual, testimoni, sertifikat. AI tidak akan mengarang klaim.",
      placeholder: "mis. Rating 4,9 dari 2.100 ulasan Shopee, gula aren asli tanpa pemanis buatan, diseduh pagi dikirim hari itu",
    },
    { type: "text", name: "budget", label: "Budget iklan per hari (opsional)", max: 60, placeholder: "mis. Rp300rb/hari", half: true },
  ],
  steps: ["Membaca produk, penawaran & bukti…", "Memetakan angle & audiens…", "Menulis hook, primary text & headline…", "Mengecek batas karakter & kebijakan iklan…", "Menyusun rencana tes A/B & Excel…"],
};

export const AD_FORMATS = ["single_image", "video", "carousel", "search", "collection"] as const;
export const FORMAT_LABEL: Record<(typeof AD_FORMATS)[number], string> = {
  single_image: "Single image",
  video: "Video",
  carousel: "Carousel",
  search: "Search",
  collection: "Collection",
};

export const adcopyOutput = z.object({
  strategy: z.object({
    summary: t(400).describe("Ringkasan strategi kreatif 2-3 kalimat: siapa yang disasar, pesan utama, dan cara menguji"),
    insight: t(240).describe("Insight audiens utama yang jadi dasar copy"),
    funnel: t(240).describe("Posisi iklan di funnel & apa yang terjadi setelah klik (landing, follow-up)"),
  }),
  angles: z.array(z.object({ name: t(40), why: t(200) })).describe("4-6 angle yang dipakai (pain, benefit, social proof, offer, curiosity, comparison, objection handling, dll.)"),
  variants: z
    .array(
      z.object({
        code: t(12).describe("Diisi sistem, kosongkan"),
        angle: t(40).describe("Salah satu nama angle di atas"),
        audience: t(120).describe("Audiens/penargetan untuk variasi ini"),
        format: z.enum(AD_FORMATS),
        hook: t(120).describe("Kalimat/visual pembuka yang menghentikan scroll (video: 0-3 detik; gambar: teks di visual)"),
        primary_text: t(500).describe("Primary text / ad text siap tempel"),
        headline: t(60).describe("Headline (Google: maks 30 karakter)"),
        description: t(120).describe("Deskripsi (Google: maks 90 karakter; Meta: link description pendek)"),
        extra_headlines: z.array(t(30)).describe("Google: 4-6 headline tambahan ≤30 karakter untuk RSA; platform lain: kosong"),
        extra_descriptions: z.array(t(90)).describe("Google: 1-2 deskripsi tambahan ≤90 karakter; platform lain: kosong"),
        cta_button: t(30).describe("Tombol CTA sesuai pilihan yang tersedia di platform"),
        visual: t(300).describe("Arahan visual/video untuk desainer/editor"),
        reason: t(200).describe("Kenapa variasi ini layak diuji"),
        flags: z.array(z.string()).optional().describe("Diisi sistem, kosongkan"),
      }),
    )
    .describe("Variasi iklan sesuai jumlah diminta, tersebar ke semua angle"),
  test_plan: z.object({
    structure: t(400).describe("Struktur kampanye: campaign → ad set/ad group → iklan, termasuk penamaan"),
    budget_split: z.array(z.object({ item: t(60), share_pct: z.number(), note: t(120) })).describe("Pembagian budget tes (total 100%)"),
    duration: t(160).describe("Durasi tes & syarat minimum data sebelum memutuskan"),
    primary_metric: t(120).describe("Metrik utama penentu pemenang & batasnya"),
    rules: z
      .array(z.object({ type: z.enum(["kill", "scale", "iterate"]), condition: t(160).describe("Kondisi berbasis angka"), action: t(160) }))
      .describe("4-6 aturan kill/scale/iterate berbasis angka"),
  }),
  compliance: z.array(z.object({ risk: t(120), guideline: t(200), fix: t(200) })).describe("3-5 catatan kepatuhan kebijakan iklan yang relevan dengan produk & copy ini"),
  platform: z.string().optional().describe("Diisi sistem, kosongkan"),
});

export type AdcopyOutput = z.infer<typeof adcopyOutput>;
export type AdVariant = AdcopyOutput["variants"][number];

/** Batas karakter per platform: hard = ditolak platform (dipotong), soft = terpotong di tampilan (ditandai). */
export const AD_LIMITS: Record<string, { headline?: number; description?: number; primary?: number; hard: boolean }> = {
  google: { headline: 30, description: 90, hard: true },
  tiktok: { primary: 100, hard: true },
  meta: { headline: 40, description: 30, primary: 125, hard: false },
  shopee: { headline: 60, hard: false },
};

export const PLATFORM_LABEL: Record<string, string> = { meta: "Meta Ads", tiktok: "TikTok Ads", google: "Google Search", shopee: "Shopee Ads" };

/** Teks satu variasi lengkap untuk disalin. */
export function variantText(v: AdVariant, platform: string) {
  if (platform === "google")
    return [
      `[${v.code}] ${v.angle}`,
      "Headline:",
      ...[v.headline, ...v.extra_headlines].map((h, i) => `${i + 1}. ${h} (${[...h].length})`),
      "Description:",
      ...[v.description, ...v.extra_descriptions].map((d, i) => `${i + 1}. ${d} (${[...d].length})`),
    ].join("\n");
  return [
    `[${v.code}] ${v.angle} · ${v.format}`,
    `Hook: ${v.hook}`,
    "",
    v.primary_text,
    "",
    `Headline: ${v.headline}`,
    v.description ? `Deskripsi: ${v.description}` : "",
    `Tombol: ${v.cta_button}`,
    "",
    `Visual: ${v.visual}`,
  ]
    .filter((x, i, a) => x !== "" || a[i - 1] !== "")
    .join("\n");
}
