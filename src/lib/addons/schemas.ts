import { z } from "zod";

/**
 * Skema input (form) & output (hasil terstruktur dari AI) untuk tiap tool add-on.
 * Output dipakai untuk halaman hasil yang visual + file PPT/Excel — bukan sekadar teks chat.
 */

/** Teks hasil AI: tanpa batas keras (agar tidak gagal validasi), panjang dipandu lewat deskripsi. */
const t = (max: number) => z.string().describe(`ringkas, maks ±${max} karakter`);
const opt = (max: number) => z.string().trim().max(max).optional().default("");

// ---------------------------------------------------------------- Optimasi Listing Marketplace

export const PLATFORMS = ["shopee", "tiktok", "tokopedia"] as const;
export const PLATFORM_LABEL: Record<(typeof PLATFORMS)[number], string> = {
  shopee: "Shopee",
  tiktok: "TikTok Shop",
  tokopedia: "Tokopedia",
};
/** Panjang judul yang disarankan agar tidak terpotong di hasil pencarian. */
export const TITLE_LIMIT: Record<(typeof PLATFORMS)[number], number> = { shopee: 100, tiktok: 100, tokopedia: 70 };

export const listingInput = z.object({
  product: z.string().trim().min(2, "Isi nama produk").max(120),
  category: opt(80),
  price: opt(40),
  features: z.string().trim().min(10, "Ceritakan produkmu minimal 10 karakter").max(2000),
  audience: opt(200),
  current_title: opt(255),
  platforms: z.array(z.enum(PLATFORMS)).min(1, "Pilih minimal 1 platform"),
});

export const listingOutput = z.object({
  summary: t(300).describe("1-2 kalimat insight utama strategi listing produk ini"),
  keywords: z
    .array(
      z.object({
        keyword: t(60),
        type: z.enum(["utama", "turunan", "long-tail"]),
        priority: z.number().int().describe("5 = paling penting"),
        where: t(60).describe("Dipakai di mana: judul / deskripsi / tag"),
      }),
    )
    
    ,
  listings: z
    .array(
      z.object({
        platform: z.enum(PLATFORMS),
        title: t(255).describe("Judul produk siap pakai, kata kunci utama di depan, sesuai gaya platform"),
        title_reason: t(200),
        description: t(3000).describe("Deskripsi lengkap siap tempel, pakai baris baru & poin; gaya sesuai platform"),
        highlights: z.array(t(120)),
        hashtags: z.array(t(40)).describe("Untuk TikTok Shop wajib; platform lain boleh kosong"),
      }),
    )
    
    ,
  before_after: z
    .object({ before: t(255), after: t(255), improvements: z.array(t(160)) })
    .nullable()
    .describe("Isi hanya bila user memberi judul lama; selain itu null"),
  photo_tips: z.array(t(160)),
  price_tips: z.array(t(160)),
});

// ---------------------------------------------------------------- Skrip Live Selling

export const liveInput = z.object({
  products: z.string().trim().min(5, "Isi produk yang dijual").max(2000),
  promo: opt(500),
  duration: z.coerce.number().refine((n) => [30, 60, 90, 120].includes(n), "Pilih durasi"),
  host_style: z.enum(["energik", "santai", "edukatif", "lucu"]),
  platform: z.enum(["tiktok", "shopee", "instagram"]),
});

export const liveOutput = z.object({
  title: t(90),
  opening_hooks: z.array(t(200)).describe("Kalimat pembuka 3 detik pertama untuk menahan penonton"),
  segments: z
    .array(
      z.object({
        start_min: z.number().int(),
        end_min: z.number().int(),
        name: t(60),
        goal: t(140),
        script: t(1500).describe("Kalimat host yang bisa langsung diucapkan (boleh beberapa baris)"),
        actions: z.array(t(120)).describe("Aksi fisik/teknis: tunjukkan produk, pin komentar, dsb."),
        cta: t(160),
      }),
    )
    
    ,
  flash_sales: z.array(z.object({ at_min: z.number().int(), offer: t(140), script: t(400) })),
  objections: z.array(z.object({ objection: t(140), answer: t(400) })),
  closing_lines: z.array(t(240)),
  tips: z.array(t(200)),
});

