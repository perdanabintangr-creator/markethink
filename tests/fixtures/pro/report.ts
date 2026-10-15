/** Contoh hasil AI untuk tool "report". */
export default {
  tool: "report",
  input: { brand: "Kopi Senja", period: "September 2026", data: "Omzet Rp84 jt (Agu Rp71 jt), 1.240 order, Meta Ads Rp12 jt ROAS 3,1x", channels: ["meta_ads", "marketplace"], audience: "owner", color: "#E11D48" },
  kinds: ["pptx", "xlsx"],
  output: {
    headline: "Omzet naik 18% ke Rp84 jt; ROAS TikTok di bawah impas sehingga budget dialihkan ke Meta.",
    summary: "September ditutup dengan omzet Rp84 jt dari 1.240 order. Kenaikan datang dari Meta Ads yang efisien, sementara TikTok Ads boros.",
    kpis: [
      { name: "Omzet", value: 84000000, unit: "Rp", previous: 71000000, target: 90000000, status: "hampir", note: "93% dari target" },
      { name: "Order", value: 1240, unit: "angka", previous: 1050, target: 1500, status: "tertinggal", note: "83% target" },
      { name: "ROAS gabungan", value: 2.9, unit: "x", previous: 2.6, target: 3, status: "hampir", note: "Pendapatan iklan / biaya iklan" },
      { name: "AOV", value: 67742, unit: "Rp", previous: 67619, target: null, status: "tanpa_target", note: "Omzet / order" },
      { name: "Engagement rate IG", value: 3.8, unit: "%", previous: null, target: null, status: "tanpa_target", note: "" },
    ],
    channels: [
      { channel: "Meta Ads", spend: 12000000, revenue: 37200000, result: 520, result_label: "order", verdict: "bagus", highlight: "ROAS 3,1x, CPA Rp23rb", issue: "" },
      { channel: "TikTok Ads", spend: 5000000, revenue: 11000000, result: 160, result_label: "order", verdict: "perlu_perbaikan", highlight: "Reach tinggi", issue: "ROAS 2,2x di bawah impas 2,5x" },
      { channel: "Marketplace", spend: null, revenue: 35800000, result: 560, result_label: "order", verdict: "stabil", highlight: "Organik stabil", issue: "" },
    ],
    wins: [{ title: "Meta Ads efisien", detail: "CPA turun dari Rp29rb ke Rp23rb setelah ganti kreatif testimoni." }],
    issues: [{ title: "TikTok Ads boros", detail: "Rp5 jt menghasilkan ROAS 2,2x.", impact: "tinggi" }],
    insights: [{ insight: "Kreatif testimoni menurunkan CPA 21%", evidence: "CPA Rp29rb → Rp23rb", so_what: "Produksi 4 video testimoni baru tiap bulan" }],
    next_month: {
      focus: "Kejar target omzet Rp90 jt dengan menggeser budget ke kanal efisien",
      actions: [
        { action: "Geser Rp3 jt dari TikTok Ads ke Meta Ads", owner: "Performance marketer", deadline: "1 Okt", kpi: "ROAS ≥ 3x" },
        { action: "Produksi 4 video testimoni", owner: "Content", deadline: "10 Okt", kpi: "CPA ≤ Rp22rb" },
      ],
      budget: "Meta Ads Rp15 jt, TikTok Ads Rp2 jt (uji kreatif saja).",
    },
    data_notes: "Data TikTok organik tidak tersedia.",
  },
};
