import { z } from "zod";
import { opts, type ToolForm } from "../fields";
import { t } from "./common";

export const kolreportForm: ToolForm = {
  fields: [
    { type: "text", name: "campaign", label: "Nama kampanye *", required: true, max: 100, placeholder: "mis. Glow Up 10.10 — Serum Niacinamide", half: true },
    { type: "text", name: "brand", label: "Brand / klien", max: 100, placeholder: "mis. Skinfaa", half: true },
    {
      type: "select",
      name: "objective",
      label: "Tujuan kampanye",
      options: opts([
        ["awareness", "Awareness (jangkauan & views)"],
        ["engagement", "Engagement (interaksi)"],
        ["penjualan", "Penjualan (order & omzet)"],
        ["install", "Install / pendaftaran"],
      ]),
      default: "penjualan",
      half: true,
    },
    { type: "text", name: "period", label: "Periode tayang", max: 60, placeholder: "mis. 1–15 Oktober 2026", half: true },
    {
      type: "files",
      name: "attachment_ids",
      label: "Data hasil kreator",
      hint: "Upload rekap tim, export TikTok Shop Affiliate / Shopee Affiliate, atau screenshot insight tiap konten. CSV, Excel, PDF, PNG/JPG — maks 5 file.",
      accept: ".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp",
      max: 5,
    },
    {
      type: "textarea",
      name: "data",
      label: "Atau tulis data per kreator",
      max: 6000,
      rows: 6,
      hint: "Satu baris per kreator: nama, platform, followers, fee, views, likes, komentar, share, save, klik, order, omzet. Isi yang ada saja.",
      placeholder:
        "@rarasoraya, TikTok, 85rb, fee Rp2,5 jt, views 142rb, like 9.800, komen 410, share 260, save 1.150, klik 2.300, order 186, omzet Rp22,3 jt\n@dindaskincarediary, IG Reels, 420rb, fee Rp9 jt, views 98rb, like 3.100, komen 95, save 240, order 41, omzet Rp4,9 jt",
    },
    {
      type: "textarea",
      name: "notes",
      label: "Catatan kampanye (opsional)",
      max: 1500,
      rows: 3,
      hint: "Target KPI, harga/AOV produk, margin, cara atribusi (kode voucher/link affiliate), brief konten, kejadian khusus.",
      placeholder: "mis. Target ROAS 3x, harga serum Rp119rb, margin kotor 55%, atribusi pakai kode voucher per kreator. Brief: review jujur 7 hari pemakaian.",
    },
  ],
  steps: ["Membaca data & screenshot insight kreator…", "Merapikan angka per kreator…", "Menghitung CPM, ER, biaya per order & ROAS…", "Memberi skor & peringkat kreator…", "Menyusun insight & rencana gelombang berikutnya…", "Menyusun PPT & Excel…"],
};

const n = (d: string) => z.number().nullable().describe(d);

export const kolreportOutput = z.object({
  headline: t(140).describe("1 kalimat kesimpulan kampanye untuk klien, berangka"),
  summary: t(600).describe("Ringkasan 3-4 kalimat: hasil total vs tujuan, kreator terbaik & alasannya, yang boros, keputusan untuk gelombang berikutnya"),
  creators: z
    .array(
      z.object({
        name: t(60).describe("Nama/handle kreator persis seperti di data"),
        platform: t(20).describe("TikTok, Instagram, YouTube, dsb."),
        content: t(80).describe("Format & jumlah konten, mis. '1 Reels + 3 Story', '2 video TikTok + 1 live'; kosong bila tidak diketahui"),
        followers: n("Jumlah followers (angka penuh) atau null"),
        fee: n("Fee/biaya kreator dalam Rupiah penuh (termasuk nilai produk bila disebut) atau null"),
        views: n("Total views/plays semua konten kreator ini atau null"),
        likes: n("Total likes atau null"),
        comments: n("Total komentar atau null"),
        shares: n("Total share atau null"),
        saves: n("Total save/favorit atau null"),
        engagements: n("Total engagement HANYA bila data hanya memberi angka total (tanpa rincian); selain itu null"),
        clicks: n("Klik link/keranjang kuning/sticker atau null"),
        orders: n("Order/konversi (atau install/pendaftaran untuk tujuan install) yang teratribusi atau null"),
        revenue: n("Omzet teratribusi (Rp penuh) atau null"),
        note: t(220).describe("Catatan konten dari data: hook/angle, format, waktu tayang, kejadian khusus. Kosong bila tidak ada"),
        next_step: t(180).describe("Saran konkret untuk gelombang berikutnya bagi kreator ini (lanjut dengan apa / poin negosiasi / alasan stop)"),
      }),
    )
    .describe("Satu baris per kreator yang ada datanya. Angka HANYA dari data; null bila tidak ada"),
  insights: z
    .array(z.object({ title: t(80), evidence: t(220).describe("Bukti angka dari data"), action: t(180).describe("Artinya untuk gelombang berikutnya") }))
    .describe("3-5 insight: konten/format/tier/platform yang efektif & yang boros"),
  lessons: z
    .array(z.object({ aspect: t(30).describe("Hook, Format, Durasi, CTA, Waktu tayang, Kecocokan kreator"), lesson: t(200), example: t(160).describe("Contoh dari data atau contoh kalimat untuk brief berikutnya") }))
    .describe("3-5 pelajaran konten untuk brief berikutnya"),
  next_wave: z.object({
    strategy: t(300).describe("Arah gelombang berikutnya: komposisi tier/platform, jumlah kreator, mekanisme (affiliate, whitelisting/Spark Ads)"),
    budget: z
      .array(z.object({ bucket: t(60).describe("Pos budget, mis. 'Repeat 4 micro TikTok terbaik'"), share_pct: z.number(), reason: t(180) }))
      .describe("3-5 pos alokasi budget, total 100%"),
    budget_total: n("Usulan total budget gelombang berikutnya (Rp) bila bisa disimpulkan dari data/catatan; selain itu null"),
    tests: z.array(t(180)).describe("2-3 eksperimen untuk gelombang berikutnya"),
  }),
  data_notes: t(400).describe("Keterbatasan data, cara atribusi, dan asumsi yang dipakai"),
});

