import { z } from "zod";
import { opts, type ToolForm } from "../fields";
import { priority, t } from "./common";

/* ------------------------------------------------------------------ helper bersama kelompok strategi (aman untuk client) */

/** Pilihan kanal marketing yang lazim di Indonesia (dipakai plan, campaign, gtm). */
export const CHANNEL_OPTIONS: [string, string][] = [
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["meta_ads", "Meta Ads"],
  ["tiktok_ads", "TikTok Ads"],
  ["google_ads", "Google Ads / SEO"],
  ["marketplace", "Marketplace (Shopee/Tokopedia/TikTok Shop)"],
  ["whatsapp", "WhatsApp / CRM"],
  ["kol", "KOL / Affiliate"],
  ["website", "Website"],
  ["pr", "PR / media"],
  ["offline", "Toko / event offline"],
  ["b2b", "Sales langsung / B2B"],
];

const MULT: Record<string, number> = { miliar: 1e9, milyar: 1e9, m: 1e9, juta: 1e6, jt: 1e6, ribu: 1e3, rb: 1e3, k: 1e3 };

/** Baca nominal Rupiah dari teks bebas ("Rp15 jt/bulan", "15.000.000", "500rb"). Kembalikan null bila tidak ada angka uang yang masuk akal. */
export function parseRupiah(text: unknown): { amount: number; perYear: boolean } | null {
  const s = String(text ?? "").toLowerCase();
  if (!s.trim()) return null;
  const re = /(\d+(?:[.,]\d+)*)\s*(miliar|milyar|juta|jt|ribu|rb|k|m)?(?![a-z])/g;
  for (const m of s.matchAll(re)) {
    const raw = m[1];
    let n: number;
    if (/^\d{1,3}(\.\d{3})+$/.test(raw)) n = Number(raw.replace(/\./g, ""));
    else if (/^\d{1,3}(,\d{3})+$/.test(raw)) n = Number(raw.replace(/,/g, ""));
    else n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n)) continue;
    const amount = n * (m[2] ? MULT[m[2]] : 1);
    if (amount < 50_000) continue;
    return { amount: Math.round(amount), perYear: /(per|\/|se)\s*tahun|tahunan/.test(s) };
  }
  return null;
}

/** Bulatkan daftar persen agar totalnya tepat 100 (metode sisa terbesar). Semua 0 → dibagi rata. */
export function normalize100(values: number[]): number[] {
  if (!values.length) return [];
  const clean = values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const sum = clean.reduce((a, b) => a + b, 0);
  const base = sum > 0 ? clean.map((v) => (v / sum) * 100) : clean.map(() => 100 / clean.length);
  const floor = base.map(Math.floor);
  let rest = 100 - floor.reduce((a, b) => a + b, 0);
  const order = base.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (rest <= 0) break;
    floor[i] += 1;
    rest -= 1;
  }
  return floor;
}

/** Bagi total ke tiap persen, dibulatkan ke Rp1.000; selisih pembulatan masuk ke pos terbesar. */
export function splitAmount(total: number | null, pcts: number[]): (number | null)[] {
  if (total === null || !Number.isFinite(total) || total <= 0) return pcts.map(() => null);
  const out = pcts.map((p) => Math.round((total * p) / 100 / 1000) * 1000);
  const diff = Math.round(total) - out.reduce((a, b) => a + b, 0);
  if (out.length && diff) {
    const big = pcts.indexOf(Math.max(...pcts));
    out[big] += diff;
  }
  return out;
}

const idn = (n: number, d: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: d }).format(n);
/** Rupiah ringkas (Rp15 jt) untuk tampilan & PPT. */
export const idr = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? "-"
    : Math.abs(n) >= 1e9
      ? `Rp${idn(n / 1e9, 1)} M`
      : Math.abs(n) >= 1e6
        ? `Rp${idn(n / 1e6, 1)} jt`
        : Math.abs(n) >= 1e3
          ? `Rp${idn(n / 1e3, 0)} rb`
          : `Rp${idn(n, 0)}`;

export const budgetBasis = z.enum(["user", "rekomendasi"]);

/* ------------------------------------------------------------------ Marketing Plan */