// ---------------------------------------------------------------- Template WhatsApp

export const WA_GOALS = ["broadcast_promo", "follow_up", "abandoned_cart", "faq", "reorder", "greeting", "review"] as const;
export const WA_GOAL_LABEL: Record<(typeof WA_GOALS)[number], string> = {
  broadcast_promo: "Broadcast promo",
  follow_up: "Follow-up calon pembeli",
  abandoned_cart: "Pengingat keranjang / belum bayar",
  faq: "Balasan cepat (FAQ)",
  reorder: "Ajak beli lagi",
  greeting: "Ucapan & momen",
  review: "Minta ulasan",
};

export const whatsappInput = z.object({
  business: z.string().trim().min(2, "Isi nama bisnis").max(200),
  products: opt(1000),
  goals: z.array(z.enum(WA_GOALS)).min(1, "Pilih minimal 1 jenis pesan"),
  tone: z.enum(["ramah", "profesional", "santai", "lucu"]),
  promo: opt(500),
});

export const whatsappOutput = z.object({
  messages: z
    .array(
      z.object({
        category: z.enum(WA_GOALS),
        title: t(60),
        text: t(1200).describe("Isi pesan siap kirim. Format WhatsApp: *tebal*, _miring_. Variabel: {nama}, {produk}, {link}"),
        when: t(140).describe("Kapan sebaiknya dikirim"),
        tip: t(200),
      }),
    )
    
    ,
  broadcast_tips: z.array(t(200)).describe("Tips agar tidak dianggap spam & nomor aman"),
});

// ---------------------------------------------------------------- Analis Laporan Iklan

export const adsInput = z.object({
  platform: z.enum(["meta", "tiktok", "shopee", "google", "lainnya"]),
  goal: z.enum(["penjualan", "leads", "traffic", "awareness"]),
  target: opt(120),
  notes: opt(1000),
  attachment_ids: z.array(z.string().uuid()).min(1, "Upload minimal 1 file laporan").max(5),
});

const num = z.number().nullable();
export const adsOutput = z.object({
  headline: t(160).describe("Kesimpulan 1 kalimat untuk pemilik bisnis"),
  score: z.number().int().describe("Skor kesehatan akun iklan"),
  verdict: z.enum(["sehat", "perlu_perhatian", "kritis"]),
  result_label: t(30).describe("Nama hasil utama, mis. Pembelian / Leads / Klik"),
  totals: z.object({ spend: num, revenue: num, results: num, roas: num, cpa: num, ctr: num }).describe("Total keseluruhan (Rupiah; ctr dalam %)"),
  campaigns: z
    .array(
      z.object({
        name: t(80),
        spend: z.number(),
        results: num,
        revenue: num,
        cpa: num,
        roas: num,
        ctr: num,
        status: z.enum(["bagus", "perhatian", "boros"]),
        diagnosis: t(240),
        action: t(200),
      }),
    )
    
    ,
  wins: z.array(t(200)),
  problems: z.array(t(200)),
  budget_plan: z
    .array(z.object({ name: t(80), current_share: z.number(), recommended_share: z.number(), reason: t(200) }))
    
    ,
  next_steps: z.array(z.object({ step: t(200), impact: z.enum(["tinggi", "sedang", "rendah"]) })),
  data_notes: t(400).describe("Asumsi & keterbatasan data (kolom yang tidak ada, mata uang, periode)"),
});

// ---------------------------------------------------------------- Riset Kompetitor

export const competitorInput = z.object({
  brand: z.string().trim().min(2, "Isi nama brand kamu").max(100),
  product: z.string().trim().min(2, "Isi produk/kategori").max(300),
  market: opt(120),
  competitors: z.string().trim().min(2, "Isi minimal 1 kompetitor").max(600),
  focus: opt(300),
});

