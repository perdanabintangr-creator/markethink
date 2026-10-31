/**
 * Nama brand di satu tempat. Rebranding berikutnya: `node scripts/rename-brand.mjs <NamaLama> <NamaBaru>`,
 * lalu ikuti daftar langkah manual di BRANDING.md (domain, Supabase, Google, Canva, payment gateway).
 */
export const BRAND = "Marqthink";
/** Wordmark logo (huruf besar). */
export const BRAND_WORDMARK = "MARQTHINK";
/** Huruf kecil untuk nama file unduhan, UID kalender, dsb. */
export const BRAND_SLUG = "marqthink";
/** Wordmark dua warna: bagian pertama warna teks, bagian kedua gradasi biru (seperti logo). */
export const BRAND_WORDMARK_PARTS = ["MARQ", "THINK"] as const;
/** Ikon logo (huruf Q) di /public. */
export const BRAND_ICON = "/brand/marqthink-q-192.png";
/** Tagline resmi. */
export const BRAND_TAGLINES = ["Think like a brand.", "Otak marketing untuk brand kamu.", "Tanya dulu, baru jualan."] as const;
