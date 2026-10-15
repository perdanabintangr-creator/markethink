import { z } from "zod";
import { opts, type ToolForm } from "../fields";
import { t } from "./common";
import { CHANNEL_OPTIONS, budgetBasis } from "./plan";

export const CAMPAIGN_OBJECTIVES: [string, string][] = [
  ["awareness", "Awareness — dikenal lebih banyak orang"],
  ["consideration", "Consideration — dipertimbangkan & dicoba"],
  ["sales", "Penjualan"],
  ["launch", "Launching produk/varian baru"],
  ["retention", "Retensi — pembelian ulang & loyalitas"],
];

export const campaignForm: ToolForm = {
  fields: [
    { type: "text", name: "brand", label: "Nama brand *", required: true, max: 100, placeholder: "mis. Glowlab Skincare", half: true },
    { type: "select", name: "objective", label: "Tujuan kampanye", options: opts(CAMPAIGN_OBJECTIVES), default: "sales", half: true },
    {
      type: "textarea",
      name: "product",
      label: "Produk / layanan yang dikampanyekan *",
      required: true,
      min: 10,
      max: 1200,
      rows: 3,
      placeholder: "mis. Serum Niacinamide 10% 20ml Rp89rb — varian baru untuk kulit berminyak & bekas jerawat, tekstur ringan, sudah BPOM.",
    },
    {
      type: "textarea",
      name: "audience",
      label: "Target audiens",
      max: 600,
      rows: 2,
      placeholder: "mis. Perempuan 18-27 th, mahasiswi & first jobber, kulit berminyak, belanja skincare di TikTok Shop & Shopee",
    },
    { type: "text", name: "period", label: "Periode kampanye", max: 100, placeholder: "mis. 1-30 November 2026 (6 minggu termasuk teaser)", half: true },
    { type: "text", name: "budget", label: "Budget kampanye (total)", max: 120, placeholder: "mis. Rp60 jt total (media + KOL + produksi)", half: true },
    {
      type: "chips",
      name: "channels",
      label: "Kanal yang ingin dipakai",
      hint: "Kosongkan bila ingin direkomendasikan.",
      options: opts(CHANNEL_OPTIONS),
      defaults: ["instagram", "tiktok", "kol"],
      min: 0,
    },
    {
      type: "textarea",
      name: "context",
      label: "Situasi / masalah yang ingin dipecahkan",
      max: 1000,
      rows: 3,
      placeholder: "mis. Penjualan serum lama stagnan Rp40 jt/bulan; pembeli bingung bedanya dengan produk kompetitor yang lebih murah. Ingin dikenal sebagai ahlinya kulit berminyak.",
    },
    {
      type: "textarea",
      name: "mandatory",
      label: "Wajib ada / dilarang (opsional)",
      max: 600,
      rows: 2,
      placeholder: "mis. Wajib logo BPOM & nomor notifikasi; dilarang klaim 'menghilangkan jerawat' atau membandingkan merek lain",
    },
  ],
  steps: [
    "Membaca brand, produk & masalah bisnis…",
    "Menggali consumer insight…",
    "Merumuskan proposition & big idea…",
    "Menyusun channel plan & deliverables…",
    "Menghitung timeline & budget…",
    "Membuat PPT brief & Excel…",
  ],
};

export const campaignPhase = z.enum(["teaser", "launch", "sustain"]);
export const PHASE_LABEL: Record<z.infer<typeof campaignPhase>, string> = { teaser: "Teaser", launch: "Launch", sustain: "Sustain" };

