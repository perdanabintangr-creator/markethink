/**
 * "Mood" desain deck Promax (AI Art Director): pasangan font + bahasa bentuk yang dipilih AI sesuai tema/judul.
 * Dipakai server (ukur teks, PDF, PPT) dan browser (pratinjau). Font ada di public/fonts/deck (SIL OFL).
 */

export const MOOD_IDS = ["tech", "editorial", "corporate", "bold", "warm", "beauty", "playful", "sport", "minimal", "heritage", "modern"] as const;
export type MoodId = (typeof MOOD_IDS)[number];

export interface DeckFont {
  /** Nama keluarga font (dipakai di PPT & CSS). */
  family: string;
  /** Nama file di public/fonts/deck tanpa ".woff". */
  file: string;
  /** Font tebal (bold) — untuk PPT. */
  bold: boolean;
}

export interface DeckMood {
  id: MoodId;
  head: DeckFont;
  body: DeckFont;
  /** Teks tebal (judul kotak, label). */
  strong: DeckFont;
  /** Judul huruf kapital semua. */
  upper: boolean;
  /** Spasi huruf judul (pt). */
  headTracking: number;
  /** Sudut kotak (inci). */
  radius: number;
  /** outline = garis tipis transparan; solid = blok warna; glass = kaca lembut; rule = garis editorial. */
  panel: "outline" | "solid" | "glass" | "rule";
  /** Kapan dipakai (untuk AI). */
  hint: string;
}

const f = (family: string, file: string, bold = false): DeckFont => ({ family, file, bold });
const INTER = f("Inter", "inter-400");
const INTER_B = f("Inter", "inter-600", true);

export const DECK_MOODS: Record<MoodId, DeckMood> = {
  tech: { id: "tech", head: f("Chakra Petch", "chakra-petch-700", true), body: INTER, strong: INTER_B, upper: false, headTracking: 0, radius: 0, panel: "outline", hint: "teknologi, gaming, esports, AI, event digital anak muda, festival malam" },
  editorial: { id: "editorial", head: f("Playfair Display", "playfair-display-700", true), body: INTER, strong: INTER_B, upper: false, headTracking: 0, radius: 0, panel: "rule", hint: "majalah, fashion, properti premium, hotel, laporan elegan" },
  corporate: { id: "corporate", head: f("Plus Jakarta Sans", "plus-jakarta-sans-800", true), body: f("Plus Jakarta Sans", "plus-jakarta-sans-400"), strong: f("Plus Jakarta Sans", "plus-jakarta-sans-600", true), upper: false, headTracking: 0, radius: 0.1, panel: "solid", hint: "B2B, keuangan, konsultan, pemerintahan, laporan bisnis/investor" },
  bold: { id: "bold", head: f("Anton", "anton-400"), body: INTER, strong: INTER_B, upper: true, headTracking: 0.5, radius: 0, panel: "solid", hint: "kampanye berani, streetwear, musik, promo besar, brand anak muda yang lantang" },
  warm: { id: "warm", head: f("Fraunces", "fraunces-700", true), body: f("DM Sans", "dm-sans-400"), strong: f("DM Sans", "dm-sans-600", true), upper: false, headTracking: 0, radius: 0.16, panel: "solid", hint: "F&B, kopi, kuliner, UMKM, craft, hangat & bersahabat" },
  beauty: { id: "beauty", head: f("Cormorant Garamond", "cormorant-garamond-600", true), body: f("Montserrat", "montserrat-400"), strong: f("Montserrat", "montserrat-600", true), upper: false, headTracking: 0, radius: 0.22, panel: "glass", hint: "skincare, kecantikan, wellness, wedding, lembut & anggun" },
  playful: { id: "playful", head: f("Fredoka", "fredoka-600", true), body: f("Nunito", "nunito-400"), strong: f("Nunito", "nunito-700", true), upper: false, headTracking: 0, radius: 0.3, panel: "solid", hint: "anak, edukasi, Gen Z, brand ceria & ramah" },
  sport: { id: "sport", head: f("Bebas Neue", "bebas-neue-400"), body: f("Barlow", "barlow-400"), strong: f("Barlow", "barlow-600", true), upper: true, headTracking: 1, radius: 0, panel: "outline", hint: "olahraga, fitness, otomotif, energi & performa" },
  minimal: { id: "minimal", head: f("Manrope", "manrope-800", true), body: f("Manrope", "manrope-400"), strong: f("Manrope", "manrope-600", true), upper: false, headTracking: 0, radius: 0.12, panel: "glass", hint: "produk digital, SaaS, arsitektur, desain bersih minimalis" },
  heritage: { id: "heritage", head: f("Cinzel", "cinzel-700", true), body: f("Montserrat", "montserrat-400"), strong: f("Montserrat", "montserrat-600", true), upper: true, headTracking: 1, radius: 0, panel: "rule", hint: "budaya, pariwisata, heritage, kerajinan Nusantara, mewah klasik" },
  modern: { id: "modern", head: f("Space Grotesk", "space-grotesk-700", true), body: INTER, strong: INTER_B, upper: false, headTracking: 0, radius: 0.14, panel: "outline", hint: "agency kreatif, media, komunitas, startup modern" },
};

export const moodGuide = () => MOOD_IDS.map((id) => `${id} (${DECK_MOODS[id].head.family}: ${DECK_MOODS[id].hint})`).join("; ");
