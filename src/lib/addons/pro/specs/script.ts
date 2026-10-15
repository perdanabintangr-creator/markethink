import { z } from "zod";
import { opts, type ToolForm } from "../fields";
import { t } from "./common";

export const SCRIPT_STYLES: [string, string][] = [
  ["talking_head", "Talking head"],
  ["pov", "POV"],
  ["tutorial", "Tutorial / how-to"],
  ["before_after", "Before–after"],
  ["storytelling", "Storytelling"],
  ["review_ugc", "Review / UGC"],
  ["trend", "Ikut tren"],
  ["skit", "Skit / drama pendek"],
];

export const scriptForm: ToolForm = {
  fields: [
    { type: "text", name: "brand", label: "Nama brand *", required: true, max: 100, placeholder: "mis. Glowin Skincare", half: true },
    {
      type: "select",
      name: "platform",
      label: "Platform",
      options: opts([
        ["tiktok", "TikTok"],
        ["reels", "Instagram Reels"],
        ["shorts", "YouTube Shorts"],
      ]),
      default: "tiktok",
      half: true,
    },
    {
      type: "textarea",
      name: "topic",
      label: "Produk / topik & pesan utama *",
      required: true,
      min: 15,
      max: 1500,
      rows: 4,
      placeholder:
        "mis. Serum niacinamide 5% Rp89rb (30 ml) untuk bekas jerawat. Pesan: bekas jerawat memudar dalam 4 minggu pemakaian rutin, aman untuk kulit berminyak. Target cewek 18-28 th yang sering pakai concealer tebal.",
    },
    {
      type: "select",
      name: "duration",
      label: "Durasi video",
      options: opts([
        ["15", "15 detik"],
        ["30", "30 detik"],
        ["45", "45 detik"],
        ["60", "60 detik"],
      ]),
      default: "30",
      half: true,
    },
    {
      type: "select",
      name: "objective",
      label: "Tujuan video",
      options: opts([
        ["awareness", "Dikenal (awareness)"],
        ["engagement", "Interaksi (komen, share, save)"],
        ["jualan", "Jualan (klik keranjang / link)"],
        ["edukasi", "Edukasi"],
      ]),
      default: "jualan",
      half: true,
    },
    { type: "chips", name: "styles", label: "Gaya video *", options: opts(SCRIPT_STYLES), defaults: ["talking_head", "pov", "review_ugc"] },
    { type: "number", name: "count", label: "Jumlah naskah", min: 3, max: 5, default: 3, suffix: "naskah", half: true },
    { type: "text", name: "talent", label: "Siapa yang tampil & alat (opsional)", max: 200, placeholder: "mis. owner cewek 25 th, HP + ring light, tanpa mic", half: true },
    { type: "text", name: "tone", label: "Gaya bahasa (opsional)", max: 200, placeholder: "mis. santai kayak curhat ke bestie, sedikit jenaka" },
  ],
  steps: ["Membaca produk & pesan utama…", "Memilih angle & gaya per naskah…", "Menulis 3 variasi hook per naskah…", "Menyusun adegan per detik & teks layar…", "Menulis caption, arahan syuting & Excel…"],
};

export const scriptOutput = z.object({
  summary: t(320).describe("Arah kreatif 2-3 kalimat: siapa penontonnya, rasa video, dan kenapa set naskah ini dipilih untuk tujuan user"),
  scripts: z
    .array(
      z.object({
        title: t(70).describe("Judul internal naskah, mis. 'POV: concealer udah gak tebal lagi'"),
        angle: t(200).describe("Sudut pesan: insight/masalah penonton yang diangkat dan janji yang ditawarkan"),
        style: t(30).describe("Gaya video, salah satu dari gaya yang dipilih user"),
        hooks: z
          .array(
            z.object({
              text: t(120).describe("Kalimat yang diucapkan / teks layar di 0-3 detik"),
              visual: t(160).describe("Apa yang terlihat di 0-3 detik (shot, gerakan, objek) agar orang berhenti scroll"),
            }),
          )
          .describe("Tepat 3 variasi hook dengan pendekatan berbeda (mis. pertanyaan tajam, pernyataan kontras, visual hasil di depan)"),
        scenes: z
          .array(
            z.object({
              start: z.number().describe("Detik mulai adegan (adegan pertama 0)"),
              end: z.number().describe("Detik selesai adegan"),
              time: t(14).describe("Label waktu, mis. '0-3 dtk'"),
              shot: t(200).describe("Shot & visual: jenis shot (close-up, medium, POV, overhead), aksi, objek"),
              on_screen: t(90).describe("Teks di layar (pendek, maks ±8 kata); kosongkan bila tidak ada"),
              voice_over: t(260).describe("Voice over / dialog persis seperti diucapkan, bahasa lisan"),
              audio: t(100).describe("Catatan audio/musik/SFX"),
            }),
          )
          .describe("4-8 adegan berurutan; total waktu = durasi video; adegan pertama adalah hook 0-3 detik"),
        cta: t(120).describe("Ajakan bertindak di akhir video (ucapan + teks layar)"),
        caption: t(400).describe("Caption siap posting: baris pertama hook, isi singkat, CTA; emoji secukupnya"),
        hashtags: z.array(t(30)).describe("3-6 hashtag relevan tanpa spasi"),
        props: t(220).describe("Properti, wardrobe & lokasi syuting yang dibutuhkan"),
        editing: t(260).describe("Catatan editing: ritme cut, b-roll, subtitle, transisi, cover/thumbnail"),
        why: t(220).describe("Kenapa naskah ini bekerja (psikologi penonton + mekanisme algoritma, mis. retensi, rewatch, komentar)"),
      }),
    )
    .describe("Naskah sesuai jumlah yang diminta, masing-masing dengan angle & gaya yang berbeda"),
  tips: z
    .array(z.object({ title: t(50), detail: t(220) }))
    .describe("4-6 tips umum: jam & cara posting, menjaga retensi, uji hook, repurpose lintas platform"),
});

export type ScriptOutput = z.infer<typeof scriptOutput>;
export type ScriptItem = ScriptOutput["scripts"][number];

export const tag = (h: string) => (h.startsWith("#") ? h : `#${h.replace(/\s+/g, "")}`);

/** Naskah lengkap sebagai teks (untuk tombol salin & dibagikan ke talent/editor). */
export function scriptText(s: ScriptItem) {
  const lines = [
    s.title.toUpperCase(),
    `Gaya: ${s.style} · Angle: ${s.angle}`,
    "",
    "PILIHAN HOOK (0-3 dtk)",
    ...s.hooks.map((h, i) => `${i + 1}. "${h.text}" — visual: ${h.visual}`),
    "",
    "ADEGAN",
    ...s.scenes.flatMap((sc) => [
      `[${sc.time}] ${sc.shot}`,
      ...(sc.on_screen ? [`  Teks layar: ${sc.on_screen}`] : []),
      ...(sc.voice_over ? [`  VO/dialog: ${sc.voice_over}`] : []),
      ...(sc.audio ? [`  Audio: ${sc.audio}`] : []),
    ]),
    "",
    `CTA: ${s.cta}`,
    "",
    "CAPTION",
    s.caption,
    s.hashtags.map(tag).join(" "),
    "",
    `Properti & lokasi: ${s.props}`,
    `Catatan editing: ${s.editing}`,
  ];
  return lines.join("\n");
}
