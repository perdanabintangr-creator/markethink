import { z } from "zod";
import { opts, type ToolForm } from "../fields";
import { priority, t } from "./common";

export const PRESS_TYPES: [string, string][] = [
  ["launch", "Peluncuran produk / layanan"],
  ["partnership", "Kerja sama / kemitraan"],
  ["milestone", "Pencapaian / milestone"],
  ["event", "Acara"],
  ["csr", "CSR / kegiatan sosial"],
  ["funding", "Pendanaan / investasi"],
  ["statement", "Pernyataan resmi"],
];

export const MEDIA_DESKS: [string, string][] = [
  ["nasional", "Nasional / umum"],
  ["bisnis", "Bisnis & ekonomi"],
  ["teknologi", "Teknologi"],
  ["lifestyle", "Lifestyle"],
  ["lokal", "Lokal / daerah"],
  ["trade", "Trade / industri"],
];

export const pressForm: ToolForm = {
  fields: [
    { type: "text", name: "organization", label: "Nama perusahaan / organisasi *", required: true, max: 120, placeholder: "mis. PT Kopi Senja Nusantara", half: true },
    { type: "select", name: "type", label: "Jenis berita", options: opts(PRESS_TYPES), default: "launch", half: true },
    {
      type: "textarea",
      name: "details",
      label: "Detail berita *",
      required: true,
      min: 30,
      max: 4000,
      rows: 6,
      hint: "Apa yang terjadi, kapan, di mana, angka penting, siapa yang terlibat, dan manfaatnya untuk publik. Makin banyak fakta, makin kuat beritanya.",
      placeholder:
        "mis. Kopi Senja membuka gerai ke-50 di Bandung (Jl. Braga 12) pada 3 November 2026. Sejak berdiri 2019 di Yogyakarta, sudah melayani 2,1 juta transaksi. Gerai ini mempekerjakan 18 warga sekitar dan memakai 100% biji kopi dari petani Pangalengan (kemitraan dengan 40 petani). Promo pembukaan: beli 1 gratis 1 selama 3 hari.",
    },
    { type: "text", name: "spokesperson", label: "Narasumber (nama & jabatan)", max: 200, placeholder: "mis. Rina Hartono, CEO Kopi Senja; Asep Sutisna, Ketua Kelompok Tani", half: true },
    { type: "text", name: "dateline", label: "Kota & tanggal rilis", max: 80, placeholder: "mis. Bandung, 3 November 2026", half: true },
    { type: "text", name: "contact", label: "Kontak media", max: 200, placeholder: "mis. Dewi (PR) · 0812-xxxx-xxxx · pr@kopisenja.id", half: true },
    { type: "textarea", name: "boilerplate", label: "Tentang perusahaan (opsional)", max: 1200, rows: 3, placeholder: "mis. Kopi Senja adalah jaringan kedai kopi susu asal Yogyakarta yang berdiri sejak 2019…" },
    { type: "chips", name: "target_media", label: "Sasaran media *", options: opts(MEDIA_DESKS), defaults: ["nasional", "bisnis", "lifestyle"] },
  ],
  steps: ["Mencari sudut berita yang layak muat…", "Menyusun judul & lead 5W1H…", "Menulis badan berita & kutipan narasumber…", "Menyiapkan email pitching & daftar media…", "Menyusun Q&A wartawan & checklist distribusi…"],
};

