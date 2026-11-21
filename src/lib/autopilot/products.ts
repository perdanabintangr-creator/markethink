import { z } from "zod";
import type { StyleDna } from "./style";

/**
 * Katalog produk (SKU) Autopilot: daftar produk pelanggan untuk konten bergiliran dan visual memakai foto asli.
 * Modul murni (diuji vitest).
 */

export const MAX_PRODUCTS = 200;
export const MAX_PRODUCT_PHOTOS = 3;

export const productInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().max(60).optional().nullable(),
  price: z.string().trim().max(60).optional().nullable(),
  description: z.string().trim().max(600).optional().nullable(),
  active: z.boolean().default(true),
  /** Lampiran foto baru (hasil upload); foto lama dipertahankan bila kosong. */
  attachmentIds: z.array(z.string().uuid()).max(MAX_PRODUCT_PHOTOS).optional(),
  /** Hapus semua foto lama sebelum menambah yang baru. */
  replacePhotos: z.boolean().optional(),
  workspaceId: z.string().uuid().nullable().optional(),
});

export interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  price: string | null;
  description: string | null;
  photo_paths: string[];
  active: boolean;
}

/**
 * Urutan prioritas produk: yang paling jarang / paling lama tidak tampil dulu (rotasi adil untuk banyak SKU).
 * `featured` = jumlah post 30 hari terakhir per produk; `lastAt` = tanggal post terakhir.
 */
export function rotateProducts<T extends { id: string }>(products: T[], featured: Map<string, { n: number; last: string }>) {
  return [...products].sort((a, b) => {
    const fa = featured.get(a.id);
    const fb = featured.get(b.id);
    if ((fa?.n ?? 0) !== (fb?.n ?? 0)) return (fa?.n ?? 0) - (fb?.n ?? 0);
    return (fa?.last ?? "").localeCompare(fb?.last ?? "");
  });
}

/** Blok katalog untuk prompt generator (maks `max` produk, sudah diurutkan rotasi). */
export function catalogBlock(products: ProductRow[], featured: Map<string, { n: number; last: string }>, max = 25) {
  const list = rotateProducts(products.filter((p) => p.active), featured).slice(0, max);
  if (!list.length) return null;
  const lines = list.map((p) => {
    const f = featured.get(p.id);
    return `- id=${p.id} | ${p.name}${p.sku ? ` (SKU ${p.sku})` : ""}${p.price ? ` | harga ${p.price}` : ""}${p.description ? ` | ${p.description.replace(/\s+/g, " ").slice(0, 200)}` : ""}${p.photo_paths.length ? " | ada foto" : ""} | tampil 30 hari: ${f?.n ?? 0}x`;
  });
  return `KATALOG PRODUK BRAND (data asli; urut dari yang paling perlu ditampilkan):
${lines.join("\n")}
ATURAN PRODUK:
- Post pilar Produk/BTS WAJIB menampilkan satu produk dari katalog: isi "product_id" persis dengan id di atas.
- Gilir produk dari urutan teratas; jangan menampilkan produk yang sama dua kali dalam seminggu bila katalog cukup.
- Nama, harga & keunggulan hanya dari katalog; jangan mengarang harga/promo. Post edukasi/relatable boleh tanpa produk.
- Untuk post dengan produk yang punya foto: "visual" cukup menggambarkan SUASANA/latar untuk produk itu (produk aslinya dipasang otomatis).`;
}

/** Prompt gambar: tempatkan produk ASLI dari foto referensi ke suasana sesuai gaya desain. */
export function productVisualPrompt(d: StyleDna, product: { name: string }, scene: string) {
  const bg =
    d.hero === "full" || d.bg === "photo"
      ? "an authentic lifestyle scene in a real Indonesian setting, natural light, the product clearly visible in the upper two thirds, calm darker area at the bottom"
      : d.bg === "dark"
        ? "isolated on a pure black background with dramatic rim lighting, generous empty space around it"
        : d.bg === "cream"
          ? "on a seamless warm cream (#F4EFE6) backdrop with soft daylight and a gentle shadow, generous empty space around it"
          : d.bg === "solid"
            ? `on a seamless plain ${d.bgColor ?? "colour"} backdrop, generous empty space around it`
            : "on a seamless very light lavender-white backdrop with soft studio light and a gentle shadow, generous empty space around it";
  return (
    `Professional product photograph of "${product.name}". Keep THE EXACT product from the reference photo unchanged — same shape, proportions, ` +
    "colours, label, logo and all text on the packaging; do not redesign, retype or translate it. Remove the original background and phone-photo look. " +
    `Scene: ${scene.replace(/\s+/g, " ").slice(0, 300)}. Place it ${bg}. ${d.imageHint ? `${d.imageHint.slice(0, 200)}. ` : ""}` +
    "Photorealistic, sharp focus on the product, high-end commercial quality. No added text, no watermark."
  );
}
