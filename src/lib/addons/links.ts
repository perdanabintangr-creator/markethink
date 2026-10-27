import "server-only";
import { htmlToText } from "@/lib/ai/research";

/**
 * Baca link yang ditempel user di form Smart Tools (website, landing page, toko, profil) sebagai bukti nyata.
 * Gratis (fetch biasa dari server). Hanya alamat publik: localhost/IP privat/metadata cloud ditolak, termasuk lewat redirect.
 */
export interface LinkRead {
  url: string;
  title: string;
  description: string;
  text: string;
  ok: boolean;
}

const URL_RE = /https?:\/\/[^\s"'<>()[\]{}]+/gi;
const MAX_LINKS = 3;

/** Ambil maks 3 URL unik dari semua isian teks form. */
export function extractUrls(input: Record<string, unknown>) {
  const found: string[] = [];
  for (const v of Object.values(input)) {
    if (typeof v !== "string") continue;
    for (const m of v.match(URL_RE) ?? []) {
      const url = m.replace(/[.,;:!?]+$/, "");
      if (!found.includes(url)) found.push(url);
    }
  }
  return found.slice(0, MAX_LINKS);
}

/** Tolak alamat yang bukan internet publik (pencegah SSRF). */
export function isPublicUrl(raw: string) {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return false;
  if (u.port && !["80", "443"].includes(u.port)) return false;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h.includes(".") || /(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(h)) return false;
  if (h.includes(":")) return false; // IPv6 literal
  const ip = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ip) {
    const [a, b] = [Number(ip[1]), Number(ip[2])];
    if (a === 10 || a === 127 || a === 0 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127))
      return false;
  }
  return true;
}

const meta = (html: string, key: string) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`, "i"))?.[1] ??
  html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`, "i"))?.[1] ??
  "";

const decode = (s: string) => htmlToText(s).replace(/\s+/g, " ").trim();

async function readOne(url: string): Promise<LinkRead> {
  const empty = { url, title: "", description: "", text: "", ok: false };
  let current = url;
  try {
    for (let hop = 0; hop < 4; hop++) {
      if (!isPublicUrl(current)) return empty;
      const res = await fetch(current, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MarkethinkReader/1.0)", Accept: "text/html,application/xhtml+xml" },
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
      });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        current = new URL(loc, current).toString();
        continue;
      }
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return empty;
      const html = (await res.text()).slice(0, 800_000);
      const title = decode(meta(html, "og:title") || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""));
      const description = decode(meta(html, "og:description") || meta(html, "description"));
      const text = htmlToText(html).slice(0, 6000);
      return { url, title, description, text, ok: Boolean(title || description || text.length > 200) };
    }
  } catch {}
  return empty;
}

/** Baca semua link sekaligus (paralel). */
export async function readUserLinks(urls: string[]) {
  return Promise.all(urls.map(readOne));
}

/** Blok bukti untuk prompt AI. Link yang tidak terbaca (mis. butuh login) ikut dicatat supaya AI tidak mengarang isinya. */
export function linksEvidence(reads: LinkRead[]) {
  if (!reads.length) return "";
  return reads
    .map((r) =>
      r.ok
        ? `URL: ${r.url}\nJudul: ${r.title || "-"}\nDeskripsi: ${r.description || "-"}\nIsi halaman:\n${r.text || "-"}`
        : `URL: ${r.url}\n(Tidak bisa dibaca otomatis: halaman butuh login/JavaScript atau menolak akses. Jangan mengarang isinya; pakai data yang diisi user.)`,
    )
    .join("\n\n---\n\n");
}