export const planForm: ToolForm = {
  fields: [
    { type: "text", name: "brand", label: "Nama brand *", required: true, max: 100, placeholder: "mis. Kopi Senja", half: true },
    {
      type: "select",
      name: "period",
      label: "Periode rencana",
      options: opts([
        ["3", "3 bulan (kuartal)"],
        ["6", "6 bulan"],
        ["12", "12 bulan (tahunan)"],
      ]),
      default: "6",
      half: true,
    },
    {
      type: "textarea",
      name: "business",
      label: "Bisnis & kondisi sekarang *",
      required: true,
      min: 20,
      max: 2000,
      rows: 4,
      hint: "Produk, kisaran harga, kanal jual, dan angka saat ini (omzet, jumlah order/pelanggan) bila ada — makin lengkap, makin tajam rencananya.",
      placeholder:
        "mis. Kopi susu literan gula aren Rp45rb & Rp85rb (2 liter). Jual di Shopee, TikTok Shop, dan 2 outlet takeaway di Bekasi. Omzet ±Rp70 jt/bulan, ±1.500 order, 35% pembeli repeat. Margin kotor ±55%.",
    },
    {
      type: "textarea",
      name: "goal",
      label: "Target bisnis *",
      required: true,
      min: 10,
      max: 800,
      rows: 2,
      placeholder: "mis. Omzet Rp150 jt/bulan di akhir periode, buka reseller di 3 kota, repeat order naik ke 45%",
    },
    { type: "text", name: "budget", label: "Budget marketing per bulan", max: 120, placeholder: "mis. Rp15 jt/bulan (di luar gaji tim)", half: true },
    { type: "text", name: "team", label: "Tim marketing", max: 300, placeholder: "mis. 1 admin sosmed, 1 desainer freelance, owner pegang iklan", half: true },
    {
      type: "chips",
      name: "channels",
      label: "Kanal yang sudah dipakai",
      hint: "Kosongkan bila belum ada — kanal akan direkomendasikan.",
      options: opts(CHANNEL_OPTIONS),
      defaults: ["instagram", "marketplace"],
      min: 0,
    },
    {
      type: "textarea",
      name: "challenges",
      label: "Tantangan / kendala (opsional)",
      max: 800,
      rows: 2,
      placeholder: "mis. ROAS iklan turun sejak 3 bulan lalu, kompetitor banting harga di Shopee, konten masih dibuat dadakan",
    },
  ],
  steps: [
    "Membaca kondisi bisnis & target…",
    "Menyusun analisis situasi & SWOT…",
    "Merumuskan tujuan SMART & positioning…",
    "Menyusun strategi kanal & alokasi budget…",
    "Membuat roadmap, KPI & quick wins…",
    "Menyusun PPT & Excel…",
  ],
};

export const funnelStage = z.enum(["awareness", "consideration", "conversion", "retention"]);
export const FUNNEL_LABEL: Record<z.infer<typeof funnelStage>, string> = {
  awareness: "Awareness",
  consideration: "Consideration",
  conversion: "Conversion",
  retention: "Retention",
};

