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
