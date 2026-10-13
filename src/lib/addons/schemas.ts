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
} as const;
export type AiToolId = keyof typeof TOOL_INPUTS;
