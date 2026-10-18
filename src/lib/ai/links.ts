import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ALLOWED_MIME, extractText } from "@/lib/files";
import { htmlToText } from "./research";
import { untrusted } from "./prompt";
import type { LinkPart } from "@/lib/types";

/**
 * Baca tautan yang ditempel user di chat (gratis — server sendiri yang membuka halamannya).
 * Didukung: halaman web/artikel, PDF & dokumen Office online, Google Docs/Sheets/Slides publik,
 * YouTube & TikTok (judul/keterangan). Media sosial lain & marketplace ditolak (wajib login / anti-robot).
 */

export const MAX_LINKS_PER_MESSAGE = 3;
/** Isi tautan untuk pesan saat ini. */
export const LINK_CHARS_NOW = 12_000;
/** Isi tautan yang ikut di riwayat chat (pesan berikutnya). */
export const LINK_CHARS_HISTORY = 4_000;
const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 9_000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 MarkethinkReader/1.0";

export type LinkKind = LinkPart["kind"];

export interface LinkRead {
  url: string;
  host: string;
  ok: boolean;
  kind: LinkKind;
  title: string | null;
  /** Isi lengkap (hanya untuk pesan saat ini, tidak disimpan). */
  text: string;
  /** Alasan bila gagal (untuk AI & label di chat). */
  note: string | null;
}

const BLOCKED: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.watch)$/, "Facebook"],
  [/(^|\.)(x\.com|twitter\.com)$/, "X/Twitter"],
  [/(^|\.)threads\.(net|com)$/, "Threads"],
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
  [/(^|\.)lemon8-app\.com$/, "Lemon8"],
  [/(^|\.)pinterest\.[a-z.]+$/, "Pinterest"],
  [/(^|\.)(shopee\.[a-z.]+|shp\.ee)$/, "Shopee"],
  [/(^|\.)(tokopedia\.com|tokopedia\.link)$/, "Tokopedia"],
  [/(^|\.)lazada\.[a-z.]+$/, "Lazada"],
  [/(^|\.)blibli\.com$/, "Blibli"],
  [/(^|\.)bukalapak\.com$/, "Bukalapak"],
];

/** Ambil maksimal 3 tautan http(s) unik dari teks user. */
export function extractLinks(text: string): string[] {
  const found = text.match(/https?:\/\/[^\s<>"'`]+/gi) ?? [];
  const out: string[] = [];
  for (const raw of found) {
    // Buang tanda baca penutup kalimat yang ikut tersalin.
    let u = raw.replace(/[.,;:!?)\]}'"]+$/, "");
    if ((u.match(/\(/g)?.length ?? 0) > (u.match(/\)/g)?.length ?? 0)) u += ")";
    try {
      const url = new URL(u);
      if (!/^https?:$/.test(url.protocol)) continue;
      const norm = url.toString();
      if (!out.includes(norm)) out.push(norm);
    } catch {
      /* bukan URL valid */
    }
    if (out.length >= MAX_LINKS_PER_MESSAGE) break;
  }
  return out;
}

/** Tolak alamat jaringan internal (keamanan: server tidak boleh disuruh membuka alamat privat). */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
  return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff");
}

async function assertPublicUrl(url: URL) {
  if (!/^https?:$/.test(url.protocol)) throw new Error("protocol");
  if (url.username || url.password) throw new Error("credentials");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("port");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) throw new Error("private");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new Error("private");
}

/** fetch dengan cek alamat publik di setiap pengalihan (maks 4) dan batas ukuran. */
async function safeFetch(input: string, accept: string): Promise<{ res: Response; finalUrl: URL; bytes: Uint8Array }> {
  let url = new URL(input);
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let hop = 0; hop < 5; hop++) {
    await assertPublicUrl(url);
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "id,en;q=0.8" }, redirect: "manual", signal });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) throw new Error("too_large");
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new Error("too_large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      bytes.set(c, off);
      off += c.byteLength;
    }
    return { res, finalUrl: url, bytes };
  }
  throw new Error("redirects");
}

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

function metaContent(html: string, names: string[]) {
  for (const n of names) {
    const re = new RegExp(`<meta[^>]+(?:name|property)=["']${n}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${n}["']`, "i");
    const m = html.match(re);
    const v = m?.[1] ?? m?.[2];
    if (v?.trim()) return decodeEntities(v.trim());
  }
  return null;
}

