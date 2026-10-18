import { z } from "zod";
import { opts, type ToolForm } from "../fields";
import { t } from "./common";

export const LOYALTY_MODELS: [string, string][] = [
  ["recommend", "Rekomendasikan saja"],
  ["points", "Poin"],
  ["tier", "Tier / level member"],
  ["stamp", "Stamp card"],
  ["referral", "Referral"],
  ["paid", "Member berbayar"],
];

export const loyaltyForm: ToolForm = {
  fields: [
    {
      type: "textarea",
      name: "business",
      label: "Bisnis & pelanggan *",
      required: true,
      min: 15,
      max: 1500,
      rows: 4,
      placeholder:
        "mis. Kopi Tepi Kota, 3 outlet kopi susu di Bandung + GrabFood/GoFood. Menu andalan es kopi susu Rp28 rb. Pelanggan mahasiswa & pekerja 20-30 th, kasir pakai Moka POS.",
    },
    { type: "number", name: "aov", label: "Rata-rata nilai belanja per transaksi (Rp)", min: 5000, max: 50_000_000, default: 75000, half: true },
    { type: "number", name: "margin", label: "Gross margin", min: 1, max: 95, default: 50, suffix: "%", half: true },
    { type: "number", name: "frequency", label: "Rata-rata beli per pelanggan per tahun", min: 1, max: 365, default: 6, suffix: "kali", half: true },
    { type: "number", name: "customers", label: "Jumlah pelanggan aktif", min: 10, max: 10_000_000, default: 1000, suffix: "orang", half: true },
    {
      type: "select",
      name: "model",
      label: "Model program",
      options: opts(LOYALTY_MODELS),
      default: "recommend",
      half: true,
    },
    { type: "text", name: "budget", label: "Budget program (opsional)", max: 200, placeholder: "mis. maks Rp3 jt/bulan termasuk aplikasi member", half: true },
  ],
  steps: ["Membaca model bisnis & angka pelanggan…", "Memilih model program yang paling untung…", "Menyusun aturan poin, tier & hadiah…", "Menghitung biaya vs untung program…", "Menulis materi peluncuran & file Excel…"],
};

