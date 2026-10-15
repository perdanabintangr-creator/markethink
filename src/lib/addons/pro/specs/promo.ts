import { z } from "zod";
import { opts, type ToolForm } from "../fields";
import { monthOptions, t } from "./common";

export const PROMO_PLATFORMS: [string, string][] = [
  ["shopee", "Shopee"],
  ["tiktok_shop", "TikTok Shop"],
  ["tokopedia", "Tokopedia"],
  ["lazada", "Lazada"],
  ["website", "Website / toko sendiri"],
];

export const promoForm: ToolForm = {
  fields: [
    { type: "text", name: "store", label: "Nama toko *", required: true, max: 100, placeholder: "mis. Glowria Official Shop", half: true },
    { type: "select", name: "start_month", loose: true, label: "Mulai bulan", options: opts(monthOptions(3)), default: monthOptions(3)[1][0], half: true },
    { type: "chips", name: "platforms", label: "Marketplace / kanal *", options: opts(PROMO_PLATFORMS), defaults: ["shopee", "tiktok_shop"] },
    {
      type: "select",
      name: "months",
      label: "Lama rencana",
      options: opts([
        ["1", "1 bulan"],
        ["2", "2 bulan"],
        ["3", "3 bulan"],
      ]),
      default: "2",
      half: true,
    },
    {
      type: "select",
      name: "goal",
      label: "Tujuan utama",
      options: opts([
        ["omzet", "Kejar omzet"],
        ["peringkat", "Naik peringkat toko & produk"],
        ["cuci_stok", "Cuci stok / habiskan stok lama"],
        ["pembeli_baru", "Akuisisi pembeli baru"],
      ]),
      default: "omzet",
      half: true,
    },
    {
      type: "textarea",
      name: "products",
      label: "Produk utama, harga jual & HPP/margin *",
      required: true,
      min: 15,
      max: 2000,
      rows: 4,
      hint: "Satu produk per baris. Makin lengkap HPP-nya, makin akurat hitungan margin promo.",
      placeholder:
        "mis.\nSerum Niacinamide 30ml — jual Rp149.000, HPP Rp38.000 (terjual ±60/hari)\nMoisturizer Gel 50g — jual Rp119.000, HPP Rp31.000\nSunscreen SPF50 — jual Rp89.000, HPP Rp27.000",
    },
    {
      type: "textarea",
      name: "budget",
      label: "Kemampuan subsidi diskon & budget iklan (opsional)",
      max: 600,
      rows: 2,
      placeholder: "mis. diskon maks 30%, subsidi voucher ±Rp20 jt/bulan, iklan Shopee + GMV Max Rp60 jt/bulan",
    },
    {
      type: "textarea",
      name: "notes",
      label: "Catatan lain (opsional)",
      max: 800,
      rows: 2,
      placeholder: "mis. omzet sekarang ±Rp1,8 M/bulan, stok gudang Jakarta, launching varian baru awal Desember, ada 2 host live tetap",
    },
  ],
  steps: [
    "Membaca produk, harga & HPP…",
    "Memetakan tanggal kembar, payday & musim belanja…",
    "Merancang mekanisme & voucher tiap event…",
    "Menghitung margin setelah promo…",
    "Menyusun stok, checklist & file Excel…",
  ],
};

export const CHECK_PHASES = ["H-14", "H-7", "H-1", "Hari-H", "H+1"] as const;
export const MARGIN_STATUS = ["aman", "tipis", "rugi"] as const;
export const MARGIN_LABEL: Record<(typeof MARGIN_STATUS)[number], string> = { aman: "Aman", tipis: "Tipis", rugi: "Rugi" };
export const SCALE_LABEL = { besar: "Kampanye besar", sedang: "Kampanye sedang", rutin: "Rutin mingguan" } as const;