export const competitorOutput = z.object({
  summary: t(400),
  competitors: z
    .array(
      z.object({
        name: t(60),
        price_range: t(60),
        positioning: t(160),
        target: t(120),
        strengths: z.array(t(140)),
        weaknesses: z.array(t(140)),
        channels: z.array(t(40)),
        content_style: t(160),
        price_score: z.number().describe("1 = paling murah, 10 = paling premium"),
        quality_score: z.number().describe("Persepsi kualitas/brand: 1 rendah, 10 tinggi"),
      }),
    )
    
    ,
  our_position: z.object({ price_score: z.number(), quality_score: z.number(), note: t(200) }),
  swot: z.object({
    strengths: z.array(t(160)),
    weaknesses: z.array(t(160)),
    opportunities: z.array(t(160)),
    threats: z.array(t(160)),
  }),
  content_gaps: z.array(z.object({ gap: t(140), idea: t(200), format: t(40) })),
  recommendations: z.array(z.object({ title: t(80), detail: t(240), priority: z.enum(["tinggi", "sedang", "rendah"]) })),
});

// ---------------------------------------------------------------- Brief KOL / Affiliate

export const KOL_TIERS = ["nano", "micro", "macro", "mega"] as const;
export const KOL_TIER_LABEL: Record<(typeof KOL_TIERS)[number], string> = {
  nano: "Nano (1rb–10rb)",
  micro: "Micro (10rb–100rb)",
  macro: "Macro (100rb–1jt)",
  mega: "Mega (>1jt)",
};

export const kolInput = z.object({
  brand: z.string().trim().min(2, "Isi nama brand").max(100),
  product: z.string().trim().min(2, "Isi produk").max(300),
  objective: z.enum(["awareness", "penjualan", "launching", "review"]),
  platform: z.enum(["tiktok", "instagram", "youtube", "campuran"]),
  tiers: z.array(z.enum(KOL_TIERS)).min(1, "Pilih minimal 1 tier kreator"),
  creators: z.coerce.number().int().min(1).max(50),
  budget: opt(60),
  timeline: opt(120),
  key_message: opt(500),
  rules: opt(800),
});

export const kolOutput = z.object({
  campaign_name: t(80),
  objective: t(200),
  key_message: t(240),
  audience: t(200),
  deliverables: z.array(z.object({ format: t(60), qty: z.number().int(), specs: t(240) })),
  talking_points: z.array(t(200)),
  dos: z.array(t(160)),
  donts: z.array(t(160)),
  hashtags: z.array(t(40)),
  cta: t(160),
  timeline: z.array(z.object({ when: t(40), task: t(160) })),
  kpis: z.array(z.object({ metric: t(60), target: t(80) })),
  fee_estimate: z.object({
    rows: z
      .array(z.object({ tier: t(40), followers: t(40), fee_min: z.number().int(), fee_max: z.number().int(), qty: z.number().int() }))
      
      ,
    total_min: z.number().int(),
    total_max: z.number().int(),
    note: t(240),
  }),
  dm_template: t(1200),
  contract_points: z.array(t(200)),
});

// ================================================================ Market Research (ala konsultan)

const priority = z.enum(["tinggi", "sedang", "rendah"]);
const recs = z.array(z.object({ title: t(80), detail: t(260), priority }));
export const BIZ_MODELS = ["b2c", "b2b", "keduanya"] as const;
export const BIZ_MODEL_LABEL: Record<(typeof BIZ_MODELS)[number], string> = { b2c: "B2C (jual ke konsumen)", b2b: "B2B (jual ke bisnis)", keduanya: "B2C & B2B" };

// ---------------------------------------------------------------- Ukuran & Tren Pasar

export const sizingInput = z.object({
  product: z.string().trim().min(2, "Isi produk / kategori").max(200),
  business: opt(300),
  area: opt(120),
  target: opt(300),
  price: opt(80),
  model: z.enum(BIZ_MODELS).default("b2c"),
  goal: opt(300),
});

const sizeLevel = z.object({
  value_idr: z.number().describe("Nilai pasar per tahun dalam Rupiah (angka penuh, bukan juta)"),
  buyers: t(80).describe("Perkiraan jumlah pembeli/unit, mis. '12 juta rumah tangga'"),
  definition: t(200).describe("Siapa/apa yang termasuk di level ini"),
  formula: t(260).describe("Cara hitung singkat dengan angka, mis. '12 jt RT × 6 beli/thn × Rp45rb'"),
});