export type KolreportAI = z.infer<typeof kolreportOutput>;
export type KolCreator = KolreportAI["creators"][number];
export type KolObjective = "awareness" | "engagement" | "penjualan" | "install";
export type KolVerdict = "lanjut" | "negosiasi" | "stop" | "cek_data";
export type KolTier = "nano" | "micro" | "macro" | "mega" | "-";

export interface KolRow extends KolCreator {
  rank: number;
  tier: KolTier;
  er: number | null;
  er_base: "views" | "followers" | null;
  cpm: number | null;
  cpe: number | null;
  cpc: number | null;
  cpo: number | null;
  roas: number | null;
  score: number | null;
  verdict: KolVerdict;
  fair_fee: number | null;
}

export interface KolCalc {
  objective: KolObjective;
  rows: KolRow[];
  totals: {
    creators: number;
    fee: number;
    followers: number;
    views: number;
    engagements: number;
    clicks: number;
    orders: number;
    revenue: number;
    er: number | null;
    cpm: number | null;
    cpe: number | null;
    cpc: number | null;
    cpo: number | null;
    roas: number | null;
    avg_fee: number | null;
    avg_views: number | null;
    avg_score: number | null;
  };
  counts: Record<KolVerdict, number>;
}

export type KolreportOutput = KolreportAI & { calc?: KolCalc };

export const OBJECTIVE_LABEL: Record<KolObjective, string> = {
  awareness: "Awareness",
  engagement: "Engagement",
  penjualan: "Penjualan",
  install: "Install / pendaftaran",
};
export const VERDICT_LABEL: Record<KolVerdict, string> = { lanjut: "Lanjut", negosiasi: "Negosiasi ulang", stop: "Stop", cek_data: "Cek data" };
export const VERDICT_COLOR: Record<KolVerdict, string> = { lanjut: "E8F8EF", negosiasi: "FFF4D6", stop: "FDE2E2", cek_data: "EEEEEE" };
export const TIER_LABEL: Record<KolTier, string> = { nano: "Nano", micro: "Micro", macro: "Macro", mega: "Mega", "-": "-" };

/** Metrik yang dinilai per tujuan kampanye: bobot skor (total 1). */
export const WEIGHTS: Record<KolObjective, Partial<Record<"cpm" | "views" | "er" | "cpe" | "cpc" | "cpo" | "roas", number>>> = {
  awareness: { cpm: 0.45, views: 0.35, er: 0.2 },
  engagement: { er: 0.4, cpe: 0.4, cpm: 0.2 },
  penjualan: { roas: 0.5, cpo: 0.35, cpc: 0.15 },
  install: { cpo: 0.5, cpc: 0.3, cpm: 0.2 },
};

export const METRIC_LABEL = { cpm: "CPM", views: "Views", er: "ER", cpe: "CPE", cpc: "CPC", cpo: "CPO", roas: "ROAS" } as const;
export type KolMetric = keyof typeof METRIC_LABEL;

/** Metrik biaya utama per tujuan (dipakai grafik & patokan negosiasi fee). */
export const PRIMARY_METRIC: Record<KolObjective, "cpm" | "cpe" | "cpo" | "roas"> = { awareness: "cpm", engagement: "cpe", penjualan: "roas", install: "cpo" };