export const promoOutput = z.object({
  summary: t(450).describe("Arah promo periode ini dalam 2-3 kalimat: event mana yang jadi tumpuan omzet, strategi menjaga margin, dan target besarnya"),
  strategy: z.object({
    focus: t(220).describe("Fokus strategi: produk mana jadi traffic driver vs profit driver, dan kenapa"),
    margin_guard: t(220).describe("Aturan menjaga margin: batas diskon maksimal per produk, kapan pakai voucher min. belanja vs diskon langsung"),
    traffic: t(220).describe("Cara mendatangkan trafik saat event: live, iklan, KOL/affiliate, voucher follower"),
  }),
  campaigns: z
    .array(
      z.object({
        start: t(10).describe("YYYY-MM-DD, tanggal mulai"),
        end: t(10).describe("YYYY-MM-DD, tanggal selesai (sama dengan start bila 1 hari)"),
        event: t(60).describe("Nama event, mis. '11.11', 'Payday 25', '12.12 Harbolnas', 'Flash sale Jumat'"),
        scale: z.enum(["besar", "sedang", "rutin"]).describe("besar = tanggal kembar/Harbolnas; sedang = payday/musiman; rutin = flash sale mingguan"),
        platforms: t(60).describe("Platform yang ikut, mis. 'Shopee, TikTok Shop'"),
        mechanism: t(260).describe("Mekanisme promo yang jelas: diskon produk, bundling, gift, flash sale slot jam berapa, early access, dsb."),
        vouchers: z
          .array(
            z.object({
              name: t(40).describe("Jenis voucher, mis. 'Voucher toko', 'Voucher follower', 'Voucher live'"),
              min_spend: z.number().nullable().describe("Minimal belanja (Rp), null bila tanpa minimum"),
              discount: t(40).describe("Potongan, mis. 'Rp25.000' atau '10% maks Rp30.000'"),
              quota: z.number().nullable().describe("Kuota voucher (jumlah klaim)"),
            }),
          )
          .describe("0-3 voucher untuk event ini"),
        hero_products: z.array(t(60)).describe("1-3 produk unggulan event ini"),
        target_units: z.number().nullable().describe("Target unit terjual selama event"),
        target_revenue: z.number().nullable().describe("Target omzet selama event (Rp)"),
        support: t(220).describe("Dukungan: jadwal live (jam & durasi), budget iklan, KOL/affiliate, push notifikasi/broadcast"),
        prep: t(220).describe("Persiapan H-x yang spesifik: daftar campaign platform, setting voucher, stok masuk, materi banner"),
      }),
    )
    .describe("Semua campaign selama periode, urut tanggal; termasuk tanggal kembar, payday, dan flash sale mingguan"),
  margins: z
    .array(
      z.object({
        product: t(60),
        scenario: t(40).describe("Event/mekanisme yang dihitung, mis. '12.12 diskon 25%'"),
        price: z.number().describe("Harga jual normal (Rp)"),
        discount_pct: z.number().describe("Diskon % dari harga normal"),
        promo_price: z.number().describe("Harga setelah diskon (Rp) — akan dihitung ulang sistem"),
        cogs: z.number().describe("HPP per unit (Rp); bila user hanya memberi margin, turunkan dari situ"),
        platform_fee_pct: z.number().describe("Perkiraan total potongan platform % (biaya admin + layanan program + pembayaran)"),
        other_cost: z.number().nullable().describe("Biaya lain per unit (Rp): subsidi voucher toko/ongkir, packing, alokasi iklan; null bila tidak dihitung"),
        margin_rp: z.number().describe("Margin per unit setelah promo (Rp) — akan dihitung ulang sistem"),
        margin_pct: z.number().describe("Margin % dari harga promo — akan dihitung ulang sistem"),
        status: z.enum(MARGIN_STATUS).describe("rugi bila margin < 0, tipis bila < 10%, aman bila ≥ 10%"),
        note: t(140).describe("Saran: aman dipakai sebagai traffic driver, naikkan min. belanja, ganti dengan bundling, dsb."),
      }),
    )
    .describe("Hitungan promo per produk utama × skenario diskon terberat"),
  stock: z
    .array(
      z.object({
        product: t(60),
        peak_event: t(40).describe("Event dengan kebutuhan stok tertinggi"),
        units_needed: z.number().nullable().describe("Perkiraan unit yang harus siap untuk seluruh periode"),
        ready_by: t(40).describe("Tanggal stok harus sudah di gudang, mis. 'H-7 (4 Nov)'"),
        note: t(180).describe("Dasar hitungan (penjualan harian × pengali event) + safety stock"),
      }),
    )
    .describe("Persiapan stok per produk utama"),
  checklist: z
    .array(z.object({ phase: z.enum(CHECK_PHASES), task: t(160), owner: t(40).describe("Peran, mis. 'Admin toko', 'Host live', 'Gudang'") }))
    .describe("Checklist persiapan untuk event besar: 3-5 tugas per fase H-14, H-7, H-1, Hari-H, H+1"),
  kpis: z.array(z.object({ metric: t(50), target: t(60) })).describe("4-6 KPI periode ini (GMV, unit, conversion rate, ROAS, AOV, rating toko, dsb.)"),
  risks: z.array(t(200)).describe("2-4 risiko & antisipasi (stok habis, voucher bocor, ROAS turun, penalti harga coret)"),
});

export type PromoOutput = z.infer<typeof promoOutput>;
export type PromoMargin = PromoOutput["margins"][number];

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

/** Hitung ulang harga promo, margin Rp & %, dan status — dipakai server (post) & contoh. */
export function calcMargin(m: PromoMargin): PromoMargin {
  const price = Math.max(0, num(m.price));
  const discount = Math.min(95, Math.max(0, num(m.discount_pct)));
  const fee = Math.min(40, Math.max(0, num(m.platform_fee_pct, 10)));
  const cogs = Math.max(0, num(m.cogs));
  const other = m.other_cost === null || m.other_cost === undefined ? null : Math.max(0, num(m.other_cost));
  const promo = Math.round(price * (1 - discount / 100));
  const marginRp = Math.round(promo - cogs - (promo * fee) / 100 - (other ?? 0));
  const marginPct = promo > 0 ? Math.round((marginRp / promo) * 1000) / 10 : 0;
  const status = marginRp < 0 ? "rugi" : marginPct < 10 ? "tipis" : "aman";
  return { ...m, price, discount_pct: discount, platform_fee_pct: fee, cogs, other_cost: other, promo_price: promo, margin_rp: marginRp, margin_pct: marginPct, status };
}

/** Biaya platform per unit (Rp). */
export const platformFeeRp = (m: PromoMargin) => Math.round((m.promo_price * m.platform_fee_pct) / 100);