export const sizingOutput = z.object({
  summary: t(400).describe("2-3 kalimat inti: berapa besar pasarnya, tumbuh berapa, peluang utamanya"),
  market_definition: t(240),
  tam: sizeLevel,
  sam: sizeLevel,
  som: sizeLevel.describe("Target realistis 1-3 tahun pertama untuk bisnis user"),
  bottom_up: z.array(z.object({ step: t(100), value: t(80), source: t(100).describe("sumber/asumsi") })).describe("4-7 langkah hitung bottom-up"),
  cagr_pct: z.number().describe("Pertumbuhan pasar per tahun (%)"),
  projection: z
    .array(z.object({ year: z.number().int(), conservative: z.number(), base: z.number(), optimistic: z.number() }))
    .describe("5 tahun ke depan, nilai SAM per tahun (Rupiah) untuk 3 skenario"),
  lifecycle: z.enum(["perkenalan", "pertumbuhan", "dewasa", "penurunan"]),
  lifecycle_note: t(200),
  channels: z.array(z.object({ channel: t(40), share_pct: z.number() })).describe("Porsi penjualan per kanal (total ±100)"),
  trends: z.array(z.object({ title: t(70), detail: t(220), impact: z.enum(["peluang", "ancaman"]) })).describe("4-6 tren"),
  pestel: z
    .array(
      z.object({
        factor: z.enum(["politik", "ekonomi", "sosial", "teknologi", "lingkungan", "hukum"]),
        point: t(200),
        impact: z.enum(["positif", "negatif", "netral"]),
      }),
    )
    .describe("1-2 poin untuk tiap faktor PESTEL"),
  drivers: z.array(t(160)),
  barriers: z.array(t(160)),
  recommendations: recs,
  confidence: z.enum(["tinggi", "sedang", "rendah"]),
  data_gaps: z.array(t(200)).describe("Data yang masih asumsi & cara memvalidasinya"),
});

// ---------------------------------------------------------------- Segmentasi & Persona

export const personaInput = z.object({
  product: z.string().trim().min(2, "Isi produk / kategori").max(200),
  brand: opt(100),
  area: opt(120),
  price: opt(80),
  model: z.enum(BIZ_MODELS).default("b2c"),
  known: opt(800),
  goal: opt(300),
});

export const personaOutput = z.object({
  summary: t(400),
  segments: z
    .array(
      z.object({
        name: t(50),
        description: t(200),
        share_pct: z.number().describe("Perkiraan porsi pasar (%)"),
        attractiveness: z.number().describe("1-10: ukuran, daya beli, pertumbuhan"),
        ease: z.number().describe("1-10: seberapa mudah dimenangkan brand user"),
        why: t(200),
      }),
    )
    .describe("3-5 segmen"),
  priority_segment: t(200).describe("Segmen yang disarankan digarap duluan + alasannya"),
  personas: z
    .array(
      z.object({
        name: t(40).describe("Nama panggilan Indonesia, mis. 'Rina, Ibu Muda Praktis'"),
        segment: t(50),
        age: t(30),
        occupation: t(60),
        income: t(60).describe("Kisaran penghasilan per bulan"),
        location: t(60),
        quote: t(160).describe("Kalimat khas persona, gaya bicara Indonesia"),
        goals: z.array(t(120)),
        pains: z.array(t(120)),
        jobs: z.array(t(140)).describe("Jobs-to-be-done: 'Saat ..., saya ingin ..., agar ...'"),
        triggers: z.array(t(120)),
        objections: z.array(t(120)),
        channels: z.array(t(40)),
        message: t(200).describe("Pesan marketing yang paling kena untuk persona ini"),
      }),
    )
    .describe("2-4 persona"),
  journey: z
    .array(
      z.object({
        stage: t(30),
        doing: t(160),
        thinking: t(160),
        touchpoints: z.array(t(40)),
        pain: t(160),
        opportunity: t(200),
      }),
    )
    .describe("5 tahap: Kenal → Pertimbangkan → Beli → Pakai/Ulang → Rekomendasi"),
  drivers: z.array(z.object({ factor: t(50), importance: z.number().describe("1-10") })).describe("6-8 faktor keputusan beli"),
  insights: z.array(z.object({ insight: t(200), evidence: t(220), implication: t(220) })).describe("3-5 consumer insight"),
  recommendations: recs,
});