/** Ubah tautan Google Docs/Sheets/Slides/Drive jadi tautan ekspor teks (hanya berhasil bila dibagikan publik). */
export function googleExportUrl(url: URL): string | null {
  if (url.hostname === "docs.google.com") {
    const m = url.pathname.match(/^\/(document|spreadsheets|presentation)\/d\/([\w-]+)/);
    if (!m) return null;
    const [, type, id] = m;
    if (type === "document") return `https://docs.google.com/document/d/${id}/export?format=txt`;
    if (type === "presentation") return `https://docs.google.com/presentation/d/${id}/export/txt`;
    const gid = url.searchParams.get("gid") ?? url.hash.match(/gid=(\d+)/)?.[1];
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
  }
  if (url.hostname === "drive.google.com") {
    const id = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ?? url.searchParams.get("id");
    return id ? `https://drive.google.com/uc?export=download&id=${id}` : null;
  }
  return null;
}

const isYouTube = (h: string) => /(^|\.)(youtube\.com|youtu\.be)$/.test(h);
const isTikTok = (h: string) => /(^|\.)tiktok\.com$/.test(h);

async function readOEmbed(endpoint: string, url: string): Promise<{ title?: string; author_name?: string } | null> {
  try {
    const { res, bytes } = await safeFetch(`${endpoint}?url=${encodeURIComponent(url)}&format=json`, "application/json");
    return res.ok ? JSON.parse(new TextDecoder().decode(bytes)) : null;
  } catch {
    return null;
  }
}

async function readVideo(url: URL): Promise<Omit<LinkRead, "url" | "host">> {
  const yt = isYouTube(url.hostname);
  const meta = await readOEmbed(yt ? "https://www.youtube.com/oembed" : "https://www.tiktok.com/oembed", url.toString());
  let description: string | null = null;
  if (yt) {
    try {
      const { res, bytes } = await safeFetch(url.toString(), "text/html");
      if (res.ok) description = metaContent(new TextDecoder().decode(bytes), ["og:description", "description"]);
    } catch {
      /* deskripsi opsional */
    }
  }
  if (!meta?.title && !description) return { ok: false, kind: "video", title: null, text: "", note: "Video tidak bisa dibuka (privat/dihapus)." };
  const text = [
    meta?.title && `${yt ? "Judul" : "Caption"}: ${meta.title}`,
    meta?.author_name && `Kreator/akun: ${meta.author_name}`,
    description && `Deskripsi: ${description}`,
    "Catatan: isi/ucapan di dalam video (transkrip) TIDAK terbaca, hanya judul & keterangan.",
  ]
    .filter(Boolean)
    .join("\n");
  return { ok: true, kind: "video", title: meta?.title ?? null, text, note: "Hanya judul & keterangan video" };
}

async function readDocument(target: string, kind: LinkKind): Promise<Omit<LinkRead, "url" | "host">> {
  const { res, finalUrl, bytes } = await safeFetch(target, "text/html,application/xhtml+xml,application/pdf,text/plain,*/*;q=0.8");
  if (finalUrl.hostname === "accounts.google.com" || res.status === 401 || res.status === 403) {
    return { ok: false, kind: "private", title: null, text: "", note: "Perlu login / tidak dibagikan publik." };
  }
  if (!res.ok) return { ok: false, kind: "error", title: null, text: "", note: `Halaman tidak bisa dibuka (kode ${res.status}).` };
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();

  if (type.includes("html")) {
    const html = new TextDecoder().decode(bytes.slice(0, 2_000_000));
    // Google: dokumen privat dialihkan ke halaman login.
    if (kind === "google" && /accounts\.google\.com|ServiceLogin/i.test(html.slice(0, 20_000))) {
      return { ok: false, kind: "private", title: null, text: "", note: "Dokumen Google belum dibagikan publik." };
    }
    const title = metaContent(html, ["og:title", "twitter:title"]) ?? decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "") ?? null;
    const description = metaContent(html, ["og:description", "description", "twitter:description"]);
    const body = htmlToText(html);
    const text = [description && `Ringkasan halaman: ${description}`, body].filter(Boolean).join("\n\n");
    if (body.length < 200 && !description) {
      return { ok: false, kind: "web", title: title || null, text: "", note: "Isi halaman dimuat dengan JavaScript / kosong, tidak terbaca." };
    }
    return { ok: true, kind: kind === "google" ? "google" : "web", title: title || null, text, note: body.length < 200 ? "Hanya ringkasan halaman yang terbaca" : null };
  }

  const mime = type === "text/comma-separated-values" ? "text/csv" : type;
  if (ALLOWED_MIME[mime] && ALLOWED_MIME[mime] !== "image") {
    const text = (await extractText(mime, bytes)).trim();
    if (!text) return { ok: false, kind: "document", title: null, text: "", note: "Isi file tidak terbaca (mungkin hasil scan)." };
    const name = decodeURIComponent(finalUrl.pathname.split("/").pop() ?? "") || null;
    return { ok: true, kind: mime === "application/pdf" ? "pdf" : kind === "google" ? "google" : "document", title: name, text, note: null };
  }
  return { ok: false, kind: "error", title: null, text: "", note: "Jenis file ini belum bisa dibaca." };
}