export const loyaltyOutput = z.object({
  summary: t(420).describe("Inti rekomendasi dalam 2-3 kalimat: model apa, kenapa, dan angka untung-ruginya secara garis besar"),
  model: z.object({
    name: t(60).describe("Nama program yang menarik & mudah diingat, mis. 'Teman Tepi Kota'"),
    type: z.enum(["poin", "tier", "stamp", "referral", "berbayar", "gabungan"]),
    why: t(420).describe("Alasan model ini cocok untuk bisnis ini (frekuensi, AOV, margin, perilaku pelanggan)"),
    not_chosen: t(260).describe("Model lain yang dipertimbangkan & kenapa tidak dipilih"),
  }),
  earn_burn: z.object({
    earn_rule: t(200).describe("Aturan dapat poin dalam bahasa pelanggan, mis. 'Setiap belanja Rp1.000 = 1 poin'"),
    spend_per_point: z.number().describe("Belanja (Rp) untuk mendapat 1 poin/stamp; untuk stamp card = AOV"),
    point_value: z.number().describe("Nilai tukar 1 poin/stamp dalam Rp ke pelanggan (nilai jual hadiah ÷ poin)"),
    burn_rule: t(220).describe("Aturan tukar poin: minimum poin, cara tukar, bisa digabung promo atau tidak"),
    expiry: t(140).describe("Masa berlaku poin"),
    bonus_rules: z.array(t(160)).describe("2-4 aturan bonus: poin ganda di hari sepi, ulang tahun, sambutan member baru"),
  }),
  tiers: z
    .array(
      z.object({
        name: t(30),
        requirement: t(120).describe("Syarat naik/bertahan di tier, berbasis belanja atau transaksi per 12 bulan"),
        multiplier: z.number().nullable().describe("Pengali poin tier ini (1 = normal); null bila tidak ada"),
        benefits: z.array(t(100)).describe("2-4 benefit"),
      }),
    )
    .describe("2-4 tier dari terendah; bila model tanpa tier, satu tier 'Member'"),
  rewards: z
    .array(
      z.object({
        reward: t(80),
        points: z.number().describe("Poin/stamp yang dibutuhkan"),
        cost: z.number().describe("Biaya ke bisnis (Rp) — HPP hadiah, bukan harga jual"),
        note: t(120).describe("Kenapa hadiah ini: mendorong coba menu lain, naik AOV, dsb."),
      }),
    )
    .describe("4-8 hadiah dari yang paling cepat didapat"),
  assumptions: z.object({
    participation_pct: z.number().describe("% pelanggan aktif yang ikut jadi member dalam 12 bulan"),
    redemption_pct: z.number().describe("% nilai poin yang benar-benar ditukar (breakage = sisanya)"),
    uplift_pct: z.number().describe("Kenaikan frekuensi beli anggota (%) karena program"),
    avg_multiplier: z.number().describe("Rata-rata pengali poin seluruh anggota setelah tier (1 bila tanpa tier)"),
    fixed_cost_year: z.number().describe("Biaya tetap per tahun (Rp): aplikasi/sistem member, kartu, materi promosi, pelatihan kasir"),
    notes: t(320).describe("Dasar asumsi & sumber angka (perkiraan industri/data user)"),
  }),
  launch: z.array(z.object({ phase: t(40), when: t(40), actions: t(260) })).describe("3-5 fase peluncuran: persiapan, soft launch, grand launch, evaluasi"),
  comms: z
    .array(z.object({ channel: t(40).describe("mis. 'Pengumuman WhatsApp', 'Caption Instagram', 'Skrip kasir', 'Skrip CS'"), title: t(60), text: t(900) }))
    .describe("3-5 materi siap pakai: pengumuman WA, caption IG, skrip kasir/CS"),
  kpis: z.array(z.object({ metric: t(50), target: t(60) })).describe("4-6 KPI program"),
  risks: z.array(z.object({ risk: t(120), prevention: t(220) })).describe("3-5 risiko & pencegahan kecurangan (poin dari transaksi palsu, kasir curang, akun ganda, liabilitas poin)"),
});

export type LoyaltyAI = z.infer<typeof loyaltyOutput>;

export interface LoyaltyParams {
  customers: number;
  aov: number;
  frequency: number;
  margin_pct: number;
  participation_pct: number;
  redemption_pct: number;
  uplift_pct: number;
  spend_per_point: number;
  point_value: number;
  avg_multiplier: number;
  fixed_cost_year: number;
}

export interface LoyaltyEconomics extends LoyaltyParams {
  base_revenue: number;
  members: number;
  member_revenue_base: number;
  incremental_revenue: number;
  member_revenue_total: number;
  earn_rate_pct: number;
  reward_cost: number;
  reward_cost_real: number | null;
  total_cost: number;
  incremental_profit: number;
  net_gain: number;
  roi_pct: number | null;
  breakeven_uplift_pct: number | null;
  cost_pct_of_member_revenue: number;
  verdict: "untung" | "tipis" | "rugi";
  scenarios: { uplift_pct: number; incremental_profit: number; total_cost: number; net_gain: number }[];
}

export type LoyaltyOutput = Omit<LoyaltyAI, "rewards"> & { economics: LoyaltyEconomics; rewards: (LoyaltyAI["rewards"][number] & { face_value?: number })[] };

const n = (v: unknown, d: number, lo: number, hi: number) => {
  const x = typeof v === "number" && Number.isFinite(v) ? v : d;
  return Math.min(hi, Math.max(lo, x));
};

/** Rapikan parameter (batas wajar) sebelum dihitung. */
export function loyaltyParams(p: Partial<LoyaltyParams>): LoyaltyParams {
  return {
    customers: n(p.customers, 1000, 0, 1e8),
    aov: n(p.aov, 75000, 0, 1e9),
    frequency: n(p.frequency, 6, 0, 365),
    margin_pct: n(p.margin_pct, 50, 0, 100),
    participation_pct: n(p.participation_pct, 40, 0, 100),
    redemption_pct: n(p.redemption_pct, 60, 0, 100),
    uplift_pct: n(p.uplift_pct, 10, -50, 300),
    spend_per_point: n(p.spend_per_point, 10000, 1, 1e9),
    point_value: n(p.point_value, 0, 0, 1e9),
    avg_multiplier: n(p.avg_multiplier, 1, 1, 5),
    fixed_cost_year: n(p.fixed_cost_year, 0, 0, 1e12),
  };
}