// ---------------------------------------------------------------- Kelayakan & Strategi Masuk Pasar

export const entryInput = z.object({
  idea: z.string().trim().min(10, "Ceritakan rencana bisnis/produk minimal 10 karakter").max(1200),
  brand: opt(100),
  area: opt(120),
  model: z.enum(BIZ_MODELS).default("b2c"),
  price: opt(80),
  budget: opt(80),
  assets: opt(600),
});

export const FORCES = ["pesaing", "pendatang_baru", "produk_pengganti", "kuasa_pembeli", "kuasa_pemasok"] as const;
export const FORCE_LABEL: Record<(typeof FORCES)[number], string> = {
  pesaing: "Persaingan antar pemain",
  pendatang_baru: "Ancaman pendatang baru",
  produk_pengganti: "Ancaman produk pengganti",
  kuasa_pembeli: "Daya tawar pembeli",
  kuasa_pemasok: "Daya tawar pemasok",
};

export const entryOutput = z.object({
  summary: t(400),
  verdict: z.enum(["go", "go_bersyarat", "tunda", "no_go"]),
  verdict_reason: t(300),
  scorecard: z
    .array(z.object({ criterion: t(50), weight_pct: z.number(), score: z.number().describe("1-10"), note: t(180) }))
    .describe("5-7 kriteria, total bobot 100: ukuran pasar, pertumbuhan, persaingan, margin, kemudahan masuk, kecocokan kemampuan, risiko regulasi"),
  five_forces: z.array(z.object({ force: z.enum(FORCES), level: z.enum(["rendah", "sedang", "tinggi"]), reasons: z.array(t(160)) })),
  barriers: z.array(t(160)),
  regulations: z
    .array(z.object({ name: t(60), status: z.enum(["wajib", "disarankan", "cek"]), detail: t(200), time: t(50), cost: t(60) }))
    .describe("Izin & regulasi Indonesia yang relevan (NIB/OSS, PIRT, BPOM, Halal, SNI, merek DJKI, dsb.)"),
  entry_modes: z.array(z.object({ mode: t(60), pros: t(180), cons: t(180), fit: z.number().describe("1-10") })).describe("3-4 cara masuk pasar"),
  pricing: z.object({ strategy: t(60), price_range: t(80), rationale: t(260) }),
  unit_economics: z.object({
    price: z.number().describe("Harga jual per unit/pesanan (Rp)"),
    cogs: z.number().describe("HPP per unit (Rp)"),
    marketing: z.number().describe("Biaya marketing per pesanan (Rp)"),
    other: z.number().describe("Biaya lain per pesanan: kemasan, ongkir, fee marketplace (Rp)"),
    note: t(240),
  }),
  capital: z.array(z.object({ item: t(60), amount_idr: z.number() })).describe("Perkiraan modal awal per pos"),
  risks: z.array(z.object({ risk: t(100), likelihood: z.number().describe("1-5"), impact: z.number().describe("1-5"), mitigation: t(200) })),
  plan: z.array(z.object({ phase: t(40), focus: t(80), actions: z.array(t(140)), kpi: t(120) })).describe("3 fase: Hari 1-30, 31-60, 61-90"),
  kpis: z.array(z.object({ metric: t(60), target: t(80) })),
});

// ---------------------------------------------------------------- Desain Survei & Kuesioner

export const SURVEY_TOPICS = ["awareness", "kebiasaan", "harga", "konsep", "kepuasan", "media"] as const;
export const SURVEY_TOPIC_LABEL: Record<(typeof SURVEY_TOPICS)[number], string> = {
  awareness: "Kesadaran merek",
  kebiasaan: "Kebiasaan & perilaku beli",
  harga: "Sensitivitas harga",
  konsep: "Uji konsep / produk baru",
  kepuasan: "Kepuasan & NPS",
  media: "Media & kanal favorit",
};
export const SURVEY_LENGTH = { singkat: "±5 menit (10-12 pertanyaan)", sedang: "±10 menit (18-22 pertanyaan)", lengkap: "±15 menit (25-30 pertanyaan)" } as const;