export const campaignOutput = z.object({
  name: t(40).describe("Nama kampanye internal yang mudah diingat (bukan tagline)"),
  name_note: t(160).describe("Kenapa nama ini"),
  background: t(500).describe("Latar belakang: kondisi brand & pasar, 2-4 kalimat berangka bila ada"),
  problem: t(240).describe("Masalah bisnis yang dipecahkan kampanye, 1-2 kalimat tajam"),
  objective: t(200).describe("Objective kampanye: apa yang harus berubah (perilaku/persepsi/penjualan), terukur"),
  kpis: z
    .array(z.object({ metric: t(50), target: t(12).describe("Angka target singkat ≤12 karakter, mis. '2.000 order', 'ROAS 3x'"), note: t(120).describe("Cara hitung / sumber data") }))
    .describe("2-4 KPI utama kampanye"),
  audience: z.object({
    profile: t(240).describe("Siapa mereka: demografi + kebiasaan relevan, singkat"),
    current: t(200).describe("Apa yang mereka pikir/lakukan sekarang tentang kategori/brand"),
    desired: t(200).describe("Apa yang kita ingin mereka pikir/lakukan setelah kampanye"),
    insight: t(260).describe("Consumer insight: kebenaran manusiawi + ketegangan, ditulis dari sudut pandang konsumen (bukan data demografi)"),
  }),
  proposition: t(120).describe("Single-minded proposition: satu hal paling meyakinkan yang ingin diingat"),
  big_idea: z.object({ title: t(60), description: t(500).describe("Penjelasan big idea & bagaimana muncul di tiap kanal"), why: t(240).describe("Kenapa ide ini menjawab insight") }),
  key_message: t(200).describe("Pesan kunci dalam bahasa konsumen"),
  taglines: z.array(z.object({ line: t(60), note: t(140) })).describe("Tepat 3 opsi tagline kampanye"),
  rtb: z.array(t(160)).describe("2-4 reasons to believe (fakta produk dari user)"),
  tone: z.object({ words: z.array(t(20)).describe("3-4 kata sifat tone"), note: t(240).describe("Arahan tone untuk penulis & kreator") }),
  channels: z
    .array(
      z.object({
        channel: t(40),
        role: t(120).describe("Peran kanal dalam kampanye"),
        execution: t(260).describe("Konten/eksekusi spesifik: format, mekanik, jumlah"),
        phase: z.enum(["teaser", "launch", "sustain", "semua"]),
        timing: t(60).describe("Kapan jalan, mis. 'Minggu 2-4'"),
      }),
    )
    .describe("4-7 kanal"),
  deliverables: z
    .array(
      z.object({
        item: t(60).describe("mis. 'Video TikTok 30 dtk'"),
        qty: z.number().describe("Jumlah"),
        spec: t(140).describe("Spesifikasi: rasio, durasi, ukuran, catatan teknis"),
        channel: t(30),
        owner: t(40).describe("PIC: Tim internal / agency / KOL / desainer"),
        deadline: t(30).describe("Tenggat, mis. 'H-7 launch' atau tanggal"),
      }),
    )
    .describe("6-12 deliverables siap produksi"),
  phases: z
    .array(
      z.object({
        phase: campaignPhase,
        period: t(40).describe("Rentang tanggal/minggu"),
        goal: t(140),
        activities: z.array(t(140)).describe("3-5 aktivitas"),
      }),
    )
    .describe("Tepat 3 fase: teaser, launch, sustain"),
  budget: z.object({
    total: z.number().nullable().describe("Total budget kampanye (Rupiah penuh) dari isian user; bila kosong, rekomendasi realistis"),
    basis: budgetBasis,
    items: z
      .array(z.object({ item: t(50), pct: z.number(), amount: z.number().nullable().describe("Dihitung program"), note: t(140) }))
      .describe("4-7 pos budget (media per kanal, KOL, produksi, promo/voucher, cadangan), total 100%"),
  }),
  mandatories: z.object({
    must: z.array(t(140)).describe("Elemen wajib (logo, legal, disclaimer, hashtag kampanye, CTA)"),
    avoid: z.array(t(140)).describe("Larangan (klaim, kata, visual, kompetitor)"),
  }),
  success: z
    .array(z.object({ level: z.enum(["bisnis", "kampanye", "konten"]), metric: t(50), target: t(50), how: t(120).describe("Alat ukur & waktu evaluasi") }))
    .describe("4-7 success metrics berjenjang: bisnis, kampanye, konten"),
});

export type CampaignOutput = z.infer<typeof campaignOutput>;