/**
 * Model ekonomi program loyalitas (dihitung program, bukan AI):
 * - omzet dasar = pelanggan × AOV × frekuensi
 * - omzet anggota = anggota × AOV × frekuensi × (1 + uplift)
 * - earn rate = nilai 1 poin ÷ belanja per poin × rata-rata pengali tier
 * - biaya hadiah = omzet anggota × earn rate × redemption
 * - laba tambahan = omzet tambahan (dari uplift) × gross margin
 * - untung bersih = laba tambahan − (biaya hadiah + biaya tetap); ROI = untung bersih ÷ biaya
 * - break-even uplift = (B·e·r + F) ÷ (B·(m − e·r)), B = omzet anggota tanpa uplift
 */
export function computeLoyalty(input: Partial<LoyaltyParams>, rewards: { points: number; cost: number }[] = []): LoyaltyEconomics {
  const p = loyaltyParams(input);
  const m = p.margin_pct / 100;
  const r = p.redemption_pct / 100;
  const e = (p.point_value / p.spend_per_point) * p.avg_multiplier;
  const base = p.customers * p.aov * p.frequency;
  const members = Math.round(p.customers * (p.participation_pct / 100));
  const B = members * p.aov * p.frequency;
  const at = (upliftPct: number) => {
    const inc = B * (upliftPct / 100);
    const rewardCost = (B + inc) * e * r;
    const total = rewardCost + p.fixed_cost_year;
    const profit = inc * m;
    return { inc, rewardCost, total, profit, net: profit - total };
  };
  const cur = at(p.uplift_pct);
  const denom = B * (m - e * r);
  const breakeven = denom > 0 ? ((B * e * r + p.fixed_cost_year) / denom) * 100 : null;
  const ratios = rewards.filter((x) => x.points > 0 && x.cost >= 0 && p.point_value > 0).map((x) => Math.min(1, x.cost / (x.points * p.point_value)));
  const avgRatio = ratios.length ? ratios.reduce((s, x) => s + x, 0) / ratios.length : null;
  const round = (x: number) => Math.round(x);
  const roi = cur.total > 0 ? Math.round((cur.net / cur.total) * 1000) / 10 : null;
  const steps = [0, 5, 10, 15, 20, 30];
  if (!steps.includes(Math.round(p.uplift_pct))) steps.push(Math.round(p.uplift_pct));
  return {
    ...p,
    base_revenue: round(base),
    members,
    member_revenue_base: round(B),
    incremental_revenue: round(cur.inc),
    member_revenue_total: round(B + cur.inc),
    earn_rate_pct: Math.round(e * 10000) / 100,
    reward_cost: round(cur.rewardCost),
    reward_cost_real: avgRatio === null ? null : round(cur.rewardCost * avgRatio),
    total_cost: round(cur.total),
    incremental_profit: round(cur.profit),
    net_gain: round(cur.net),
    roi_pct: roi,
    breakeven_uplift_pct: breakeven === null ? null : Math.round(breakeven * 10) / 10,
    cost_pct_of_member_revenue: B + cur.inc > 0 ? Math.round((cur.total / (B + cur.inc)) * 1000) / 10 : 0,
    verdict: cur.net < 0 ? "rugi" : roi !== null && roi < 30 ? "tipis" : "untung",
    scenarios: steps
      .sort((a, b) => a - b)
      .map((u) => {
        const s = at(u);
        return { uplift_pct: u, incremental_profit: round(s.profit), total_cost: round(s.total), net_gain: round(s.net) };
      }),
  };
}

