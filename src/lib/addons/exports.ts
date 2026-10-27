/**
 * Ekspor hasil Smart Tools ke format yang langsung bisa dipakai di aplikasi lain (tanpa AI, tanpa kuota):
 * kalender konten → .ics (Google Calendar/Outlook/iPhone) & CSV, copy iklan → CSV.
 */

export interface CalendarPostLite {
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

const pad = (n: number) => String(n).padStart(2, "0");

/** Escape teks iCalendar (RFC 5545) + lipat baris panjang. */
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

/** "19.00" / "19:00" / "7 malam" → [jam, menit]; default 19:00. */
export function parseTime(time?: string): [number, number] {
  const m = time?.match(/(\d{1,2})[.:](\d{2})/) ?? time?.match(/(\d{1,2})/);
  const h = m ? Math.min(23, Number(m[1])) : 19;
  const min = m && m[2] ? Math.min(59, Number(m[2])) : 0;
  return [h, min];
}

/** Kalender konten → file .ics (zona waktu WIB, 30 menit per posting, pengingat 1 jam sebelumnya). */
export function calendarToIcs(posts: CalendarPostLite[], brand: string, stamp = new Date()) {
  const dtstamp = `${stamp.getUTCFullYear()}${pad(stamp.getUTCMonth() + 1)}${pad(stamp.getUTCDate())}T${pad(stamp.getUTCHours())}${pad(stamp.getUTCMinutes())}00Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Markethink//Kalender Konten//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(`Konten ${brand}`)}`,
    "X-WR-TIMEZONE:Asia/Jakarta",
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Jakarta",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0700",
    "TZOFFSETTO:+0700",
    "TZNAME:WIB",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  posts.forEach((p, i) => {
    const d = p.date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!d) return;
    const [h, m] = parseTime(p.time);
    const endMin = h * 60 + m + 30;
    const start = `${d[1]}${d[2]}${d[3]}T${pad(h)}${pad(m)}00`;
    const end = `${d[1]}${d[2]}${d[3]}T${pad(Math.min(23, Math.floor(endMin / 60)))}${pad(endMin >= 24 * 60 ? 59 : endMin % 60)}00`;
    const desc = [
      p.pillar && `Pilar: ${p.pillar}`,
      p.hook && `Hook: ${p.hook}`,
      p.caption && `Caption:\n${p.caption}`,
      p.cta && `CTA: ${p.cta}`,
      p.hashtags?.length && p.hashtags.map((x) => (x.startsWith("#") ? x : `#${x}`)).join(" "),
      p.visual && `Visual: ${p.visual}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:mt-${d[1]}${d[2]}${d[3]}-${i}-${brand.replace(/[^a-z0-9]/gi, "").toLowerCase() || "brand"}@markethink`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Asia/Jakarta:${start}`,
      `DTEND;TZID=Asia/Jakarta:${end}`,
      fold(`SUMMARY:${icsText(`[${p.platform} · ${p.format}] ${p.title}`)}`),
      fold(`DESCRIPTION:${icsText(desc)}`),
      "BEGIN:VALARM",
      "TRIGGER:-PT1H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsText(`Posting: ${p.title}`)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Baris → CSV (pemisah koma, kutip ganda bila perlu, BOM agar Excel membaca UTF-8). */
export function toCsv(header: string[], rows: (string | number | undefined | null)[][]) {
  const cell = (v: string | number | undefined | null) => {
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `\uFEFF${[header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")}`;
}

export function calendarToCsv(posts: CalendarPostLite[]) {
  return toCsv(
    ["Tanggal", "Jam", "Platform", "Format", "Pilar", "Judul", "Hook", "Caption", "CTA", "Hashtag", "Arahan visual"],
    posts.map((p) => [p.date, p.time, p.platform, p.format, p.pillar, p.title, p.hook, p.caption, p.cta, (p.hashtags ?? []).join(" "), p.visual]),
  );
}

export interface AdVariantLite {
  code?: string;
  angle: string;
  audience: string;
  format: string;
  hook: string;
  primary_text: string;
  headline: string;
  description: string;
  extra_headlines?: string[];
  extra_descriptions?: string[];
  cta_button: string;
  visual: string;
}

export function adcopyToCsv(variants: AdVariantLite[], platform = "") {
  return toCsv(
    ["Kode", "Platform", "Angle", "Audiens", "Format", "Hook", "Primary text", "Headline", "Deskripsi", "Headline tambahan", "Deskripsi tambahan", "Tombol CTA", "Arahan visual"],
    variants.map((v, i) => [
      v.code || `V${i + 1}`,
      platform,
      v.angle,
      v.audience,
      v.format,
      v.hook,
      v.primary_text,
      v.headline,
      v.description,
      (v.extra_headlines ?? []).join(" | "),
      (v.extra_descriptions ?? []).join(" | "),
      v.cta_button,
      v.visual,
    ]),
  );
}

/** "Rp45rb", "45.000", "45k", "1,5 jt", "Rp 150.000/bulan" → rupiah; null bila tidak terbaca. */
export function parseRupiah(text: unknown): number | null {
  if (typeof text !== "string") return null;
  const m = text.toLowerCase().replace(/\s/g, "").match(/(\d+(?:[.,]\d+)*)(jt|juta|rb|ribu|k)?/);
  if (!m) return null;
  let num: number;
  if (m[2]) num = Number(m[1].replace(/\./g, "").replace(",", "."));
  else num = Number(m[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
  if (!Number.isFinite(num)) return null;
  const mult = m[2] === "jt" || m[2] === "juta" ? 1_000_000 : m[2] === "rb" || m[2] === "ribu" || m[2] === "k" ? 1000 : 1;
  const v = Math.round(num * mult);
  return v > 0 ? v : null;
}

/** Halaman Meta Ad Library: iklan yang sedang tayang di Indonesia untuk kata kunci/nama brand. */
export const metaAdLibraryUrl = (name: string) =>
  `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ID&media_type=all&search_type=keyword_unordered&q=${encodeURIComponent(name.trim())}`;

/** Google Trends: bandingkan minat pencarian beberapa nama (maks 5) di Indonesia, 12 bulan terakhir. */
export const googleTrendsUrl = (names: string[]) =>
  `https://trends.google.com/trends/explore?date=today%2012-m&geo=ID&q=${names
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map(encodeURIComponent)
    .join(",")}`;
