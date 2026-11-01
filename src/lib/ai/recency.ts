/**
 * Aturan kesegaran sumber riset: hanya sumber ≤ 2 tahun dari hari ini.
 * Dipakai di semua pencarian web (Serper, Tavily) dan diingatkan ke AI lewat prompt.
 */
export const MAX_SOURCE_AGE_YEARS = 2;

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, mei: 4, jun: 5, jul: 6, aug: 7, agu: 7, agt: 7, ags: 7,
  sep: 8, oct: 9, okt: 9, nov: 10, dec: 11, des: 11,
};

/** Batas tanggal terlama yang masih boleh dipakai. */
export function sourceCutoff(now = new Date()) {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - MAX_SOURCE_AGE_YEARS);
  return d;
}

/** Parameter Google "rentang tanggal kustom" (tbs) untuk Serper: dari batas 2 tahun sampai hari ini. */
export function googleDateRange(now = new Date()) {
  const c = sourceCutoff(now);
  return `cdr:1,cd_min:${c.getMonth() + 1}/${c.getDate()}/${c.getFullYear()},cd_max:`;
}

/**
 * Baca tanggal terbit dari teks Serper/Tavily ("3 days ago", "2 hari yang lalu", "Mar 5, 2021", "5 Mar 2021", "2023-04-01").
 * Tidak dikenali → null (sumber tetap boleh, AI diminta mengecek tahunnya).
 */
export function parseSourceDate(raw: string | undefined | null, now = new Date()): Date | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  const rel = s.match(/(\d+)\s*(minute|min|menit|hour|jam|day|hari|week|minggu|month|bulan|year|tahun)s?\b/);
  if (rel && /ago|lalu|yang lalu/.test(s)) {
    const n = Number(rel[1]);
    const unit = rel[2];
    const d = new Date(now);
    if (/year|tahun/.test(unit)) d.setFullYear(d.getFullYear() - n);
    else if (/month|bulan/.test(unit)) d.setMonth(d.getMonth() - n);
    else if (/week|minggu/.test(unit)) d.setDate(d.getDate() - n * 7);
    else if (/day|hari/.test(unit)) d.setDate(d.getDate() - n);
    return d;
  }
  const iso = s.match(/\b(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  const year = s.match(/\b(19|20)\d{2}\b/);
  if (!year) return null;
  const mon = s.match(/\b(jan|feb|mar|apr|may|mei|jun|jul|aug|agu|agt|ags|sep|oct|okt|nov|dec|des)[a-z]*\.?/);
  const day = s.replace(year[0], "").match(/\b(\d{1,2})\b/);
  return new Date(Date.UTC(Number(year[0]), mon ? MONTHS[mon[1]] : 0, day && mon ? Number(day[1]) : 1));
}

/** true = sumber cukup baru (atau tanggalnya tidak diketahui). */
export function isRecentSource(published: string | undefined | null, now = new Date()) {
  const d = parseSourceDate(published, now);
  return !d || d.getTime() >= sourceCutoff(now).getTime();
}

/** Aturan untuk AI: tahun sekarang & larangan memakai sumber lama. */
export function recencyRule(now = new Date()) {
  const y = now.getFullYear();
  return (
    `ATURAN SUMBER: Hari ini tahun ${y}. Pakai & kutip HANYA sumber/data dari ${y - MAX_SOURCE_AGE_YEARS}–${y} (maks ${MAX_SOURCE_AGE_YEARS} tahun terakhir). ` +
    `Abaikan sumber yang tahun terbitnya lebih lama atau datanya basi; bila hanya ada data lama, katakan terus terang dan beri label "data lama". ` +
    `Saat mencari, sertakan tahun ${y} atau ${y - 1} di kata kunci bila relevan.`
  );
}