/** Ambil parameter ekonomi dari input form + asumsi & aturan poin hasil AI. */
export const loyaltyInputs = (out: LoyaltyAI, input: Record<string, unknown>): Partial<LoyaltyParams> => ({
  customers: Number(input.customers),
  aov: Number(input.aov),
  frequency: Number(input.frequency),
  margin_pct: Number(input.margin),
  participation_pct: out.assumptions.participation_pct,
  redemption_pct: out.assumptions.redemption_pct,
  uplift_pct: out.assumptions.uplift_pct,
  spend_per_point: out.earn_burn.spend_per_point,
  point_value: out.earn_burn.point_value,
  avg_multiplier: out.assumptions.avg_multiplier,
  fixed_cost_year: out.assumptions.fixed_cost_year,
});

export const VERDICT_LABEL = { untung: "Untung", tipis: "Untung tipis", rugi: "Rugi" } as const;

export const rpText = (n: number | null) => (n === null ? "-" : `${n < 0 ? "-" : ""}Rp${Math.abs(Math.round(n)).toLocaleString("id-ID")}`);
export const pctText = (n: number | null) => (n === null ? "-" : `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`);

/** Baris kalkulasi (komponen, rumus, angka) — dipakai Excel & PPT. */
export function calcRows(e: LoyaltyEconomics) {
  return [
    { k: "Pelanggan aktif", f: "Input", rp: null, v: e.customers.toLocaleString("id-ID") },
    { k: "Rata-rata belanja (AOV)", f: "Input", rp: e.aov, v: "" },
    { k: "Frekuensi beli per tahun", f: "Input", rp: null, v: `${e.frequency}×` },
    { k: "Gross margin", f: "Input", rp: null, v: pctText(e.margin_pct) },
    { k: "Omzet tahunan dasar", f: "Pelanggan × AOV × frekuensi", rp: e.base_revenue, v: "" },
    { k: "Partisipasi member", f: "Asumsi", rp: null, v: pctText(e.participation_pct) },
    { k: "Jumlah anggota", f: "Pelanggan × partisipasi", rp: null, v: e.members.toLocaleString("id-ID") },
    { k: "Omzet anggota (tanpa program)", f: "Anggota × AOV × frekuensi", rp: e.member_revenue_base, v: "" },
    { k: "Uplift frekuensi anggota", f: "Asumsi", rp: null, v: pctText(e.uplift_pct) },
    { k: "Omzet tambahan", f: "Omzet anggota × uplift", rp: e.incremental_revenue, v: "" },
    { k: "Earn rate efektif", f: `Nilai 1 poin (${rpText(e.point_value)}) ÷ belanja per poin (${rpText(e.spend_per_point)}) × pengali tier ${e.avg_multiplier}`, rp: null, v: pctText(e.earn_rate_pct) },
    { k: "Redemption rate", f: "Asumsi", rp: null, v: pctText(e.redemption_pct) },
    { k: "Biaya hadiah (nilai tukar penuh)", f: "(Omzet anggota + omzet tambahan) × earn rate × redemption", rp: e.reward_cost, v: "" },
    { k: "Biaya tetap per tahun", f: "Aplikasi/sistem, materi, pelatihan", rp: e.fixed_cost_year, v: "" },
    { k: "Total biaya program", f: "Biaya hadiah + biaya tetap", rp: e.total_cost, v: pctText(e.cost_pct_of_member_revenue) + " dari omzet anggota" },
    { k: "Laba kotor tambahan", f: "Omzet tambahan × gross margin", rp: e.incremental_profit, v: "" },
    { k: "Untung bersih program", f: "Laba tambahan − total biaya", rp: e.net_gain, v: VERDICT_LABEL[e.verdict] },
    { k: "ROI", f: "Untung bersih ÷ total biaya", rp: null, v: pctText(e.roi_pct) },
    { k: "Break-even uplift", f: "(B×earn×redemption + biaya tetap) ÷ (B×(margin − earn×redemption)), B = omzet anggota", rp: null, v: e.breakeven_uplift_pct === null ? "Tidak tercapai (biaya hadiah ≥ margin)" : pctText(e.breakeven_uplift_pct) },
    ...(e.reward_cost_real !== null ? [{ k: "Biaya hadiah riil (perkiraan HPP)", f: "Biaya hadiah × rata-rata (HPP hadiah ÷ nilai tukar)", rp: e.reward_cost_real, v: "" }] : []),
  ];
}

