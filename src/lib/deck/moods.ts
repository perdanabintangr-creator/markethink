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

export const IMAGE_STYLES = ["photo", "3d", "flat", "watercolor"] as const;
export type ImageStyle = (typeof IMAGE_STYLES)[number];
/** Arahan gaya gambar untuk generator. */
export const IMAGE_STYLE_PROMPT: Record<ImageStyle, string> = {
  photo: "Photorealistic, premium campaign photography, rich detail.",
  "3d": "Cute 3D illustration, soft clay / Pixar-like render, rounded friendly shapes, pastel colors, soft studio lighting, clean simple background.",
  flat: "Playful flat vector illustration, bold simple shapes, bright cheerful colors, clean background.",
  watercolor: "Soft watercolor illustration, gentle textures, airy hand-painted look.",
};

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
  /** stage = foto penuh jadi panggung; frame = foto di bingkai/kartu; bleed = foto tegas separuh slide. */
  treatment: "stage" | "frame" | "bleed";
  /** Gaya label kecil di atas judul. */
  kicker: "plain" | "pill" | "bar";
  /** Ornamen khas mood. */
  decor: "glow" | "confetti" | "speed" | "organic" | "arch" | "rules" | "ornament" | "blocks" | "none";
  /** Gaya gambar bawaan (bisa diganti AI lewat design.image_style). */
  imageStyle: ImageStyle;
}

const f = (family: string, file: string, bold = false): DeckFont => ({ family, file, bold });
const INTER = f("Inter", "inter-400");
const INTER_B = f("Inter", "inter-600", true);

export const DECK_MOODS: Record<MoodId, DeckMood> = {
  tech: { id: "tech", head: f("Chakra Petch", "chakra-petch-700", true), body: INTER, strong: INTER_B, upper: false, headTracking: 0, radius: 0, panel: "outline", hint: "teknologi, gaming, esports, AI, event digital anak muda, festival malam", treatment: "stage", kicker: "plain", decor: "glow", imageStyle: "photo" },
  editorial: { id: "editorial", head: f("Playfair Display", "playfair-display-700", true), body: INTER, strong: INTER_B, upper: false, headTracking: 0, radius: 0, panel: "rule", hint: "majalah, fashion, properti premium, hotel, laporan elegan", treatment: "bleed", kicker: "plain", decor: "rules", imageStyle: "photo" },
  corporate: { id: "corporate", head: f("Plus Jakarta Sans", "plus-jakarta-sans-800", true), body: f("Plus Jakarta Sans", "plus-jakarta-sans-400"), strong: f("Plus Jakarta Sans", "plus-jakarta-sans-600", true), upper: false, headTracking: 0, radius: 0.1, panel: "solid", hint: "B2B, keuangan, konsultan, pemerintahan, laporan bisnis/investor", treatment: "bleed", kicker: "bar", decor: "rules", imageStyle: "photo" },
  bold: { id: "bold", head: f("Anton", "anton-400"), body: INTER, strong: INTER_B, upper: true, headTracking: 0.5, radius: 0, panel: "solid", hint: "kampanye berani, streetwear, musik, promo besar, brand anak muda yang lantang", treatment: "stage", kicker: "bar", decor: "blocks", imageStyle: "photo" },
  warm: { id: "warm", head: f("Fraunces", "fraunces-700", true), body: f("DM Sans", "dm-sans-400"), strong: f("DM Sans", "dm-sans-600", true), upper: false, headTracking: 0, radius: 0.16, panel: "solid", hint: "F&B, kopi, restoran, kuliner, bakery, UMKM, craft — hangat & menggugah selera", treatment: "frame", kicker: "pill", decor: "organic", imageStyle: "photo" },
  beauty: { id: "beauty", head: f("Cormorant Garamond", "cormorant-garamond-600", true), body: f("Montserrat", "montserrat-400"), strong: f("Montserrat", "montserrat-600", true), upper: false, headTracking: 0, radius: 0.22, panel: "glass", hint: "skincare, kecantikan, wellness, wedding, lembut & anggun", treatment: "frame", kicker: "pill", decor: "arch", imageStyle: "photo" },
  playful: { id: "playful", head: f("Fredoka", "fredoka-600", true), body: f("Nunito", "nunito-400"), strong: f("Nunito", "nunito-700", true), upper: false, headTracking: 0, radius: 0.3, panel: "solid", hint: "LUCU/imut/gemas/ceria: anak, mainan, edukasi, Gen Z, maskot, snack & minuman manis, brand ramah", treatment: "frame", kicker: "pill", decor: "confetti", imageStyle: "3d" },
  sport: { id: "sport", head: f("Bebas Neue", "bebas-neue-400"), body: f("Barlow", "barlow-400"), strong: f("Barlow", "barlow-600", true), upper: true, headTracking: 1, radius: 0, panel: "outline", hint: "otomotif (mobil, motor, balap, bengkel), olahraga, fitness, energi & kecepatan", treatment: "stage", kicker: "bar", decor: "speed", imageStyle: "photo" },
  minimal: { id: "minimal", head: f("Manrope", "manrope-800", true), body: f("Manrope", "manrope-400"), strong: f("Manrope", "manrope-600", true), upper: false, headTracking: 0, radius: 0.12, panel: "glass", hint: "produk digital, SaaS, arsitektur, desain bersih minimalis", treatment: "frame", kicker: "plain", decor: "none", imageStyle: "photo" },
  heritage: { id: "heritage", head: f("Cinzel", "cinzel-700", true), body: f("Montserrat", "montserrat-400"), strong: f("Montserrat", "montserrat-600", true), upper: true, headTracking: 1, radius: 0, panel: "rule", hint: "budaya, pariwisata, heritage, kerajinan Nusantara, mewah klasik", treatment: "bleed", kicker: "plain", decor: "ornament", imageStyle: "photo" },
  modern: { id: "modern", head: f("Space Grotesk", "space-grotesk-700", true), body: INTER, strong: INTER_B, upper: false, headTracking: 0, radius: 0.14, panel: "outline", hint: "agency kreatif, media, komunitas, startup modern", treatment: "stage", kicker: "plain", decor: "glow", imageStyle: "photo" },
};

export const moodGuide = () => MOOD_IDS.map((id) => `${id} (${DECK_MOODS[id].head.family}: ${DECK_MOODS[id].hint})`).join("; ");