export const surveyInput = z.object({
  objective: z.string().trim().min(10, "Tulis tujuan riset minimal 10 karakter").max(800),
  product: opt(200),
  respondents: z.string().trim().min(3, "Isi target responden").max(300),
  topics: z.array(z.enum(SURVEY_TOPICS)).min(1, "Pilih minimal 1 topik"),
  method: z.enum(["online", "tatap_muka", "telepon"]).default("online"),
  length: z.enum(["singkat", "sedang", "lengkap"]).default("sedang"),
  margin: z.coerce.number().refine((v) => [3, 5, 10].includes(v)).default(5),
  population: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
});

export const QUESTION_TYPES = ["single", "multi", "likert", "skala", "nps", "ranking", "angka", "terbuka"] as const;
export const QUESTION_TYPE_LABEL: Record<(typeof QUESTION_TYPES)[number], string> = {
  single: "Pilihan tunggal",
  multi: "Pilihan ganda (boleh >1)",
  likert: "Skala setuju 1-5",
  skala: "Skala 1-10",
  nps: "NPS 0-10",
  ranking: "Urutkan",
  angka: "Angka",
  terbuka: "Isian bebas",
};

export const surveyOutput = z.object({
  title: t(90),
  intro: t(500).describe("Kalimat pembuka untuk responden: tujuan, durasi, kerahasiaan, insentif"),
  objectives: z.array(t(160)),
  hypotheses: z.array(t(200)),
  screener: z.array(z.object({ text: t(200), options: z.array(t(60)), qualify: t(120).describe("Jawaban yang lolos / yang dihentikan") })),
  quotas: z.array(z.object({ group: t(60), share_pct: z.number() })).describe("Kuota responden per kelompok (total 100)"),
  sections: z
    .array(
      z.object({
        title: t(60),
        purpose: t(160),
        questions: z.array(
          z.object({
            code: t(8).describe("Q1, Q2, …"),
            text: t(240),
            type: z.enum(QUESTION_TYPES),
            options: z.array(t(80)).describe("Kosong untuk terbuka/angka/nps"),
            note: t(140).describe("Logika lompat / instruksi, kosong bila tidak ada"),
          }),
        ),
      }),
    ),
  analysis: z.array(z.object({ objective: t(120), questions: t(60), method: t(160), output: t(160) })),
  fieldwork: z.array(t(200)).describe("Tips sebar, insentif, cek kualitas jawaban"),
  incentive: t(120),
});

export type SizingOutput = z.infer<typeof sizingOutput> & { sources?: { title: string; url: string }[] };
export type PersonaOutput = z.infer<typeof personaOutput> & { sources?: { title: string; url: string }[] };
export type EntryOutput = z.infer<typeof entryOutput> & {
  sources?: { title: string; url: string }[];
  /** Dihitung program dari scorecard (bukan AI). */
  weighted_score?: number;
};
export type SurveyOutput = z.infer<typeof surveyOutput> & {
  /** Dihitung program (rumus Cochran), bukan AI. */
  sample?: { n: number; recommended: number; margin: number; confidence: number; population: number | null };
};

export type ListingOutput = z.infer<typeof listingOutput>;
export type LiveOutput = z.infer<typeof liveOutput>;
export type WhatsappOutput = z.infer<typeof whatsappOutput>;
export type AdsOutput = z.infer<typeof adsOutput>;
export type CompetitorOutput = z.infer<typeof competitorOutput> & { sources?: { title: string; url: string }[] };
export type KolOutput = z.infer<typeof kolOutput>;

export const TOOL_INPUTS = {
  listing: listingInput,
  live: liveInput,
  whatsapp: whatsappInput,
  ads: adsInput,
  competitor: competitorInput,
  kol: kolInput,
  sizing: sizingInput,
  persona: personaInput,
  entry: entryInput,
  survey: surveyInput,
} as const;
export type AiToolId = keyof typeof TOOL_INPUTS;
