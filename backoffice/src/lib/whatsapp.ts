/**
 * Nomor WhatsApp Indonesia → format baku 62xxxxxxxxxx (tanpa +, spasi, strip).
 * Terima: 0812…, 812…, +62 812…, 62-812…. Kembalikan null bila bukan nomor HP Indonesia yang wajar.
 */
export function normalizeWhatsapp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (d.startsWith("0")) d = `62${d.slice(1)}`;
  else if (d.startsWith("8")) d = `62${d}`;
  return /^628\d{7,12}$/.test(d) ? d : null;
}

/** Tampilan rapi: 62 812-3456-7890. */
export function formatWhatsapp(n: string | null | undefined) {
  if (!n) return "";
  const rest = n.slice(2);
  return `+62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7)}`;
}

/** Link chat WhatsApp. */
export const whatsappLink = (n: string) => `https://wa.me/${n}`;
