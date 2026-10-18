import { z } from "zod";
import { opts, type ToolForm } from "../fields";
import { t } from "./common";

export const FLOW_STAGES: [string, string][] = [
  ["lead", "Lead baru"],
  ["no_order", "Chat tanpa order"],
  ["cart", "Keranjang / checkout ditinggal"],
  ["post_purchase", "Setelah beli"],
  ["review", "Minta ulasan"],
  ["repeat", "Repeat order"],
  ["winback", "Win-back pelanggan pasif"],
];

export const flowForm: ToolForm = {
  fields: [
    {
      type: "textarea",
      name: "business",
      label: "Bisnis, produk, harga & cara order *",
      required: true,
      min: 15,
      max: 1500,
      rows: 4,
      placeholder:
        "mis. Dimsum Laras, dimsum frozen isi 20 Rp65.000, paket hemat 3 pack Rp180.000. Order lewat WA admin & website, kirim instan Jabodetabek, ekspedisi frozen ke Jawa. Pembeli kebanyakan ibu rumah tangga 28-40 th.",
    },
    {
      type: "select",
      name: "channel",
      label: "Kanal follow-up",
      options: opts([
        ["whatsapp", "WhatsApp"],
        ["email", "Email"],
        ["both", "WhatsApp + email"],
      ]),
      default: "whatsapp",
      half: true,
    },
    { type: "number", name: "cycle", label: "Siklus beli ulang", min: 7, max: 180, default: 30, suffix: "hari", half: true, hint: "Rata-rata jarak pelanggan beli lagi." },
    { type: "chips", name: "stages", label: "Tahap yang mau dibuat *", options: opts(FLOW_STAGES), defaults: ["lead", "no_order", "post_purchase", "repeat"] },
    { type: "text", name: "tool", label: "Alat yang dipakai (opsional)", max: 120, placeholder: "mis. WA Business manual, Qontak, Wati, Mekari, Klaviyo", half: true },
    { type: "text", name: "tone", label: "Gaya bahasa (opsional)", max: 160, placeholder: "mis. hangat kayak teman, panggil 'Kak'", half: true },
  ],
  steps: ["Membaca produk & perjalanan pelanggan…", "Menentukan pemicu & kondisi keluar tiap tahap…", "Menulis pesan per jeda waktu…", "Menetapkan target & aturan kirim aman…", "Menyusun peta alur & file Excel…"],
};

export const flowOutput = z.object({
  summary: t(420).describe("Gambaran alur dalam 2-3 kalimat: tahap mana yang paling cepat menghasilkan uang dan kenapa urutannya begitu"),
  stages: z
    .array(
      z.object({
        stage: t(40).describe("Nama tahap, mis. 'Lead baru'"),
        trigger: t(180).describe("Pemicu masuk alur yang bisa dicek admin/sistem, mis. 'Chat pertama masuk dari iklan CTWA'"),
        goal: t(140).describe("Tujuan tahap ini dalam satu kalimat"),
        exit: t(180).describe("Kondisi keluar alur: sudah order, membalas STOP, pindah ke tahap lain, atau habis urutan"),
        messages: z
          .array(
            z.object({
              delay: t(30).describe("Jeda sejak pemicu, mis. 'H+0, 15 menit', 'H+1, 10.00', 'H+3'"),
              channel: t(20).describe("WhatsApp atau Email"),
              subject: t(80).describe("Subjek email; kosongkan untuk WhatsApp"),
              text: t(700).describe("Isi pesan siap kirim dengan variabel {nama} {produk} {link} dsb.; WhatsApp boleh *tebal* & emoji secukupnya"),
              cta: t(80).describe("Aksi yang diminta dari pelanggan"),
              note: t(160).describe("Catatan untuk admin: kapan dilewati, template HSM yang perlu disetujui, A/B test"),
            }),
          )
          .describe("2-4 pesan per tahap, urut jeda"),
        reply_rate: z.number().nullable().describe("Target persentase balasan/klik tahap ini (%)"),
        conversion_rate: z.number().nullable().describe("Target konversi tahap ini (%) sesuai tujuannya"),
        metric_note: t(160).describe("Cara mengukur: angka apa dihitung dari mana"),
      }),
    )
    .describe("Satu objek per tahap yang dipilih user, urut sesuai perjalanan pelanggan"),
  segments: z
    .array(z.object({ name: t(40), rule: t(200).describe("Aturan masuk segmen yang bisa dibuat sebagai label/tag"), treatment: t(200).describe("Perlakuan berbeda untuk segmen ini") }))
    .describe("3-5 segmen (label) pelanggan"),
  setup: z.array(z.object({ title: t(60), detail: t(260) })).describe("4-7 langkah setup di alat yang dipakai user (label, template, auto-reply, API/HSM, laporan)"),
  compliance: z
    .array(z.object({ rule: t(80), detail: t(220) }))
    .describe("4-6 aturan kepatuhan: izin/opt-out, jam kirim 08.00-20.00, frekuensi maksimal, anti-banned WhatsApp, data pribadi"),
  kpis: z.array(z.object({ metric: t(50), target: t(60) })).describe("3-5 KPI alur secara keseluruhan"),
});

export type FlowOutput = z.infer<typeof flowOutput>;
export type FlowMessage = FlowOutput["stages"][number]["messages"][number];

/** Ambil variabel {nama} dsb. dari teks pesan. */
export const flowVariables = (text: string) => [...new Set(text.match(/\{[a-z0-9_ ]{2,30}\}/gi) ?? [])];

/** Ubah teks jeda ("H+0, 15 menit", "H+3", "2 jam") jadi menit sejak pemicu, untuk mengurutkan. */
export function delayMinutes(delay: string): number | null {
  const s = delay.toLowerCase();
  let total = 0;
  let found = false;
  const day = s.match(/h\s*\+\s*(\d+)/) ?? s.match(/(\d+)\s*hari/);
  if (day) {
    total += Number(day[1]) * 1440;
    found = true;
  }
  const week = s.match(/(\d+)\s*minggu/);
  if (week) {
    total += Number(week[1]) * 10080;
    found = true;
  }
  const hour = s.match(/(\d+)\s*jam/);
  if (hour) {
    total += Number(hour[1]) * 60;
    found = true;
  }
  const min = s.match(/(\d+)\s*menit/);
  if (min) {
    total += Number(min[1]);
    found = true;
  }
  const clock = s.match(/\b(\d{1,2})[.:](\d{2})\b/);
  if (clock && !hour && !min) total += Number(clock[1]) * 60 + Number(clock[2]);
  return found || clock ? total : null;
}
