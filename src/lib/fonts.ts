/**
 * Pilihan font tampilan per perangkat (localStorage), dimuat dari Google Fonts hanya saat dipilih.
 * Atribut `data-font` di <html> + variabel `--user-font` dibaca globals.css.
 */
export type FontGroup = "standard" | "fun" | "classic";

export interface AppFont {
  id: string;
  name: string;
  group: FontGroup;
  /** Nilai CSS font-family. */
  family: string;
  /** Parameter `family=` Google Fonts; kosong = font bawaan perangkat. */
  google?: string;
}

export const FONT_KEY = "mt-font";
export const DEFAULT_FONT = "default";

export const APP_FONTS: AppFont[] = [
  { id: "default", name: "Bawaan", group: "standard", family: "" },
  { id: "inter", name: "Inter", group: "standard", family: "'Inter', sans-serif", google: "Inter:wght@400;500;600;700" },
  { id: "jakarta", name: "Plus Jakarta Sans", group: "standard", family: "'Plus Jakarta Sans', sans-serif", google: "Plus+Jakarta+Sans:wght@400;500;600;700" },
  { id: "poppins", name: "Poppins", group: "standard", family: "'Poppins', sans-serif", google: "Poppins:wght@400;500;600;700" },
  { id: "nunito", name: "Nunito", group: "standard", family: "'Nunito', sans-serif", google: "Nunito:wght@400;500;600;700" },
  { id: "lexend", name: "Lexend", group: "standard", family: "'Lexend', sans-serif", google: "Lexend:wght@400;500;600;700" },
  { id: "comic", name: "Comic Neue", group: "fun", family: "'Comic Neue', cursive", google: "Comic+Neue:wght@400;700" },
  { id: "fredoka", name: "Fredoka", group: "fun", family: "'Fredoka', sans-serif", google: "Fredoka:wght@400;500;600;700" },
  { id: "baloo", name: "Baloo 2", group: "fun", family: "'Baloo 2', sans-serif", google: "Baloo+2:wght@400;500;600;700" },
  { id: "patrick", name: "Patrick Hand", group: "fun", family: "'Patrick Hand', cursive", google: "Patrick+Hand" },
  { id: "itim", name: "Itim", group: "fun", family: "'Itim', cursive", google: "Itim" },
  { id: "delius", name: "Delius", group: "fun", family: "'Delius', cursive", google: "Delius" },
  { id: "lora", name: "Lora", group: "classic", family: "'Lora', serif", google: "Lora:wght@400;500;600;700" },
  { id: "merriweather", name: "Merriweather", group: "classic", family: "'Merriweather', serif", google: "Merriweather:wght@400;700" },
  { id: "mono", name: "JetBrains Mono", group: "classic", family: "'JetBrains Mono', monospace", google: "JetBrains+Mono:wght@400;500;700" },
];

export const fontById = (id: string | null | undefined) => APP_FONTS.find((f) => f.id === id);

export const googleFontsUrl = (fonts: AppFont[]) => {
  const q = fonts.filter((f) => f.google).map((f) => `family=${f.google}`);
  return q.length ? `https://fonts.googleapis.com/css2?${q.join("&")}&display=swap` : null;
};

const LINK_ID = "mt-font-link";

/** Pasang font ke halaman: atribut, variabel CSS & stylesheet Google Fonts. */
export function applyFont(id: string) {
  const f = fontById(id);
  const root = document.documentElement;
  document.getElementById(LINK_ID)?.remove();
  if (!f || !f.google) {
    root.removeAttribute("data-font");
    root.style.removeProperty("--user-font");
    return;
  }
  const link = document.createElement("link");
  link.id = LINK_ID;
  link.rel = "stylesheet";
  link.href = googleFontsUrl([f])!;
  document.head.appendChild(link);
  root.style.setProperty("--user-font", f.family);
  root.setAttribute("data-font", f.id);
}

export function readFont(): string {
  try {
    const v = localStorage.getItem(FONT_KEY);
    return fontById(v) ? v! : DEFAULT_FONT;
  } catch {
    return DEFAULT_FONT;
  }
}

export function writeFont(id: string) {
  try {
    if (id === DEFAULT_FONT) localStorage.removeItem(FONT_KEY);
    else localStorage.setItem(FONT_KEY, id);
  } catch {}
  applyFont(id);
}

/** Skrip kecil di <head> supaya font pilihan sudah terpasang sebelum halaman tampil. */
export const FONT_SCRIPT = `try{var F=${JSON.stringify(
  Object.fromEntries(APP_FONTS.filter((f) => f.google).map((f) => [f.id, [f.family, googleFontsUrl([f])]])),
)};var k=localStorage.getItem("${FONT_KEY}"),f=k&&F[k];if(f){var r=document.documentElement,l=document.createElement("link");l.id="${LINK_ID}";l.rel="stylesheet";l.href=f[1];document.head.appendChild(l);r.style.setProperty("--user-font",f[0]);r.setAttribute("data-font",k)}}catch(e){}`;
