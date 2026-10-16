/** Tema PPT — dipakai pembuat file (.pptx) dan pratinjau slide di browser. Warna hex tanpa "#". */

export interface DeckTheme {
  dark: boolean;
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  onAccent: string;
}

export const DECK_THEMES: Record<string, DeckTheme> = {
  midnight: { dark: true, bg: "0B1020", surface: "151B2E", surface2: "1F2742", text: "F5F7FB", muted: "9AA4BF", accent: "2F7BFF", accent2: "22D3EE", onAccent: "FFFFFF" },
  clean: { dark: false, bg: "FFFFFF", surface: "F3F5FA", surface2: "E6EAF3", text: "0F172A", muted: "64748B", accent: "1E5BFF", accent2: "06B6D4", onAccent: "FFFFFF" },
  sunset: { dark: false, bg: "FFF9F3", surface: "FFEEDD", surface2: "FFE0C2", text: "3B1708", muted: "8A4B2A", accent: "EA580C", accent2: "DB2777", onAccent: "FFFFFF" },
  forest: { dark: false, bg: "F6FAF5", surface: "E6F0E3", surface2: "D3E5CE", text: "13261A", muted: "4F6B57", accent: "15803D", accent2: "CA8A04", onAccent: "FFFFFF" },
  ocean: { dark: true, bg: "06202E", surface: "0C3346", surface2: "114560", text: "EAF6FB", muted: "8FB8C9", accent: "06B6D4", accent2: "F59E0B", onAccent: "042029" },
  luxe: { dark: true, bg: "101010", surface: "1B1B1B", surface2: "272727", text: "F5F1E8", muted: "A8A29E", accent: "C9A227", accent2: "E7D9B0", onAccent: "141414" },
  coral: { dark: false, bg: "FFFFFF", surface: "FFF1F2", surface2: "FFE0E4", text: "1F1235", muted: "6B5B7B", accent: "F43F5E", accent2: "8B5CF6", onAccent: "FFFFFF" },
  corporate: { dark: false, bg: "FFFFFF", surface: "EEF2F7", surface2: "DDE5EF", text: "0B1F3A", muted: "5B6B82", accent: "0B5FFF", accent2: "00B894", onAccent: "FFFFFF" },
};

export function resolveDeckTheme(input: { theme?: string; brand_color?: string }): DeckTheme {
  const base = DECK_THEMES[input.theme ?? ""] ?? DECK_THEMES.midnight;
  if (!input.brand_color) return base;
  const accent = input.brand_color.replace("#", "").toUpperCase();
  return { ...base, accent, onAccent: luminance(accent) > 0.55 ? "111111" : "FFFFFF" };
}

function luminance(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