export const tierOf = (followers: number | null): KolTier =>
  followers === null || !Number.isFinite(followers) || followers <= 0 ? "-" : followers < 10_000 ? "nano" : followers < 100_000 ? "micro" : followers < 1_000_000 ? "macro" : "mega";

const ok = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const pos = (v: number | null | undefined): v is number => ok(v) && v > 0;
const div = (a: number | null | undefined, b: number | null | undefined) => (ok(a) && pos(b) ? a / b : null);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** Skor patokan pasar 0..1 (skala log untuk biaya). */
const benchLow = (v: number, good: number, bad: number) => clamp01((Math.log(bad) - Math.log(Math.max(v, 1e-9))) / (Math.log(bad) - Math.log(good)));
const benchHigh = (v: number, good: number, bad: number) => clamp01((v - bad) / (good - bad));
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function engagementsOf(c: KolCreator) {
  const parts = [c.likes, c.comments, c.shares, c.saves].filter(ok);
  return parts.length ? parts.reduce((a, b) => a + b, 0) : ok(c.engagements) ? c.engagements : null;
}

/**
 * Hitung metrik, skor 0-100, verdict & peringkat secara program (tidak memakai hitungan AI).
 * Skor tiap metrik = 50% patokan pasar Indonesia + 50% posisi relatif terhadap kreator lain di kampanye yang sama.
 */
