import { z } from "zod";
import { opts, type ToolForm } from "../fields";
import { PLATFORM_OPTIONS, monthOptions, t } from "./common";

export const calendarForm: ToolForm = {
  fields: [
    { type: "text", name: "brand", label: "Nama brand *", required: true, max: 100, placeholder: "mis. Kopi Senja", half: true },
    { type: "select", name: "month", label: "Bulan", options: opts(monthOptions(3)), default: monthOptions(3)[1][0], half: true },
    {
      type: "textarea",
      name: "business",
      label: "Produk & target pembeli *",
      required: true,
      min: 15,
      max: 1500,
      rows: 4,
      placeholder: "mis. Kopi susu literan gula aren Rp45rb, dijual di Shopee & TikTok Shop. Target pekerja 22-35 th Jabodetabek yang ngopi tiap hari tapi mau hemat.",
    },
    { type: "chips", name: "platforms", label: "Platform *", options: opts(PLATFORM_OPTIONS), defaults: ["instagram", "tiktok"] },
    {
      type: "select",
      name: "goal",
      label: "Tujuan utama bulan ini",
      options: opts([
        ["awareness", "Dikenal lebih banyak orang"],
        ["engagement", "Interaksi & komunitas"],
        ["sales", "Penjualan"],
        ["launch", "Peluncuran produk/promo"],
        ["education", "Edukasi pasar"],
      ]),
      default: "sales",
      half: true,
    },
    { type: "number", name: "per_week", label: "Jumlah posting per minggu (semua platform)", min: 2, max: 14, default: 5, half: true },
    { type: "text", name: "tone", label: "Gaya bahasa brand (opsional)", max: 200, placeholder: "mis. santai, akrab, sedikit jenaka", half: true },
    { type: "text", name: "resources", label: "Kemampuan produksi (opsional)", max: 200, placeholder: "mis. 1 orang, HP saja, tanpa talent", half: true },
    { type: "textarea", name: "agenda", label: "Promo / agenda bulan itu (opsional)", max: 800, rows: 2, placeholder: "mis. Payday sale 25-28, launching varian baru tgl 10" },
  ],
  steps: ["Membaca brand & target pembeli…", "Menentukan pilar konten…", "Mencari momen & tanggal penting…", "Menulis ide, hook & caption…", "Menyusun kalender & file Excel…"],
};

export const calendarOutput = z.object({
  summary: t(400).describe("Arah konten bulan ini dalam 2-3 kalimat: apa yang ingin dicapai dan bagaimana"),
  strategy: z.object({
    objective: t(200).describe("Tujuan terukur bulan ini"),
    insight: t(240).describe("Insight audiens yang jadi dasar konten"),
    angle: t(200).describe("Sudut pandang / tema besar bulan ini"),
  }),
  pillars: z
    .array(z.object({ name: t(30), purpose: t(160), share_pct: z.number().describe("Porsi dari total posting (%)"), formats: z.array(t(30)) }))
    .describe("3-5 pilar konten, total share_pct 100"),
  key_dates: z.array(z.object({ date: t(10).describe("YYYY-MM-DD"), moment: t(60), idea: t(160) })).describe("Momen relevan di bulan itu"),
  posts: z
    .array(
      z.object({
        date: t(10).describe("YYYY-MM-DD, di dalam bulan yang diminta"),
        time: t(5).describe("Jam tayang terbaik, mis. 19.00"),
        platform: t(20),
        format: t(30).describe("Reels, Carousel, Single image, Story, Video TikTok, Live, dsb."),
        pillar: t(30).describe("Harus salah satu nama pilar"),
        title: t(80).describe("Judul internal/ide konten"),
        hook: t(120).describe("Kalimat/visual 3 detik pertama atau slide pertama"),
        caption: t(700).describe("Caption siap posting, gaya bahasa target; boleh baris baru & emoji secukupnya"),
        cta: t(80),
        hashtags: z.array(t(30)).describe("3-8 hashtag relevan"),
        visual: t(220).describe("Arahan visual/shot singkat untuk desainer atau videografer"),
      }),
    )
    .describe("Semua posting sebulan, urut tanggal"),
  kpis: z.array(z.object({ metric: t(50), target: t(60) })).describe("3-5 KPI bulan ini"),
  workflow: z.array(t(200)).describe("3-5 tips produksi & alur kerja realistis (batch produksi, approval, repurpose)"),
});

export type CalendarOutput = z.infer<typeof calendarOutput>;
