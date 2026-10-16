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
