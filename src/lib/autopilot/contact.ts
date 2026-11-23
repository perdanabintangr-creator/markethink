import type { SosmedContact } from "./render-sosmed";

/**
 * Kontak brand untuk bar bawah template sosmed, dari Brand Kit / Brand Onboarding: nomor WhatsApp (dari CTA WhatsApp),
 * akun Instagram, website, dan teks tombol sesuai CTA utama. Modul murni (diuji vitest).
 */
const CTA_LABEL: Record<string, { id: string; en: string }> = {
  whatsapp: { id: "Pesan Sekarang", en: "Order Now" },
  link_booking: { id: "Booking Sekarang", en: "Book Now" },
  dm: { id: "DM Sekarang", en: "DM Us" },
  datang: { id: "Kunjungi Kami", en: "Visit Us" },
};

/** "6281234567890" / "wa.me/62812..." / "0812-3456-7890" → "0812-3456-7890". */
export function formatWa(raw: string | null | undefined) {
  const digits = (raw ?? "").replace(/[^0-9]/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  const local = digits.startsWith("62") ? `0${digits.slice(2)}` : digits.startsWith("0") ? digits : `0${digits}`;
  return local.replace(/^(\d{4})(\d{4})(\d+)$/, "$1-$2-$3");
}

export function brandContact(kit: Record<string, unknown> | null | undefined, handle: string | null | undefined, en = false): SosmedContact {
  const k = kit ?? {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const cta = str(k.cta_primary);
  const link = str(k.cta_link);
  const wa = cta === "whatsapp" || (link && /wa\.me|whatsapp|^\+?\d[\d\s-]{8,}$/i.test(link)) ? formatWa(link ?? str(k.whatsapp)) : formatWa(str(k.whatsapp));
  const igRaw = str(k.instagram) ?? str(k.social_handle) ?? (handle ? handle : null);
  const ig = igRaw ? `@${igRaw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "")}` : null;
  const web = str(k.website);
  return { wa, ig: ig && ig.length > 1 ? ig : null, web, cta: cta ? (CTA_LABEL[cta]?.[en ? "en" : "id"] ?? null) : null };
}
