import type { TierId } from "./models.config";

/** Pilihan otak di chat: salah satu tier, atau "auto" (Otak Otomatis). */
export type TierChoice = TierId | "auto";

const HEAVY = new RegExp(
  [
    "strategi", "strategy", "campaign", "kampanye", "marketing plan", "rencana", "plan\\b", "analisa", "analisis", "analyze",
    "riset", "research", "kompetitor", "competitor", "persona", "segmen", "positioning", "brand guideline", "swot", "funnel",
    "go.to.market", "gtm", "launch", "peluncuran", "proposal", "pitch", "rab\\b", "budget", "anggaran", "proyeksi", "forecast",
    "roi", "roas", "margin", "harga jual", "pricing", "laporan", "report", "kalender", "calendar", "ppt", "presentasi", "slide",
    "deck", "evaluasi", "audit", "bandingkan", "compare", "framework", "okr", "kpi", "sop", "brief",
  ].join("|"),
  "i",
);

/**
 * Otak Otomatis: pesan ringan (sapaan, caption, ide cepat, rewrite, terjemah) → Junior; pekerjaan strategi,
 * analisis, dokumen, file terlampir, Riset Web, atau chat hasil Tools Pro → Senior. Ragu → Senior (jaga kualitas).
 */
export function autoTier(text: string, opts: { attachments?: number; research?: boolean; toolChat?: boolean } = {}): "junior" | "senior" {
  const t = text.trim();
  if (opts.attachments || opts.research || opts.toolChat) return "senior";
  if (t.length > 280 || t.split("\n").length > 4) return "senior";
  if (HEAVY.test(t)) return "senior";
  return "junior";
}

const CREATIVE = new RegExp(
  [
    "caption", "captions", "hashtag", "copywriting", "copy iklan", "ad copy", "ads copy", "headline", "tagline", "slogan", "jargon",
    "primary text", "hook", "bio instagram", "bio ig", "ide konten", "ide post", "content idea", "kalender konten", "content calendar",
    "rencana konten", "konten (instagram|ig|tiktok|sosmed|media sosial)", "persona", "deskripsi produk", "product description",
    "judul (produk|konten|artikel|video)", "nama (brand|produk|usaha)", "kompetitor", "competitor", "pesaing", "postingan", "posting(an)? ig",
    "thread", "carousel",
  ].join("|"),
  "i",
);
/** Tetap Claude: hitungan/angka, budget, strategi bisnis, komplain pelanggan, naskah video (Claude unggul di uji buta 27 Nov). */
const CLAUDE_ONLY = new RegExp(
  [
    "hitung", "kalkulasi", "calculate", "budget", "anggaran", "biaya", "modal", "harga pokok", "hpp", "margin", "roi\\b", "roas", "cac\\b",
    "ltv", "proyeksi", "forecast", "omzet", "rab\\b", "laporan keuangan", "excel", "rumus", "komplain", "keluhan", "complain", "refund",
    "kompensasi", "naskah", "script", "skrip", "video", "reels?\\b", "tiktok", "strategi bisnis", "business plan", "campaign plan",
    "rencana kampanye", "harbolnas", "penjualan turun", "sales turun", "kontrak", "legal", "hukum", "pajak", "\\d+\\s?%",
  ].join("|"),
  "i",
);

/** Pesan kreatif yang cocok untuk otak Senior hemat (Qwen). Ragu → false (Claude). */
export function isCreativeTask(text: string) {
  const t = text.trim();
  if (!t || t.length > 1200) return false;
  return CREATIVE.test(t) && !CLAUDE_ONLY.test(t);
}

/** Tier nyata yang dipakai: "auto" diselesaikan lalu disesuaikan dengan tier yang dibuka paket user. */
export function resolveTier(choice: TierChoice, allowed: readonly TierId[], pick: () => "junior" | "senior"): TierId {
  if (choice !== "auto") return choice;
  const want = pick();
  if (allowed.includes(want)) return want;
  if (allowed.includes("senior")) return "senior";
  return allowed[0] ?? "junior";
}

const IMAGE_NOUN = "(gambar|foto|poster|banner|flyer|pamflet|feed|ilustrasi|desain|visual|logo|mockup|thumbnail|background|latar|image|picture|photo)";
const IMAGE_ASK = new RegExp(
  `(\\b(buat(kan|in)?|bikin(in|kan)?|generate|ciptakan|desain(kan)?|gambar(kan)?|edit|ubah|ganti|tambah(kan)?|hapus|ganti|jadikan|perbaiki|revisi|create|make|draw)\\b[^.\\n]{0,80}\\b${IMAGE_NOUN}\\b)|^\\s*${IMAGE_NOUN}\\b`,
  "i",
);
/** Pekerjaan teks yang butuh otak lebih pintar walau ada kata "gambar" (mis. "strategi + gambar"). */
const NOT_IMAGE_ONLY =
  /(strategi|strategy|analisis|analisa|rencana|campaign plan|kampanye|riset|research|ppt|presentasi|slide|deck|caption|copywriting|artikel|kalender|laporan|budget|anggaran|kpi|proposal|prompt)/i;

/**
 * Permintaan murni membuat/mengedit gambar → cukup otak Junior (kualitas gambar ditentukan model gambar, bukan otak chat).
 * Hemat ±Rp600 per gambar dibanding Senior pada chat baru.
 */
export function isImageRequest(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 700) return false;
  return IMAGE_ASK.test(t) && !NOT_IMAGE_ONLY.test(t);
}

/** Permintaan PPT/presentasi — butuh model yang andal menyusun file besar (Gemini gratis sering berhenti tanpa hasil). */
export function isDeckRequest(text: string): boolean {
  return /\b(ppt|pptx|power ?point|presentasi|slide|slides|deck|pitch ?deck|carousel|karosel|korsel|poster|flyer|pamflet)\b/i.test(text);
}