export const pressOutput = z.object({
  headlines: z
    .array(
      z.object({
        title: t(90).describe("Judul berita ≤90 karakter: subjek + kata kerja aktif + fakta/angka; bukan slogan iklan"),
        subtitle: t(160).describe("Subjudul 1 kalimat yang menambah fakta penting"),
        angle: t(60).describe("Sudut berita, mis. 'angka pertumbuhan', 'dampak ke petani lokal'"),
      }),
    )
    .describe("Tepat 3 opsi judul dengan sudut berbeda; opsi pertama = paling kuat"),
  dateline: t(60).describe("KOTA, tanggal bulan tahun — mis. 'BANDUNG, 3 November 2026'"),
  lead: t(450).describe("Paragraf pembuka 5W1H, 1-2 kalimat, ≤45 kata"),
  body: z.array(t(700)).describe("3-5 paragraf badan berita, piramida terbalik, tanpa kutipan narasumber"),
  quotes: z
    .array(
      z.object({
        speaker: t(100).describe("Nama, jabatan, organisasi narasumber (atau placeholder [Nama], [Jabatan])"),
        paragraph: t(500).describe("Paragraf kutipan lengkap dengan atribusi, mis. “…,” ujar Rina Hartono, CEO Kopi Senja."),
        after: z.number().describe("Diletakkan setelah paragraf badan ke-berapa (1 = setelah paragraf badan pertama)"),
      }),
    )
    .describe("1-2 kutipan narasumber"),
  boilerplate_title: t(80).describe("'Tentang <nama organisasi>'"),
  boilerplate: t(700).describe("Profil singkat organisasi 60-100 kata"),
  media_contact: t(300).describe("Kontak media: nama, jabatan, telepon/WA, email — atau placeholder"),
  notes_to_editor: t(300).describe("Catatan untuk editor (foto terlampir, data pendukung, ketersediaan wawancara); kosong bila tidak perlu"),
  social: z.array(z.object({ platform: t(30), text: t(700) })).describe("2 versi singkat: LinkedIn dan Instagram/X"),
  pitch: z.object({
    subject: t(80).describe("Subjek email ≤70 karakter, bernilai berita"),
    body: t(1100).describe("Isi email ≤150 kata, sapaan [Nama wartawan]"),
  }),
  media_targets: z
    .array(
      z.object({
        desk: t(50).describe("Kategori/desk media"),
        outlets: z.array(t(40)).describe("3-6 contoh outlet Indonesia nyata yang relevan (nama media saja, tanpa nama wartawan)"),
        angle: t(220).describe("Sudut khusus yang ditawarkan ke desk ini"),
        priority,
      }),
    )
    .describe("Satu baris per desk yang dipilih user (4-6)"),
  qa: z.array(z.object({ question: t(180), answer: t(450) })).describe("5-8 pertanyaan wartawan yang mungkin muncul + jawaban aman & jujur"),
  distribution: z.object({
    best_time: t(260).describe("Hari & jam kirim terbaik beserta alasannya"),
    embargo: t(260).describe("Perlu embargo atau tidak, kapan dicabut, alasannya"),
    assets: z.array(t(160)).describe("3-5 lampiran yang perlu disiapkan (foto, logo, factsheet)"),
    checklist: z.array(z.object({ task: t(160), when: t(40).describe("mis. H-3, Hari H 08.00, H+1") })).describe("6-10 langkah distribusi berurutan"),
  }),
  to_verify: z.array(t(180)).describe("Hal yang wajib dilengkapi/diverifikasi sebelum kirim (placeholder [..], angka belum pasti); kosong bila tidak ada"),
});

export type PressOutput = z.infer<typeof pressOutput>;

export const PRESS_TYPE_LABEL = Object.fromEntries(PRESS_TYPES) as Record<string, string>;
export const DESK_LABEL = Object.fromEntries(MEDIA_DESKS) as Record<string, string>;

/** Jumlah kata (untuk cek panjang email pitching). */
export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Urutan paragraf siaran pers: lead → badan berita dengan kutipan disisipkan di posisinya. */
export function pressParagraphs(data: PressOutput) {
  const out: { kind: "lead" | "body" | "quote"; text: string }[] = [{ kind: "lead", text: `${data.dateline.replace(/\s*[–—-]\s*$/, "")} – ${data.lead}` }];
  const quotes = [...data.quotes].sort((a, b) => (a.after ?? 1) - (b.after ?? 1));
  data.body.forEach((p, i) => {
    out.push({ kind: "body", text: p });
    for (const q of quotes) if (Math.max(1, Math.min(data.body.length, Math.round(q.after ?? 1))) === i + 1) out.push({ kind: "quote", text: q.paragraph });
  });
  if (!data.body.length) for (const q of quotes) out.push({ kind: "quote", text: q.paragraph });
  return out;
}

/** Teks siaran pers utuh siap salin (memakai opsi judul terpilih). */
export function pressText(data: PressOutput, headline = 0) {
  const h = data.headlines[headline] ?? data.headlines[0];
  return [
    "SIARAN PERS",
    "Untuk segera diterbitkan",
    "",
    h?.title ?? "",
    h?.subtitle ?? "",
    "",
    ...pressParagraphs(data).flatMap((p) => [p.text, ""]),
    "###",
    "",
    data.boilerplate_title,
    data.boilerplate,
    "",
    "Kontak media:",
    data.media_contact,
    ...(data.notes_to_editor ? ["", `Catatan untuk editor: ${data.notes_to_editor}`] : []),
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
