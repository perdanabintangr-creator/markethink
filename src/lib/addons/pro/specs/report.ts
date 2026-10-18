import { z } from "zod";
import { opts, type ToolForm } from "../fields";
import { t } from "./common";

export const reportForm: ToolForm = {
  fields: [
    { type: "text", name: "brand", label: "Brand / klien *", required: true, max: 100, placeholder: "mis. Kopi Senja", half: true },
    { type: "text", name: "period", label: "Periode laporan *", required: true, max: 60, placeholder: "mis. September 2026", half: true },
    {
      type: "files",
      name: "attachment_ids",
      label: "Data bulan ini",
      hint: "Upload export Ads Manager, insight Instagram/TikTok, laporan penjualan marketplace, atau screenshot dashboard. CSV, Excel, PDF, PNG/JPG, maks 5 file.",
      accept: ".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp",
      max: 5,
    },
    {
      type: "textarea",
      name: "data",
      label: "Atau tulis angka utamanya",
      max: 3000,
      rows: 4,
      hint: "Isi bila tidak ada file, atau untuk melengkapi. Angka bulan lalu membuat analisis lebih tajam.",
      placeholder: "mis. Omzet Rp84 jt (Agu Rp71 jt), 1.240 order, biaya iklan Meta Rp12 jt ROAS 3,1x, TikTok Ads Rp5 jt ROAS 2,2x, followers IG +1.350, ER 3,8%",
    },
    { type: "textarea", name: "targets", label: "Target bulan ini (opsional)", max: 800, rows: 2, placeholder: "mis. Omzet Rp90 jt, ROAS minimal 3x, 1.500 order" },
    {
      type: "chips",
      name: "channels",
      label: "Kanal yang dilaporkan *",
      options: opts([
        ["meta_ads", "Meta Ads"],
        ["tiktok_ads", "TikTok Ads"],
        ["google_ads", "Google Ads"],
        ["marketplace", "Marketplace"],
        ["instagram", "Instagram organik"],
        ["tiktok", "TikTok organik"],
        ["website", "Website"],
        ["whatsapp", "WhatsApp / CRM"],
        ["kol", "KOL / Affiliate"],
        ["offline", "Toko / offline"],
      ]),
      defaults: ["meta_ads", "marketplace", "instagram"],
    },
    {
      type: "select",
      name: "audience",
      label: "Laporan untuk",
      options: opts([
        ["owner", "Owner / atasan"],
        ["client", "Klien (laporan agency)"],
        ["team", "Tim internal"],
      ]),
      default: "owner",
      half: true,
    },
    { type: "text", name: "color", label: "Warna brand untuk PPT (opsional)", max: 7, placeholder: "mis. #E11D48", half: true },
  ],
  steps: ["Membaca data & file laporan…", "Menghitung KPI vs target & bulan lalu…", "Menganalisis tiap kanal…", "Merumuskan insight & rencana bulan depan…", "Menyusun PPT & Excel…"],
};

const kpiStatus = z.enum(["tercapai", "hampir", "tertinggal", "tanpa_target"]);

export const reportOutput = z.object({
  headline: t(140).describe("1 kalimat kesimpulan bulan ini untuk pembaca sibuk, berangka"),
  summary: t(600).describe("Ringkasan eksekutif 3-4 kalimat: hasil, penyebab utama, dan keputusan yang diusulkan"),
  kpis: z
    .array(
      z.object({
        name: t(40),
        value: z.number().nullable().describe("Nilai bulan ini (angka penuh, Rupiah tanpa titik)"),
        unit: z.enum(["Rp", "%", "x", "angka"]),
        previous: z.number().nullable().describe("Bulan lalu bila ada"),
        target: z.number().nullable(),
        status: kpiStatus,
        note: t(160),
      }),
    )
    .describe("5-10 KPI terpenting, urut dari yang paling penting untuk bisnis"),
  channels: z
    .array(
      z.object({
        channel: t(30),
        spend: z.number().nullable().describe("Biaya (Rp) bila ada"),
        revenue: z.number().nullable().describe("Pendapatan yang diatribusikan (Rp) bila ada"),
        result: z.number().nullable().describe("Hasil utama (order/lead/followers/reach)"),
        result_label: t(30),
        verdict: z.enum(["bagus", "stabil", "perlu_perbaikan"]),
        highlight: t(200),
        issue: t(200),
      }),
    )
    .describe("Satu baris per kanal yang ada datanya"),
  wins: z.array(z.object({ title: t(80), detail: t(220) })).describe("2-4 hal yang berhasil, dengan angka"),
  issues: z.array(z.object({ title: t(80), detail: t(220), impact: z.enum(["tinggi", "sedang", "rendah"]) })).describe("2-4 masalah & dampaknya"),
  insights: z.array(z.object({ insight: t(200), evidence: t(220), so_what: t(200) })).describe("3-4 insight: temuan → bukti → artinya untuk bisnis"),
  next_month: z.object({
    focus: t(200).describe("Fokus utama bulan depan"),
    actions: z.array(z.object({ action: t(160), owner: t(40), deadline: t(30), kpi: t(80) })).describe("4-7 aksi konkret"),
    budget: t(300).describe("Usulan pergeseran budget antar kanal dengan alasan; kosongkan bila tidak relevan"),
  }),
  data_notes: t(400).describe("Keterbatasan data & asumsi yang dipakai"),
});

export type ReportOutput = z.infer<typeof reportOutput>;

export const STATUS_LABEL: Record<ReportOutput["kpis"][number]["status"], string> = {
  tercapai: "Tercapai",
  hampir: "Hampir",
  tertinggal: "Tertinggal",
  tanpa_target: "Tanpa target",
};

const idn = (n: number, d: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: d }).format(n);
const shortIdr = (n: number) =>
  Math.abs(n) >= 1e9 ? `Rp${idn(n / 1e9, 1)} M` : Math.abs(n) >= 1e6 ? `Rp${idn(n / 1e6, 1)} jt` : Math.abs(n) >= 1e3 ? `Rp${idn(n / 1e3, 0)} rb` : `Rp${idn(n, 0)}`;

/** Format nilai KPI sesuai satuannya (dipakai di halaman hasil, PPT, dan Excel). */
export function kpiValue(k: { unit: ReportOutput["kpis"][number]["unit"] }, v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "-";
  if (k.unit === "Rp") return shortIdr(v);
  if (k.unit === "%") return `${idn(v, 1)}%`;
  if (k.unit === "x") return `${idn(v, 2)}x`;
  return idn(v, 0);
}