/** Baca satu tautan. Tidak pernah melempar error — kegagalan dikembalikan sebagai `ok: false` + alasan. */
export async function readLink(raw: string): Promise<LinkRead> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { url: raw, host: raw, ok: false, kind: "error", title: null, text: "", note: "Tautan tidak valid." };
  }
  const host = url.hostname.replace(/^www\./, "");
  const base = { url: url.toString(), host };
  const blocked = BLOCKED.find(([re]) => re.test(url.hostname));
  if (blocked) {
    return {
      ...base,
      ok: false,
      kind: "blocked",
      title: null,
      text: "",
      note: `${blocked[1]} wajib login & memblokir pembaca otomatis.`,
    };
  }
  try {
    if (isYouTube(url.hostname) || isTikTok(url.hostname)) return { ...base, ...(await readVideo(url)) };
    const g = googleExportUrl(url);
    return { ...base, ...(await readDocument(g ?? url.toString(), g ? "google" : "web")) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const note =
      msg === "private" || msg === "protocol" || msg === "credentials" || msg === "port"
        ? "Alamat ini tidak diizinkan."
        : msg === "too_large"
          ? "File terlalu besar (maks 8 MB)."
          : /timeout|abort/i.test(msg)
            ? "Halaman terlalu lama merespons."
            : "Halaman tidak bisa dibuka.";
    return { ...base, ok: false, kind: "error", title: null, text: "", note };
  }
}

export const toLinkPart = (r: LinkRead): LinkPart => ({
  url: r.url,
  host: r.host,
  ok: r.ok,
  kind: r.kind,
  title: r.title,
  note: r.note,
  text: r.text.slice(0, LINK_CHARS_HISTORY),
});

const FAIL_HINT =
  "Beri tahu user dengan jujur bahwa tautan ini tidak bisa dibaca beserta alasannya, JANGAN menebak isinya. " +
  "Sarankan: tempel teks/caption-nya langsung di chat, atau kirim screenshot.";

/** Konteks untuk AI di pesan saat ini (isi lebih panjang). */
export function linkContext(links: (LinkRead | LinkPart)[]): string {
  return links
    .map((l) => {
      if (!l.ok) return `[Tautan ${l.url}] TIDAK TERBACA — ${l.note ?? "gagal dibuka"}. ${FAIL_HINT}`;
      const text = l.text.slice(0, LINK_CHARS_NOW);
      const cut = l.text.length > text.length ? "\n[…dipotong]" : "";
      return `[Isi tautan yang ditempel user: ${l.url}${l.title ? ` — "${l.title}"` : ""}${l.note ? ` (${l.note})` : ""}]\n${untrusted(l.host, text + cut)}`;
    })
    .join("\n\n");
}

/** Versi ringkas untuk riwayat chat (bagian pesan jawaban sebelumnya). */
export function linkHistoryText(l: LinkPart): string {
  if (!l.ok) return `[Tautan ${l.url} tidak terbaca — ${l.note ?? "gagal dibuka"}]`;
  return `[Kamu sudah membaca tautan dari user: ${l.url}${l.title ? ` — "${l.title}"` : ""}. Cuplikan isinya:]\n${untrusted(l.host, l.text)}`;
}
