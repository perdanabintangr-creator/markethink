/** Slot promosi sidebar (slide otomatis). Data dari tabel `promos`, dikelola di back office. */
export const PROMO_THEMES = ["midnight", "aurora", "sunrise", "ink"] as const;
export type PromoTheme = (typeof PROMO_THEMES)[number];

export interface Promo {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  cta_label: string;
  link_url: string;
  image_url: string | null;
  theme: PromoTheme;
  brand: string | null;
  sponsored: boolean;
}

export const PROMO_COLUMNS = "id, title, subtitle, eyebrow, cta_label, link_url, image_url, theme, brand, sponsored";

/** Link internal ("/chat") dibuka di tab yang sama; link luar (https) di tab baru. */
export const isExternalLink = (url: string) => /^https:\/\//i.test(url);

/** Waktu tampil tiap slide. */
export const PROMO_SLIDE_MS = 6000;
