import type { StyleDna } from "./style";

/**
 * Pustaka gaya per industri (Tahap 2): 10 industri × 3 gaya kurasi. Warna aksen selalu dari Brand Kit pelanggan;
 * DNA hanya mengatur latar, font, tata letak, ornamen, dan gaya visual AI. Modul murni.
 */

export const INDUSTRIES = [
  { id: "fnb", id_label: "Kuliner & Kafe", en_label: "Food & Beverage" },
  { id: "fashion", id_label: "Fashion", en_label: "Fashion" },
  { id: "beauty", id_label: "Kecantikan & Skincare", en_label: "Beauty & Skincare" },
  { id: "property", id_label: "Properti", en_label: "Property" },
  { id: "education", id_label: "Edukasi & Kursus", en_label: "Education" },
  { id: "tech", id_label: "Teknologi & Digital", en_label: "Tech & Digital" },
  { id: "health", id_label: "Kesehatan & Fitness", en_label: "Health & Fitness" },
  { id: "automotive", id_label: "Otomotif", en_label: "Automotive" },
  { id: "services", id_label: "Jasa, Agensi & Konsultan", en_label: "Services & Agencies" },
  { id: "retail", id_label: "Retail & UMKM", en_label: "Retail & SMEs" },
] as const;
export type IndustryId = (typeof INDUSTRIES)[number]["id"];

export interface StylePreset {
  id: string;
  industry: IndustryId;
  dna: StyleDna;
}

const P = (industry: IndustryId, key: string, dna: Partial<StyleDna> & Pick<StyleDna, "name" | "bg" | "font">): StylePreset => ({
  id: `${industry}-${key}`,
  industry,
  dna: {
    description: "",
    upper: false,
    serifAccent: true,
    align: "center",
    titlePos: "top",
    hero: "below",
    ornaments: [],
    visualStyle: "3d-glossy",
    titleScale: 1,
    ...dna,
  },
});

