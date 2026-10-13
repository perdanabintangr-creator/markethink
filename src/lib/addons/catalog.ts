/**
 * Katalog add-on "Tools Pro" (teks UI). Harga & kuota disimpan di tabel `addons` (bisa diubah di back office).
 * Aman dipakai di server maupun client.
 */

export type AddonId = "jualan_kit" | "dokter_iklan" | "riset_pro";
export type ToolId = "listing" | "live" | "whatsapp" | "ads" | "calc" | "competitor" | "kol";

export interface AddonInfo {
  id: AddonId;
  name: string;
  emoji: string;
  tagline: string;
  /** Harga & kuota bawaan (cadangan bila DB tidak terbaca). */
  price: number;
  quota: number;
  tools: ToolId[];
}

export interface ToolInfo {
  id: ToolId;
  addon: AddonId;
  name: string;
  short: string;
  /** Hasil yang didapat user — ditampilkan di kartu tool. */
  outputs: string[];
  /** Tool tanpa AI (kalkulator) tidak memotong kuota. */
  noQuota?: boolean;
}

export const ADDONS: AddonInfo[] = [
  {
    id: "jualan_kit",
    name: "Jualan Online Kit",
    emoji: "🛒",
    tagline: "Listing marketplace, skrip live selling & template WhatsApp",
    price: 30000,
    quota: 15,
    tools: ["listing", "live", "whatsapp"],
  },
  {
    id: "dokter_iklan",
    name: "Dokter Iklan",
    emoji: "📊",
    tagline: "Rapor laporan iklan, rekomendasi budget & kalkulator",
    price: 50000,
    quota: 10,
    tools: ["ads", "calc"],
  },
  {
    id: "riset_pro",
    name: "Riset Pasar Pro",
    emoji: "🔎",
    tagline: "Riset kompetitor & brief KOL/affiliate",
    price: 50000,
    quota: 6,
    tools: ["competitor", "kol"],
  },
];

export const TOOLS: ToolInfo[] = [
  {
    id: "listing",
    addon: "jualan_kit",
    name: "Optimasi Listing Marketplace",
    short: "Judul, deskripsi & kata kunci produk untuk Shopee, TikTok Shop, Tokopedia.",
    outputs: ["Judul & deskripsi per platform", "Tabel kata kunci berprioritas", "Sebelum vs sesudah", "Excel"],
  },
  {
    id: "live",
    addon: "jualan_kit",
    name: "Skrip Live Selling",
    short: "Rundown live berwaktu + kalimat host, flash sale & jawaban keberatan pembeli.",
    outputs: ["Rundown per menit", "Mode contekan host", "PPT contekan", "Excel rundown"],
  },
  {
    id: "whatsapp",
    addon: "jualan_kit",
    name: "Template WhatsApp",
    short: "Pesan broadcast, follow-up & balasan cepat yang siap kirim.",
    outputs: ["Pratinjau gelembung WA", "Tombol salin", "Excel template"],
  },
  {
    id: "ads",
    addon: "dokter_iklan",
    name: "Analis Laporan Iklan",
    short: "Upload laporan Meta/TikTok/Shopee Ads → rapor, iklan boros vs bagus, budget baru.",
    outputs: ["Skor kesehatan & grafik", "Rapor per kampanye", "Usulan budget", "PPT laporan", "Excel bertanda warna"],
  },
  {
    id: "calc",
    addon: "dokter_iklan",
    name: "Kalkulator Bisnis",
    short: "Harga jual dari HPP, ROAS impas, dan budget iklan untuk target omzet.",
    outputs: ["Hitung instan", "Tanpa memotong kuota"],
    noQuota: true,
  },
  {
    id: "competitor",
    addon: "riset_pro",
    name: "Riset Kompetitor",
    short: "Riset web otomatis: harga, keunggulan, peta posisi, SWOT & celah konten.",
    outputs: ["Tabel perbandingan", "Peta posisi brand", "SWOT", "Sumber riset", "PPT laporan", "Excel"],
  },
  {
    id: "kol",
    addon: "riset_pro",
    name: "Brief KOL / Affiliate",
    short: "Brief kreator siap kirim + estimasi fee & pesan DM ajakan kerja sama.",
    outputs: ["Dokumen brief", "Estimasi fee", "Template DM", "PPT brief"],
  },
];

export const toolInfo = (id: string) => TOOLS.find((t) => t.id === id);
export const addonInfo = (id: string) => ADDONS.find((a) => a.id === id);
