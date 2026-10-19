/**
 * Daftar aplikasi yang bisa dipanggil lewat "@" di kotak chat (aman untuk client).
 * Status terhubung/aktif diambil dari GET /api/connectors.
 */

export type ConnectorId = "canva";

export interface ConnectorApp {
  id: ConnectorId;
  name: string;
  /** Teks yang disisipkan ke kotak chat, mis. "@Canva". */
  mention: string;
  description: { id: string; en: string };
  /** Kunci ikon (lihat src/components/connectors/app-icon.tsx). */
  icon: ConnectorId;
}

export const CONNECTOR_APPS: readonly ConnectorApp[] = [
  {
    id: "canva",
    name: "Canva",
    mention: "@Canva",
    description: {
      id: "Kirim hasil ke Canva untuk diedit",
      en: "Send results to Canva for editing",
    },
    icon: "canva",
  },
];

export interface ConnectorStatus {
  id: ConnectorId;
  /** Server sudah dikonfigurasi (client id & secret terisi). */
  enabled: boolean;
  connected: boolean;
  accountName: string | null;
}

/** Kode error kirim ke Canva (pesan ramah ada di src/lib/i18n/connectors.ts). */
export type CanvaErrorCode =
  | "not_configured"
  | "needs_connect"
  | "not_found"
  | "unsupported_file"
  | "file_too_big"
  | "rate_limited"
  | "timeout"
  | "import_failed"
  | "network";

/** Karakter yang boleh ada di kata kunci setelah "@". */
const MENTION_CHAR = /[A-Za-z0-9_-]/;

/**
 * Deteksi "@kata" yang sedang diketik di posisi kursor.
 * Hanya bila "@" ada di awal teks atau setelah spasi/baris baru (bukan bagian email seperti nama@domain).
 * Mengembalikan posisi "@" dan kata kunci (tanpa "@"), atau null.
 */
export function findMention(text: string, caret: number): { start: number; query: string } | null {
  if (caret < 0 || caret > text.length) return null;
  let i = caret - 1;
  while (i >= 0 && MENTION_CHAR.test(text[i])) i--;
  if (i < 0 || text[i] !== "@") return null;
  if (i > 0 && !/\s/.test(text[i - 1])) return null;
  const query = text.slice(i + 1, caret);
  if (query.length > 30) return null;
  return { start: i, query };
}

/** Aplikasi yang cocok dengan kata kunci (awal nama, tidak peka huruf besar/kecil). */
export function filterApps(query: string, apps: readonly ConnectorApp[] = CONNECTOR_APPS) {
  const q = query.trim().toLowerCase();
  return apps.filter((a) => !q || a.name.toLowerCase().startsWith(q) || a.id.startsWith(q));
}

/**
 * Ganti "@kata" yang sedang diketik (dari `start` sampai `caret`) dengan mention aplikasi + spasi.
 * Mengembalikan teks baru dan posisi kursor sesudah mention.
 */
export function insertMention(text: string, start: number, caret: number, mention: string) {
  const after = text.slice(caret).replace(/^[A-Za-z0-9_-]*/, "");
  const glue = after.startsWith(" ") ? "" : " ";
  const next = `${text.slice(0, start)}${mention}${glue}${after}`;
  return { text: next, caret: start + mention.length + 1 };
}

/** Teks pesan menyebut aplikasi (mis. "@Canva"). */
export function mentionsApp(text: string, app: ConnectorApp) {
  const re = new RegExp(`(^|\\s)${app.mention.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9_-])`, "i");
  return re.test(text);
}

/** Pecah teks jadi potongan biasa & mention aplikasi (untuk ditampilkan sebagai lencana berlogo). */
export function splitMentions(text: string, apps: readonly ConnectorApp[] = CONNECTOR_APPS) {
  const out: ({ text: string } | { app: ConnectorApp })[] = [];
  if (!apps.length) return [{ text }];
  const alt = apps.map((a) => a.mention.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(^|\\s)(${alt})(?![A-Za-z0-9_-])`, "gi");
  let last = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index! + m[1].length;
    if (start > last) out.push({ text: text.slice(last, start) });
    out.push({ app: apps.find((a) => a.mention.toLowerCase() === m[2].toLowerCase())! });
    last = start + m[2].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** Hapus semua mention aplikasi dari teks (tombol × di lencana kotak chat). */
export function removeMention(text: string, app: ConnectorApp) {
  return splitMentions(text, [app])
    .map((p) => ("text" in p ? p.text : ""))
    .join("")
    .replace(/^[ \t]+/, "")
    .replace(/[ \t]{2,}/g, " ");
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Ambil id lampiran dari "/api/attachments/<uuid>" atau dari uuid polos. */
export function attachmentIdFromUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.match(UUID_RE);
  return m ? m[0].toLowerCase() : null;
}

/** URL untuk mulai menghubungkan aplikasi; setelah selesai kembali ke `returnPath`. */
export function connectUrlFor(id: ConnectorId, returnPath: string) {
  return `/api/connectors/${id}/start?return=${encodeURIComponent(returnPath)}`;
}
