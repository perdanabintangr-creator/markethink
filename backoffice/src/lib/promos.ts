/** Slot promosi di sidebar aplikasi Marqthink (tabel `promos`). Selaraskan dengan src/lib/promos.ts di aplikasi utama. */
export const PROMO_THEMES = ["midnight", "aurora", "sunrise", "ink"] as const;
export type PromoTheme = (typeof PROMO_THEMES)[number];

export const PLAN_IDS = ["beta", "starter", "pro", "promax"] as const;
export const PLAN_NAMES: Record<(typeof PLAN_IDS)[number], string> = { beta: "Free", starter: "Starter", pro: "Pro", promax: "Promax" };

export const THEME_LABEL: Record<PromoTheme, string> = {
  midnight: "Midnight (biru brand)",
  aurora: "Aurora (biru-ungu)",
  sunrise: "Sunrise (emas-merah)",
  ink: "Ink (hitam-emas, cocok untuk sponsor)",
};

/** Latar tiap tema — sama dengan kartu di aplikasi. */
export const THEME_BG: Record<PromoTheme, string> = {
  midnight:
    "radial-gradient(60% 60% at 85% 10%,rgba(18,208,245,.55),transparent 70%),radial-gradient(55% 55% at 0% 100%,rgba(10,108,255,.45),transparent 70%),linear-gradient(150deg,#040b1f 0%,#08214f 55%,#0a3a8c 100%)",
  aurora:
    "radial-gradient(65% 55% at 90% 0%,rgba(124,92,255,.6),transparent 70%),radial-gradient(60% 60% at 10% 95%,rgba(18,208,245,.45),transparent 70%),linear-gradient(160deg,#050a1c 0%,#0d1b45 50%,#1b1360 100%)",
  sunrise:
    "radial-gradient(60% 60% at 90% 5%,rgba(251,191,36,.55),transparent 70%),radial-gradient(60% 55% at 0% 100%,rgba(244,63,94,.4),transparent 70%),linear-gradient(155deg,#140816 0%,#3a0f2e 55%,#6b1d1d 100%)",
  ink:
    "radial-gradient(55% 50% at 100% 0%,rgba(212,175,55,.35),transparent 70%),radial-gradient(50% 50% at 0% 100%,rgba(148,163,184,.18),transparent 70%),linear-gradient(160deg,#07080b 0%,#12141b 60%,#1c1f29 100%)",
};

export const THEME_ACCENT: Record<PromoTheme, string> = { midnight: "#5fe3ff", aurora: "#b6a6ff", sunrise: "#fcd34d", ink: "#e9c46a" };

export interface PromoRow {
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
  plans: string[] | null;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  active: boolean;
}

export const PROMO_SELECT =
  "id, title, subtitle, eyebrow, cta_label, link_url, image_url, theme, brand, sponsored, plans, starts_at, ends_at, sort_order, active";

/** Status tayang untuk label di daftar. */
export function promoStatus(p: Pick<PromoRow, "active" | "starts_at" | "ends_at">, now = Date.now()) {
  if (!p.active) return { label: "Nonaktif", tone: "muted" as const };
  if (p.starts_at && Date.parse(p.starts_at) > now) return { label: "Terjadwal", tone: "info" as const };
  if (p.ends_at && Date.parse(p.ends_at) <= now) return { label: "Selesai", tone: "muted" as const };
  return { label: "Tayang", tone: "ok" as const };
}
