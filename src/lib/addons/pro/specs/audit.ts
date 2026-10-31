import { z } from "zod";
import { opts, type ToolForm } from "../fields";
import { t } from "./common";

export const auditForm: ToolForm = {
  fields: [
    {
      type: "select",
      name: "platform",
      label: "Platform",
      options: opts([
        ["instagram", "Instagram"],
        ["tiktok", "TikTok"],
      ]),
      default: "instagram",
      half: true,
    },
    { type: "text", name: "handle", label: "Username akun *", required: true, max: 60, placeholder: "mis. @kopisenja.id", half: true },
    {
      type: "text",
      name: "link",
      label: "Link profil / website / toko (opsional)",
      max: 300,
      placeholder: "mis. https://www.instagram.com/kopisenja.id atau https://kopisenja.id",
      hint: "Marqthink membuka link ini dan memakai isinya sebagai bukti. Halaman yang butuh login (mis. sebagian profil IG/TikTok) mungkin tidak terbaca.",
    },
    {
      type: "textarea",
      name: "niche",
      label: "Brand & apa yang dijual *",
      required: true,
      min: 10,
      max: 800,
      rows: 3,
      placeholder: "mis. Kopi Senja, kopi susu literan gula aren Rp45rb, jualan di Shopee & TikTok Shop, target pekerja kantoran Jabodetabek 22-35 th.",
    },
    { type: "textarea", name: "bio", label: "Bio sekarang (salin apa adanya)", max: 300, rows: 2, placeholder: "mis. Kopi susu literan ☕ | Order via Shopee 👇 | linktr.ee/kopisenja" },
    { type: "text", name: "followers", label: "Jumlah followers", max: 40, placeholder: "mis. 3.240", half: true },
    { type: "text", name: "frequency", label: "Posting per minggu", max: 60, placeholder: "mis. 2-3x, tidak tentu", half: true },
    {
      type: "textarea",
      name: "data",
      label: "Data 5-10 konten terakhir / terbaik",
      max: 4000,
      rows: 6,
      hint: "Satu baris per konten: format, topik, views/reach, likes, komentar, saves/share. Makin lengkap, makin tajam auditnya.",
      placeholder:
        "mis.\nReels 12/9: tutorial seduh kopi literan, 8.400 views, 210 likes, 14 komen, 96 saves\nCarousel 10/9: promo 9.9, 900 reach, 31 likes, 2 komen\nFoto produk 7/9: 640 reach, 22 likes",
    },
    {
      type: "files",
      name: "attachment_ids",
      label: "Screenshot profil & insight (opsional)",
      hint: "Screenshot halaman profil, grid, dan insight/analitik 30 hari. PNG/JPG/PDF, maks 5 file.",
      accept: ".png,.jpg,.jpeg,.webp,.pdf,.csv,.xlsx",
      max: 5,
    },
    {
      type: "select",
      name: "goal",
      label: "Tujuan akun",
      options: opts([
        ["sales", "Jualan / order"],
        ["leads", "Chat & leads (DM/WhatsApp)"],
        ["awareness", "Dikenal lebih banyak orang"],
        ["community", "Komunitas & loyalitas"],
        ["authority", "Membangun kepercayaan/keahlian"],
      ]),
      default: "sales",
      half: true,
    },
  ],
  steps: ["Membaca profil, bio & data konten…", "Menilai 7 aspek akun…", "Mencari bukti dari data performa…", "Menulis bio baru & struktur highlight…", "Menyusun rencana 30 hari, PPT & Excel…"],
};

export const AUDIT_ASPECTS = [
  ["profile", "Profil & bio"],
  ["visual", "Identitas visual"],
  ["pillars", "Pilar & konsistensi"],
  ["hook", "Hook & storytelling"],
  ["engagement", "Engagement & komunitas"],
  ["funnel", "CTA & funnel penjualan"],
  ["cadence", "Frekuensi & waktu posting"],
] as const;

const aspectKey = z.enum(AUDIT_ASPECTS.map(([k]) => k) as [string, ...string[]]);

export const auditOutput = z.object({
  verdict: t(150).describe("1 kalimat vonis jujur kondisi akun, berangka bila ada data"),
  summary: t(500).describe("Ringkasan 3-4 kalimat: kekuatan utama, masalah terbesar, dan 1 perubahan dengan dampak paling besar"),
  score_total: z.number().describe("Skor total 0-100 (akan dihitung ulang sistem dari rata-rata aspek)"),
  aspects: z
    .array(
      z.object({
        key: aspectKey,
        name: t(40),
        score: z.number().describe("Skor 1-10"),
        finding: t(240).describe("Temuan utama, spesifik ke akun ini"),
        evidence: t(240).describe("Bukti dari data/screenshot user (angka, contoh konten). Bila tidak ada data, tulis 'Asumsi: …'"),
        fix: t(260).describe("Perbaikan konkret yang bisa dikerjakan minggu ini"),
        priority: z.enum(["tinggi", "sedang", "rendah"]),
      }),
    )
    .describe("Tepat 7 aspek, satu per key"),
  bio_options: z
    .array(z.object({ text: t(150).describe("Bio siap tempel, patuhi batas karakter platform; boleh baris baru & emoji secukupnya"), angle: t(100).describe("Pendekatan bio ini") }))
    .describe("3 opsi bio baru"),
  platform: z.string().optional().describe("Diisi sistem, kosongkan"),
  highlights: z
    .array(z.object({ type: z.enum(["highlight", "pinned"]), name: t(30), content: t(200).describe("Isi/konten yang ditaruh di sini dan tujuannya") }))
    .describe("4-6 highlight (Instagram) dan 3 posting yang disematkan (pinned)"),
  keep: z.array(z.object({ item: t(100), reason: t(200) })).describe("2-4 konten/kebiasaan yang dipertahankan, dengan bukti"),
  stop: z.array(z.object({ item: t(100), reason: t(200) })).describe("2-4 yang dihentikan"),
  start: z.array(z.object({ item: t(100), reason: t(200) })).describe("2-4 yang mulai dikerjakan"),
  plan: z
    .array(z.object({ week: z.number().describe("1-4"), focus: t(80), actions: z.array(t(160)).describe("3-5 aksi konkret"), output: t(120).describe("Hasil/deliverable minggu itu") }))
    .describe("Rencana 30 hari: tepat 4 minggu"),
  kpis: z
    .array(z.object({ metric: t(50), baseline: t(40).describe("Angka sekarang dari data; 'belum ada data' bila tidak ada"), target: t(40), how: t(120).describe("Cara mengukur") }))
    .describe("3-6 KPI 30 hari"),
  assumptions: z.array(t(200)).describe("Asumsi & data yang kurang; kosong bila data lengkap"),
});

export type AuditOutput = z.infer<typeof auditOutput>;

export const BIO_LIMIT: Record<string, number> = { instagram: 150, tiktok: 80 };

export const scoreTone = (s: number, max = 10) => {
  const r = s / max;
  return r >= 0.75 ? "good" : r >= 0.55 ? "warn" : "bad";
};

export const scoreLabel = (total: number) =>
  total >= 80 ? "Sehat, tinggal dioptimalkan" : total >= 65 ? "Cukup, tapi ada celah besar" : total >= 50 ? "Perlu perbaikan serius" : "Kritis, benahi fondasi dulu";
