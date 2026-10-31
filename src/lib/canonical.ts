/**
 * Alamat utama aplikasi. Bila env CANONICAL_HOST diisi (mis. "marqthink.com"), halaman yang dibuka dari alamat lain
 * (mis. markethink-pi.vercel.app) dialihkan permanen ke alamat utama. API, webhook & cron tidak dialihkan
 * supaya callback gateway pembayaran / Canva yang masih memakai alamat lama tetap jalan.
 */
export function canonicalRedirect(url: URL, method: string, canonicalHost = process.env.CANONICAL_HOST?.trim().toLowerCase()) {
  if (!canonicalHost || (method !== "GET" && method !== "HEAD")) return null;
  const host = url.hostname.toLowerCase();
  if (host === canonicalHost || host === "localhost" || host === "127.0.0.1") return null;
  // Preview deployment (alamat unik tiap deploy) tidak dialihkan.
  if (host.endsWith(".vercel.app") && host !== "markethink-pi.vercel.app") return null;
  if (url.pathname.startsWith("/api/")) return null;
  const target = new URL(url.pathname + url.search, `https://${canonicalHost}`);
  return target.toString();
}
