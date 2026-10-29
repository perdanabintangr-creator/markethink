/**
 * Kalender konten gabungan: semua posting dari hasil "Kalender Konten Bulanan" user (versi terbaru tiap hasil),
 * plus pengelompokan untuk halaman "Hasil saya". Murni (tanpa DB) supaya mudah dites.
 */

export interface CalendarPost {
  date: string;
  time?: string;
  platform: string;
  format: string;
  pillar?: string;
  title: string;
  hook?: string;
  caption?: string;
  cta?: string;
  hashtags?: string[];
  visual?: string;
}

export interface CalendarEntry extends CalendarPost {
  key: string;
  /** Hasil asal (id akar rantai revisi) — untuk tautan "Buka hasil lengkap". */
  runId: string;
  source: string;
}

interface RunRow {
  id: string;
  revision_of: string | null;
  created_at: string;
  title: string | null;
  output: unknown;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Versi terbaru dari tiap rantai hasil (hasil asal + revisinya). */
export function latestPerChain<T extends Pick<RunRow, "id" | "revision_of" | "created_at">>(runs: T[]): (T & { rootId: string })[] {
  const best = new Map<string, T>();
  for (const r of runs) {
    const root = r.revision_of ?? r.id;
    const cur = best.get(root);
    if (!cur || Date.parse(r.created_at) > Date.parse(cur.created_at)) best.set(root, r);
  }
  return [...best.entries()].map(([rootId, r]) => ({ ...r, rootId }));
}

/** Semua posting dari hasil kalender, urut tanggal & jam. Posting dengan tanggal tidak valid dilewati. */
export function collectPosts(runs: RunRow[], fallbackTitle = "Kalender konten"): CalendarEntry[] {
  const out: CalendarEntry[] = [];
  for (const run of latestPerChain(runs)) {
    const posts = (run.output as { posts?: unknown } | null)?.posts;
    if (!Array.isArray(posts)) continue;
    posts.forEach((p, i) => {
      if (!p || typeof p !== "object") return;
      const o = p as Record<string, unknown>;
      const date = str(o.date).slice(0, 10);
      if (!DATE.test(date)) return;
      out.push({
        key: `${run.rootId}:${i}`,
        runId: run.rootId,
        source: run.title?.trim() || fallbackTitle,
        date,
        time: str(o.time) || undefined,
        platform: str(o.platform) || "-",
        format: str(o.format),
        pillar: str(o.pillar) || undefined,
        title: str(o.title) || str(o.hook) || "-",
        hook: str(o.hook) || undefined,
        caption: str(o.caption) || undefined,
        cta: str(o.cta) || undefined,
        hashtags: Array.isArray(o.hashtags) ? o.hashtags.map(str).filter(Boolean) : undefined,
        visual: str(o.visual) || undefined,
      });
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
}

/** Sel kalender bulan "YYYY-MM", Senin di kiri; `null` = sel kosong sebelum tanggal 1 / setelah akhir bulan. */
export function monthGrid(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Bulan awal yang ditampilkan: bulan ini bila ada jadwal; selain itu bulan terdekat yang punya jadwal (ke depan dulu). */
export function initialMonth(entries: Pick<CalendarEntry, "date">[], thisMonth: string) {
  const months = [...new Set(entries.map((e) => e.date.slice(0, 7)))].sort();
  if (!months.length || months.includes(thisMonth)) return thisMonth;
  return months.find((m) => m > thisMonth) ?? months[months.length - 1];
}

/** "Hari ini" / "7 hari terakhir" / "Lebih lama" menurut WIB. */
export function dateBucket(iso: string, now = Date.now()): "today" | "week" | "older" {
  const wib = (ms: number) => new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10);
  const t = Date.parse(iso);
  if (wib(t) === wib(now)) return "today";
  return now - t < 7 * 86_400_000 ? "week" : "older";
}
