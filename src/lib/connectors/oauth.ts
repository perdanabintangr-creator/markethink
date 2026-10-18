import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Helper OAuth 2.0 (Authorization Code + PKCE) yang murni (tanpa jaringan), dipakai konektor aplikasi.
 * State + code_verifier disimpan di cookie httpOnly bertanda tangan HMAC, berumur pendek.
 */

export const OAUTH_COOKIE_TTL_SEC = 10 * 60;

const b64url = (buf: Buffer) => buf.toString("base64url");

/** code_verifier acak (RFC 7636: 43 sampai 128 karakter [A-Za-z0-9-._~]). 96 byte → 128 karakter base64url. */
export function createCodeVerifier(bytes = 96) {
  return b64url(randomBytes(bytes));
}

/** code_challenge metode S256 = base64url(sha256(verifier)). */
export function codeChallengeS256(verifier: string) {
  return b64url(createHash("sha256").update(verifier).digest());
}

export function createState(bytes = 32) {
  return b64url(randomBytes(bytes));
}

export interface OAuthCookiePayload {
  /** Provider, mis. "canva". */
  p: string;
  /** state (anti CSRF). */
  s: string;
  /** code_verifier PKCE. */
  v: string;
  /** user Markethink yang memulai alur. */
  u: string;
  /** Halaman tujuan setelah selesai (path relatif, sudah divalidasi). */
  r: string;
  /** Kedaluwarsa (epoch detik). */
  e: number;
}

function sign(body: string, secret: string) {
  return b64url(createHmac("sha256", `markethink-oauth:${secret}`).update(body).digest());
}

export function sealOAuthCookie(payload: Omit<OAuthCookiePayload, "e">, secret: string, now = Date.now()) {
  const full: OAuthCookiePayload = { ...payload, e: Math.floor(now / 1000) + OAUTH_COOKIE_TTL_SEC };
  const body = b64url(Buffer.from(JSON.stringify(full), "utf8"));
  return `${body}.${sign(body, secret)}`;
}

/** null bila tanda tangan salah, rusak, atau kedaluwarsa. */
export function openOAuthCookie(value: string | undefined | null, secret: string, now = Date.now()): OAuthCookiePayload | null {
  if (!value || !secret) return null;
  const dot = value.indexOf(".");
  if (dot <= 0) return null;
  const body = value.slice(0, dot);
  const sig = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(body, secret));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthCookiePayload;
    if (typeof data.e !== "number" || data.e * 1000 < now) return null;
    if (![data.p, data.s, data.v, data.u, data.r].every((x) => typeof x === "string" && x)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Bandingkan state tanpa bocor lewat waktu eksekusi. */
export function sameState(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Path tujuan yang aman (hanya path di situs ini). Menolak URL absolut, "//host", backslash, dan karakter kontrol.
 * Default "/settings?tab=aplikasi".
 */
export function safeReturnPath(raw: string | null | undefined, fallback = "/settings?tab=aplikasi") {
  if (!raw || raw.length > 500) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    const u = new URL(raw, "https://markethink.invalid");
    if (u.origin !== "https://markethink.invalid") return fallback;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return fallback;
  }
}

/** Tambahkan/ganti satu query param pada path relatif (mis. ?canva=connected). Hash tetap di akhir. */
export function withQueryParam(path: string, key: string, value: string) {
  const u = new URL(path, "https://markethink.invalid");
  u.searchParams.set(key, value);
  return `${u.pathname}${u.search}${u.hash}`;
}

export interface AuthorizeUrlInput {
  authorizeUrl: string;
  clientId: string;
  redirectUri: string;
  scopes: readonly string[];
  state: string;
  codeChallenge: string;
}

/** URL halaman izin OAuth (parameter sesuai Canva Connect starter kit: code_challenge_method S256, response_type code). */
export function buildAuthorizeUrl(i: AuthorizeUrlInput) {
  const url = new URL(i.authorizeUrl);
  url.searchParams.set("code_challenge", i.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", i.scopes.join(" "));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", i.clientId);
  url.searchParams.set("redirect_uri", i.redirectUri);
  url.searchParams.set("state", i.state);
  return url.toString();
}

/** Header Basic auth untuk endpoint token (client_id:client_secret, base64). */
export function basicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")}`;
}

/** Judul/nama untuk header metadata Canva: dipotong maks 50 karakter (unencoded), lalu base64 UTF-8. */
export function canvaTitleBase64(title: string, fallback = "Markethink") {
  const clean = title.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() || fallback;
  const cut = Array.from(clean).slice(0, 50).join("").trim();
  return Buffer.from(cut || fallback, "utf8").toString("base64");
}

/** Ukuran desain custom Canva: tiap sisi 40 sampai 8000 px dan luas maks 25 juta px (menjaga rasio). */
export function fitCanvaDimensions(width: number, height: number) {
  let w = Math.max(1, Math.round(width));
  let h = Math.max(1, Math.round(height));
  const scaleDown = Math.min(1, 8000 / w, 8000 / h, Math.sqrt(25_000_000 / (w * h)));
  w = Math.floor(w * scaleDown);
  h = Math.floor(h * scaleDown);
  const scaleUp = Math.max(1, 40 / w, 40 / h);
  w = Math.min(8000, Math.ceil(w * scaleUp));
  h = Math.min(8000, Math.ceil(h * scaleUp));
  return { width: w, height: h };
}
