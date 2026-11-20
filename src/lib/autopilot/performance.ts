/**
 * Autopilot belajar dari performa (adaptasi langkah "Baca keadaan" skill marqthink-ig): ringkas statistik post
 * Instagram 30 hari terakhir → 2 terbaik, 2 terlemah, dan pola per format / desain / pilar → masuk prompt generator.
 * Modul murni (diuji vitest).
 */

export interface MediaStat {
  ig_media_id: string;
  posted_at: string | null;
  media_type: string | null;
  caption: string | null;
  permalink?: string | null;
  likes: number;
  comments: number;
  reach: number;
  saved: number;
  shares: number;
  views?: number;
  /** Dari social_posts bila post ini dibuat Autopilot. */
  title?: string | null;
  pillar?: string | null;
  design?: string | null;
  kind?: string | null;
}

/** Skor keterlibatan: simpan & share paling berarti untuk algoritma IG, lalu komentar, like, jangkauan. */
export function engagementScore(m: MediaStat) {
  return m.saved * 3 + m.shares * 3 + m.comments * 2 + m.likes + m.reach * 0.02;
}

/** Tingkat keterlibatan terhadap jangkauan (%). */
export function engagementRate(m: MediaStat) {
  return m.reach > 0 ? ((m.likes + m.comments + m.saved + m.shares) / m.reach) * 100 : 0;
}

const FORMAT: Record<string, string> = { CAROUSEL_ALBUM: "carousel", IMAGE: "single image", VIDEO: "Reel", REELS: "Reel" };
export const formatOf = (m: MediaStat) => m.kind ?? FORMAT[(m.media_type ?? "").toUpperCase()] ?? (m.media_type ?? "lainnya").toLowerCase();

function hookOf(m: MediaStat) {
  const t = m.title || (m.caption ?? "").split("\n")[0];
  return t.replace(/\s+/g, " ").trim().slice(0, 90) || "(tanpa caption)";
}

function line(m: MediaStat) {
  return `- "${hookOf(m)}" (${formatOf(m)}${m.design && m.design !== "classic" ? `, desain ${m.design}` : ""}${m.pillar ? `, ${m.pillar}` : ""}): jangkauan ${m.reach}, simpan ${m.saved}, share ${m.shares}, komentar ${m.comments}, like ${m.likes}`;
}

function groupAvg(rows: MediaStat[], key: (m: MediaStat) => string | null | undefined) {
  const g = new Map<string, number[]>();
  for (const m of rows) {
    const k = key(m);
    if (!k) continue;
    g.set(k, [...(g.get(k) ?? []), engagementScore(m)]);
  }
  return [...g.entries()]
    .filter(([, v]) => v.length >= 2)
    .map(([k, v]) => ({ k, avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length }))
    .sort((a, b) => b.avg - a.avg);
}

/** Blok konteks untuk prompt generator (null bila data terlalu sedikit). */
export function summarizePerformance(rows: MediaStat[], now = new Date(), days = 30): string | null {
  const since = now.getTime() - days * 86_400_000;
  const recent = rows.filter((m) => !m.posted_at || Date.parse(m.posted_at) >= since);
  if (recent.length < 3) return null;
  const sorted = [...recent].sort((a, b) => engagementScore(b) - engagementScore(a));
  const best = sorted.slice(0, 2);
  const worst = sorted.slice(-2).reverse().filter((m) => !best.includes(m));
  const parts = [
    `PERFORMA INSTAGRAM ${days} HARI TERAKHIR (${recent.length} post, data asli akun ini). Pakai untuk memilih format, hook & topik; jangan menyebut angka ini di konten.`,
    "Terbaik:",
    ...best.map(line),
    ...(worst.length ? ["Terlemah:", ...worst.map(line)] : []),
  ];
  const fmt = groupAvg(recent, formatOf);
  if (fmt.length >= 2) parts.push(`Format paling kuat: ${fmt[0].k} (rata-rata skor ${fmt[0].avg.toFixed(0)} dari ${fmt[0].n} post) vs terlemah ${fmt[fmt.length - 1].k}.`);
  const des = groupAvg(recent, (m) => (m.design && m.design !== "classic" ? m.design : null));
  if (des.length >= 2) parts.push(`Desain paling kuat: ${des[0].k}.`);
  const pil = groupAvg(recent, (m) => m.pillar);
  if (pil.length >= 2) parts.push(`Pilar paling kuat: ${pil[0].k}; paling lemah: ${pil[pil.length - 1].k}.`);
  parts.push("Arahan: perbanyak pola dari post terbaik (format, gaya hook, topik), kurangi pola post terlemah, tetap jaga variasi pilar.");
  return parts.join("\n");
}
