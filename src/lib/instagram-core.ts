import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Bagian murni (tanpa jaringan) integrasi Instagram API with Instagram Login: URL izin, enkripsi token,
 * verifikasi signed_request Meta, dan penentuan konten yang jatuh tempo. Diuji vitest.
 */

export const IG_SCOPES = ["instagram_business_basic", "instagram_business_content_publish", "instagram_business_manage_insights"] as const;
export const IG_AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";

export function igAuthorizeUrl(o: { appId: string; redirectUri: string; state: string }) {
  const u = new URL(IG_AUTHORIZE_URL);
  u.searchParams.set("enable_fb_login", "0");
  u.searchParams.set("force_authentication", "1");
  u.searchParams.set("client_id", o.appId);
  u.searchParams.set("redirect_uri", o.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", IG_SCOPES.join(","));
  u.searchParams.set("state", o.state);
  return u.toString();
}

/** Instagram kadang menambahkan "#_" di akhir code. */
export const cleanIgCode = (code: string) => code.replace(/#_$/, "").trim();

/** Kunci 256-bit dari rahasia server (tidak pernah disimpan / dikirim). */
export const tokenKey = (secret: string) => createHash("sha256").update(`marqthink-ig-token:${secret}`).digest();

/** AES-256-GCM → "v1.iv.tag.data" (base64url). */
export function encryptToken(plain: string, key: Buffer) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptToken(sealed: string, key: Buffer) {
  const [v, iv, tag, data] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("format token tidak dikenal");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}

/** Verifikasi `signed_request` dari Meta (deauthorize / data deletion). null bila tanda tangan salah. */
export function parseSignedRequest(signed: string | null | undefined, appSecret: string): { user_id?: string; [k: string]: unknown } | null {
  if (!signed || !appSecret) return null;
  const [sig, payload] = signed.split(".", 2);
  if (!sig || !payload) return null;
  const expected = createHmac("sha256", appSecret).update(payload).digest();
  const got = Buffer.from(sig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data?.algorithm && String(data.algorithm).toUpperCase() !== "HMAC-SHA256") return null;
    return data;
  } catch {
    return null;
  }
}

/** Akun yang bisa posting lewat API: Bisnis atau Kreator. */
export const canPublish = (accountType: string | null | undefined) => /^(BUSINESS|MEDIA_CREATOR|CREATOR)$/i.test(accountType ?? "");

/** Waktu WIB sekarang: tanggal "YYYY-MM-DD" dan jam "HH:MM". */
export function nowWib(now = new Date()) {
  const w = new Date(now.getTime() + 7 * 3_600_000).toISOString();
  return { date: w.slice(0, 10), time: w.slice(11, 16) };
}

/**
 * Konten jatuh tempo: jadwalnya sudah lewat (WIB) tapi belum lebih dari `graceDays` hari
 * (konten yang terlewat lama tidak diposting mendadak).
 */
export function isDue(postDate: string, postTime: string, now = new Date(), graceDays = 2) {
  const { date, time } = nowWib(now);
  const t = postTime.slice(0, 5);
  if (postDate > date || (postDate === date && t > time)) return false;
  const oldest = new Date(Date.parse(`${date}T00:00:00Z`) - graceDays * 86_400_000).toISOString().slice(0, 10);
  return postDate >= oldest;
}

/** Pesan error Instagram yang mudah dipahami pelanggan. */
export function igErrorText(raw: string) {
  const s = raw.toLowerCase();
  if (/error validating access token|session has expired|code"?:\s*190|invalid oauth/.test(s)) return "Akses Instagram kedaluwarsa atau dicabut. Hubungkan ulang Instagram.";
  if (/application request limit|rate limit|code"?:\s*(4|17|32|613)\b/.test(s)) return "Instagram sedang membatasi jumlah posting. Dicoba lagi otomatis nanti.";
  if (/aspect ratio|image ratio/.test(s)) return "Ukuran gambar ditolak Instagram.";
  if (/media download|could not be fetched|download/.test(s)) return "Instagram gagal mengambil gambar. Dicoba lagi otomatis.";
  return "Instagram menolak posting ini. Coba lagi atau posting manual.";
}

/** Ambil nilai metrik dari respons /insights (format values[] atau total_value). */
export function insightValues(data: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] | undefined) {
  const out: Record<string, number> = {};
  for (const d of data ?? []) out[d.name] = Number(d.values?.[0]?.value ?? d.total_value?.value ?? 0) || 0;
  return out;
}