export const planOutput = z.object({
  headline: t(160).describe("1 kalimat inti rencana untuk owner/board: target utama + cara mencapainya, berangka"),
  summary: t(700).describe("Ringkasan eksekutif 3-5 kalimat: kondisi sekarang, target, 2-3 taruhan strategis utama, dan kebutuhan budget/tim"),
  assumptions: z.array(t(160)).describe("2-4 asumsi yang dipakai karena data user kurang (kosongkan bila tidak ada)"),
  situation: z.object({
    strengths: z.array(t(140)).describe("2-4 kekuatan nyata dari data user"),
    weaknesses: z.array(t(140)).describe("2-4 kelemahan"),
    opportunities: z.array(t(140)).describe("2-4 peluang pasar/momen yang relevan"),
    threats: z.array(t(140)).describe("2-4 ancaman"),
    insights: z
      .array(z.object({ insight: t(180).describe("Temuan kunci"), implication: t(180).describe("Artinya untuk strategi") }))
      .describe("2-3 insight kunci yang menjadi dasar rencana"),
  }),
  objectives: z
    .array(
      z.object({
        objective: t(120).describe("Tujuan dalam kalimat aktif"),
        metric: t(50).describe("Metrik yang diukur"),
        baseline: t(40).describe("Angka sekarang dari data user, atau 'belum diukur'"),
        target: t(40).describe("Angka target"),
        deadline: t(30).describe("Kapan harus tercapai, mis. 'Akhir Maret 2027'"),
        level: z.enum(["bisnis", "marketing"]).describe("bisnis = omzet/pelanggan; marketing = metrik pendukung"),
      }),
    )
    .describe("3-5 tujuan SMART; minimal 1 tujuan bisnis, sisanya metrik marketing pendukung"),
  segment: z.object({
    primary: t(140).describe("Segmen utama (siapa, di mana, kebiasaan beli)"),
    need: t(200).describe("Kebutuhan/masalah utama segmen yang dijawab produk"),
    secondary: t(140).describe("Segmen kedua yang digarap setelahnya; kosongkan bila tidak perlu"),
    positioning: t(300).describe("Positioning statement: Untuk [segmen] yang [kebutuhan], [brand] adalah [kategori] yang [pembeda] karena [bukti]"),
  }),
  pillars: z
    .array(
      z.object({
        name: t(40).describe("Nama pilar strategis singkat"),
        goal: t(140).describe("Hasil yang ingin dicapai pilar ini, berangka"),
        why: t(200).describe("Kenapa pilar ini, berdasar situasi"),
        initiatives: z.array(t(120)).describe("2-4 inisiatif konkret"),
      }),
    )
    .describe("3-4 pilar strategis"),
  channels: z
    .array(
      z.object({
        channel: t(40),
        funnel: funnelStage.describe("Peran utama kanal di funnel"),
        role: t(140).describe("Peran spesifik kanal ini dalam rencana"),
        tactics: z.array(t(140)).describe("2-4 taktik utama, spesifik (format, frekuensi, mekanik)"),
        budget_pct: z.number().describe("Porsi budget media/produksi untuk kanal ini (%); 0 bila organik"),
        kpi: t(60).describe("KPI utama kanal"),
        target: t(60).describe("Target KPI per bulan"),
      }),
    )
    .describe("4-7 kanal, urut dari yang paling penting"),
  roadmap: z
    .array(
      z.object({
        period: t(30).describe("Bulan atau fase, mis. 'Nov 2026' atau 'Bulan 1-2'"),
        theme: t(60).describe("Fokus/tema periode ini"),
        activities: z.array(t(140)).describe("3-5 aktivitas utama"),
        milestone: t(140).describe("Milestone terukur di akhir periode"),
      }),
    )
    .describe("Roadmap berurutan sesuai aturan periode"),
  budget: z.object({
    monthly: z.number().nullable().describe("Budget marketing per bulan (Rupiah penuh). Dari isian user; bila kosong, rekomendasi realistis"),
    basis: budgetBasis,
    items: z
      .array(
        z.object({
          item: t(50).describe("Pos budget, mis. 'Meta Ads', 'Produksi konten', 'KOL mikro'"),
          pct: z.number().describe("Porsi (%)"),
          amount: z.number().nullable().describe("Nominal per bulan (dihitung program)"),
          note: t(140).describe("Isi pos & alasan porsinya"),
        }),
      )
      .describe("4-7 pos budget, total 100%"),
    note: t(300).describe("Catatan alokasi: aturan geser budget (mis. 70-20-10), cadangan, kapan dinaikkan"),
  }),
  measurement: z
    .array(
      z.object({
        kpi: t(50),
        tool: t(60).describe("Alat ukur, mis. Shopee Seller Center, Meta Ads Manager, GA4, Google Sheet CRM"),
        frequency: t(30).describe("Mingguan / bulanan / per kampanye"),
        owner: t(40).describe("Peran yang bertanggung jawab"),
      }),
    )
    .describe("4-7 baris rencana pengukuran"),
  risks: z
    .array(z.object({ risk: t(140), likelihood: priority, impact: priority, mitigation: t(200) }))
    .describe("3-5 risiko utama & mitigasinya"),
  quick_wins: z
    .array(z.object({ action: t(140), owner: t(40), due: t(30).describe("mis. 'Hari 1-7'"), impact: t(120).describe("Dampak yang diharapkan, berangka bila bisa") }))
    .describe("4-6 aksi 30 hari pertama yang cepat terasa hasilnya"),
});

export type PlanOutput = z.infer<typeof planOutput>;