export const STYLE_PRESETS: StylePreset[] = [
  // Kuliner & Kafe
  P("fnb", "warm", { name: "Kafe hangat", description: "Kertas krem, serif hangat, foto produk pagi hari", bg: "cream", font: "fraunces", align: "left", ornaments: ["grain"], visualStyle: "product-studio", imageHint: "warm morning light, wooden table, cafe props, appetizing" }),
  P("fnb", "bold", { name: "Promo menu bold", description: "Gelap dramatis, huruf condensed besar, menu menggoda", bg: "dark", font: "anton", upper: true, titlePos: "bottom", hero: "above", visualStyle: "product-studio", imageHint: "dramatic food photography, steam, rim light, glossy sauce" }),
  P("fnb", "photo", { name: "Suasana kedai", description: "Foto suasana nyata + judul putih + stiker", bg: "photo", font: "jakarta", align: "left", titlePos: "bottom", hero: "full", ornaments: ["sticker"], visualStyle: "photo-lifestyle", imageHint: "cozy Indonesian cafe, friends, golden hour" }),
  // Fashion
  P("fashion", "editorial", { name: "Editorial majalah", description: "Foto model penuh, serif kontras, bingkai tipis", bg: "photo", font: "playfair", align: "left", titlePos: "bottom", hero: "full", ornaments: ["frame"], visualStyle: "editorial-photo", imageHint: "fashion editorial, Indonesian model, studio backdrop" }),
  P("fashion", "street", { name: "Streetwear", description: "Hitam, Bebas Neue tegak, grid titik", bg: "dark", font: "bebas", upper: true, titlePos: "bottom", hero: "above", ornaments: ["grid"], visualStyle: "editorial-photo", imageHint: "streetwear outfit, hard flash, urban" }),
  P("fashion", "boutique", { name: "Butik minimal", description: "Krem lembut, serif tipis mewah, produk minimal", bg: "cream", font: "cormorant", ornaments: ["frame"], visualStyle: "minimal-object", imageHint: "neatly folded garment or accessory, soft shadow" }),
  // Kecantikan
  P("beauty", "glow", { name: "Glow lembut", description: "Terang lembut, serif tipis, produk berkilau", bg: "light", font: "cormorant", ornaments: ["orbs"], visualStyle: "product-studio", imageHint: "skincare bottle, water ripples, soft pink light, dewy" }),
  P("beauty", "clinic", { name: "Klinik bersih", description: "Krem bersih, sans rapi, kesan profesional", bg: "cream", bgColor: "#F5EEEA", font: "manrope", align: "left", ornaments: ["grid"], visualStyle: "product-studio", imageHint: "clinical skincare product, clean marble surface" }),
  P("beauty", "model", { name: "Foto model", description: "Foto wajah glowing penuh, serif elegan", bg: "photo", font: "playfair", align: "left", titlePos: "bottom", hero: "full", ornaments: ["sticker"], visualStyle: "editorial-photo", imageHint: "glowing skin close-up portrait of an Indonesian woman, soft light" }),
  // Properti
  P("property", "premium", { name: "Premium mewah", description: "Gelap, kapital klasik, bingkai, rumah senja", bg: "dark", font: "cinzel", upper: true, titlePos: "bottom", hero: "above", ornaments: ["frame"], visualStyle: "photo-lifestyle", imageHint: "modern house exterior at dusk, warm interior lights, architectural" }),
  P("property", "photo", { name: "Foto hunian", description: "Foto rumah/interior penuh + stiker info", bg: "photo", font: "manrope", align: "left", titlePos: "bottom", hero: "full", ornaments: ["sticker"], visualStyle: "photo-lifestyle", imageHint: "bright modern living room interior, natural light" }),
  P("property", "corporate", { name: "Rapi korporat", description: "Krem, sans rapi, model rumah 3D", bg: "cream", font: "manrope", align: "left", ornaments: ["grid"], visualStyle: "clay-3d", imageHint: "miniature 3D house model" }),
  // Edukasi
  P("education", "glossy", { name: "Glossy 3D", description: "Terang lavender, ikon 3D glossy, teks sudut", bg: "light", font: "jakarta", ornaments: ["orbs", "orbit", "corners"], visualStyle: "3d-glossy" }),
  P("education", "playful", { name: "Ceria", description: "Terang, huruf bulat, objek clay lucu", bg: "light", font: "fredoka", ornaments: ["orbs"], visualStyle: "clay-3d" }),
  P("education", "board", { name: "Papan kelas", description: "Hijau papan tulis, grotesk teknis, ilustrasi flat", bg: "solid", bgColor: "#1F3A33", font: "space", align: "left", ornaments: ["grid"], visualStyle: "flat-illustration" }),
  // Teknologi
  P("tech", "glossy", { name: "Glossy 3D", description: "Gaya referensi Marqthink: terang, 3D, orbit", bg: "light", font: "jakarta", ornaments: ["orbs", "orbit", "corners"], visualStyle: "3d-glossy" }),
  P("tech", "bold", { name: "Bold gelap", description: "Hitam, condensed raksasa, objek 3D dramatis", bg: "dark", font: "anton", upper: true, titlePos: "bottom", hero: "above", visualStyle: "3d-glossy" }),
  P("tech", "grid", { name: "Grid futuristik", description: "Gelap, grotesk teknis, grid titik", bg: "dark", font: "space", align: "left", titlePos: "bottom", hero: "above", ornaments: ["grid"], visualStyle: "3d-glossy", imageHint: "futuristic glass interface object, neon glow" }),
  // Kesehatan
  P("health", "fresh", { name: "Segar & bersih", description: "Terang, sans rapi, objek clay segar", bg: "light", font: "manrope", ornaments: ["orbs"], visualStyle: "clay-3d", imageHint: "fresh fruit, water bottle, healthy objects" }),
  P("health", "active", { name: "Foto aktif", description: "Foto olahraga penuh + stiker", bg: "photo", font: "jakarta", align: "left", titlePos: "bottom", hero: "full", ornaments: ["sticker"], visualStyle: "photo-lifestyle", imageHint: "Indonesian person exercising outdoors, energetic" }),
  P("health", "calm", { name: "Tenang", description: "Krem, serif hangat, objek minimal", bg: "cream", font: "fraunces", align: "left", ornaments: ["grain"], visualStyle: "minimal-object", imageHint: "calm wellness still life, plant, soft shadow" }),
  // Otomotif
  P("automotive", "garage", { name: "Garasi gelap", description: "Gelap, huruf futuristik, mobil dramatis", bg: "dark", font: "chakra", upper: true, titlePos: "bottom", hero: "above", visualStyle: "product-studio", imageHint: "car or motorcycle, dramatic rim light, wet floor reflections" }),
  P("automotive", "street", { name: "Foto jalanan", description: "Foto kendaraan penuh, condensed besar", bg: "photo", font: "anton", upper: true, align: "left", titlePos: "bottom", hero: "full", visualStyle: "photo-lifestyle", imageHint: "vehicle on Indonesian city street at night, motion" }),
  P("automotive", "showroom", { name: "Showroom bersih", description: "Terang, grotesk teknis, orbit tipis", bg: "light", font: "space", ornaments: ["orbit"], visualStyle: "product-studio", imageHint: "clean studio product shot of a vehicle part or car" }),
  // Jasa & Agensi
  P("services", "corporate", { name: "Korporat modern", description: "Terang, sans rapi, orbit & grid halus", bg: "light", font: "manrope", align: "left", ornaments: ["orbit", "grid"], visualStyle: "3d-glossy" }),
  P("services", "bold", { name: "Pernyataan berani", description: "Hitam, condensed raksasa", bg: "dark", font: "anton", upper: true, titlePos: "bottom", hero: "above", visualStyle: "3d-glossy" }),
  P("services", "editorial", { name: "Editorial", description: "Krem, serif kontras, bingkai tipis", bg: "cream", font: "playfair", align: "left", ornaments: ["frame"], visualStyle: "minimal-object" }),
  // Retail & UMKM
  P("retail", "promo", { name: "Promo ceria", description: "Latar warna brand, huruf bulat, stiker promo", bg: "solid", font: "fredoka", ornaments: ["sticker"], visualStyle: "product-studio", imageHint: "product on a colourful podium, playful" }),
  P("retail", "product", { name: "Produk studio", description: "Krem bersih, sans tebal, produk di tengah", bg: "cream", font: "jakarta", visualStyle: "product-studio" }),
  P("retail", "store", { name: "Foto toko", description: "Foto toko/produk nyata + stiker", bg: "photo", font: "jakarta", align: "left", titlePos: "bottom", hero: "full", ornaments: ["sticker"], visualStyle: "photo-lifestyle", imageHint: "small Indonesian shop, products on shelves, friendly owner" }),
];

export const presetById = (id: string | null | undefined) => STYLE_PRESETS.find((p) => p.id === id) ?? null;
export const presetsFor = (industry: string | null | undefined) => STYLE_PRESETS.filter((p) => p.industry === industry);