export function computeKol(creators: KolCreator[], objective: KolObjective): KolCalc {
  const base = creators.map((c) => {
    const engagements = engagementsOf(c);
    const views = pos(c.views) ? c.views : null;
    const erViews = div(engagements, views);
    const erFollowers = div(engagements, c.followers);
    const fee = pos(c.fee) ? c.fee : null;
    return {
      ...c,
      engagements,
      tier: tierOf(c.followers),
      er: erViews !== null ? erViews * 100 : erFollowers !== null ? erFollowers * 100 : null,
      er_base: erViews !== null ? ("views" as const) : erFollowers !== null ? ("followers" as const) : null,
      cpm: fee !== null && views !== null ? (fee / views) * 1000 : null,
      cpe: div(fee, engagements),
      cpc: div(fee, c.clicks),
      cpo: div(fee, c.orders),
      roas: fee !== null && ok(c.revenue) ? c.revenue / fee : null,
      viewRate: div(views, c.followers),
    };
  });

  const higher = new Set(["views", "er", "roas"]);
  const valueOf = (r: (typeof base)[number], m: KolMetric) => (m === "views" ? r.views : r[m]);
  const relative = (m: KolMetric, v: number) => {
    const vals = base.map((r) => valueOf(r, m)).filter(ok);
    if (vals.length < 2) return null;
    const better = vals.filter((x) => (higher.has(m) ? v > x : v < x)).length;
    const ties = vals.filter((x) => x === v).length - 1;
    return (better + ties * 0.5) / (vals.length - 1);
  };
  const aov = (r: (typeof base)[number]) => div(r.revenue, r.orders);
  const bench = (r: (typeof base)[number], m: KolMetric, v: number): number | null => {
    switch (m) {
      case "cpm":
        return benchLow(v, 15_000, 80_000);
      case "cpe":
        return benchLow(v, 250, 2_500);
      case "cpc":
        return benchLow(v, 1_000, 8_000);
      case "er":
        return r.er_base === "followers" ? benchHigh(v, 5, 0.8) : benchHigh(v, 8, 1.5);
      case "roas":
        return benchHigh(v, 4, 0.5);
      case "cpo": {
        const a = aov(r);
        if (objective === "install") return benchLow(v, 5_000, 40_000);
        return a ? benchHigh(1 - v / a, 0.85, 0.25) : benchLow(v, 15_000, 100_000);
      }
      case "views":
        return r.viewRate !== null ? benchHigh(r.viewRate, 0.4, 0.05) : null;
    }
  };

  const weights = WEIGHTS[objective];
  const totalWeight = Object.values(weights).reduce((a, b) => a + (b ?? 0), 0);
  const scored = base.map((r) => {
    let sum = 0;
    let used = 0;
    for (const [m, w] of Object.entries(weights) as [KolMetric, number][]) {
      const v = valueOf(r, m);
      if (!ok(v)) continue;
      const parts = [bench(r, m, v), relative(m, v)].filter((x): x is number => x !== null);
      if (!parts.length) continue;
      sum += w * (parts.reduce((a, b) => a + b, 0) / parts.length);
      used += w;
    }
    const score = used >= totalWeight * 0.4 ? Math.round((sum / used) * 100) : null;
    let verdict: KolVerdict = score === null ? "cek_data" : score >= 65 ? "lanjut" : score >= 40 ? "negosiasi" : "stop";
    if (verdict === "lanjut" && objective === "penjualan" && r.roas !== null && r.roas < 1) verdict = "negosiasi";
    return { ...r, score, verdict };
  });

  // Patokan fee wajar untuk negosiasi: fee yang membuat metrik utama kreator setara median kampanye (ROAS: median dibatasi 2-3x).
  const primary = PRIMARY_METRIC[objective];
  const med = median(scored.map((r) => r[primary]).filter(ok).filter((x) => x > 0));
  const round = (x: number) => (x >= 1_000_000 ? Math.round(x / 50_000) * 50_000 : Math.round(x / 10_000) * 10_000);
  const rows: KolRow[] = scored
    .map((r) => {
      let fair: number | null = null;
      const v = r[primary];
      if (r.verdict === "negosiasi" && med !== null && ok(v) && pos(r.fee)) {
        if (primary === "roas") fair = ok(r.revenue) && r.revenue > 0 ? r.revenue / Math.min(3, Math.max(med, 2)) : null;
        else if (v > 0) fair = (r.fee * med) / v;
        if (fair !== null) fair = fair < r.fee * 0.97 && fair > 0 ? round(fair) : null;
      }
      const { viewRate: _vr, ...rest } = r;
      void _vr;
      return { ...rest, fair_fee: fair, rank: 0 };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const sum = (pick: (r: KolRow) => number | null) => rows.reduce((a, r) => a + (ok(pick(r)) ? (pick(r) as number) : 0), 0);
  const pair = (num: (r: KolRow) => number | null, den: (r: KolRow) => number | null, k = 1) => {
    const both = rows.filter((r) => ok(num(r)) && pos(den(r)));
    const d = both.reduce((a, r) => a + (den(r) as number), 0);
    return both.length && d > 0 ? (both.reduce((a, r) => a + (num(r) as number), 0) / d) * k : null;
  };
  const scores = rows.map((r) => r.score).filter(ok);
  const withFee = rows.filter((r) => pos(r.fee));
  const withViews = rows.filter((r) => pos(r.views));
  const counts: Record<KolVerdict, number> = { lanjut: 0, negosiasi: 0, stop: 0, cek_data: 0 };
  for (const r of rows) counts[r.verdict]++;

  return {
    objective,
    rows,
    counts,
    totals: {
      creators: rows.length,
      fee: sum((r) => r.fee),
      followers: sum((r) => r.followers),
      views: sum((r) => r.views),
      engagements: sum((r) => r.engagements),
      clicks: sum((r) => r.clicks),
      orders: sum((r) => r.orders),
      revenue: sum((r) => r.revenue),
      er: pair((r) => r.engagements, (r) => (r.er_base === "views" ? r.views : null), 100),
      cpm: pair((r) => r.fee, (r) => r.views, 1000),
      cpe: pair((r) => r.fee, (r) => r.engagements),
      cpc: pair((r) => r.fee, (r) => r.clicks),
      cpo: pair((r) => r.fee, (r) => r.orders),
      roas: pair((r) => r.revenue, (r) => (ok(r.revenue) ? r.fee : null)),
      avg_fee: withFee.length ? withFee.reduce((a, r) => a + (r.fee as number), 0) / withFee.length : null,
      avg_views: withViews.length ? withViews.reduce((a, r) => a + (r.views as number), 0) / withViews.length : null,
      avg_score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    },
  };
}

// ---------------------------------------------------------------- format (dipakai halaman hasil, PPT, Excel)
const idn = (v: number, d: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: d }).format(v);
export const kolRp = (v: number | null | undefined) =>
  !ok(v) ? "-" : Math.abs(v) >= 1e9 ? `Rp${idn(v / 1e9, 1)} M` : Math.abs(v) >= 1e6 ? `Rp${idn(v / 1e6, 1)} jt` : Math.abs(v) >= 1e3 ? `Rp${idn(v / 1e3, 1)} rb` : `Rp${idn(v, 0)}`;
export const kolNum = (v: number | null | undefined) =>
  !ok(v) ? "-" : Math.abs(v) >= 1e6 ? `${idn(v / 1e6, 1)} jt` : Math.abs(v) >= 1e4 ? `${idn(v / 1e3, 1)} rb` : idn(v, 0);

/** Format nilai metrik sesuai jenisnya. */
export function metricText(m: KolMetric, v: number | null | undefined) {
  if (!ok(v)) return "-";
  if (m === "er") return `${idn(v, 1)}%`;
  if (m === "roas") return `${idn(v, 2)}x`;
  if (m === "views") return kolNum(v);
  return kolRp(v);
}

/** Ambil kalkulasi yang tersimpan, atau hitung ulang (untuk hasil lama). */
export const kolCalcOf = (data: KolreportOutput, objective: KolObjective = "penjualan") => data.calc ?? computeKol(data.creators, objective);
