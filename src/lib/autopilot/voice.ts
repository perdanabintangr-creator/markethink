import type { BrandKit } from "@/lib/ai/prompt";

/**
 * Suara brand per pelanggan (padanan voice.md skill marqthink-ig): kata terlarang, kata kunci SEO/GEO, kalimat baku,
 * contoh caption. Modul murni.
 */

/** Pecah daftar yang dipisah koma / titik koma / baris baru. */
export function splitList(s: string | null | undefined, max = 20) {
  return (s ?? "")
    .split(/[,;\n]+/)
    .map((x) => x.replace(/^[-•*\s]+/, "").trim())
    .filter((x) => x.length >= 2)
    .slice(0, max);
}

/** Kata kunci untuk cek 125 karakter pertama: kata kunci SEO bila diisi, selain itu dari produk. */
export function brandKeywordsOf(kit: BrandKit | null | undefined) {
  const seo = splitList(kit?.seo_keywords, 8);
  if (seo.length) return seo;
  return splitList(kit?.products, 6)
    .map((w) => w.split(/\s+/).slice(0, 2).join(" "))
    .filter((w) => w.length >= 4);
}

/** Aturan suara brand untuk prompt generator (null bila kosong). */
export function voiceRules(kit: BrandKit | null | undefined) {
  if (!kit) return null;
  const out: string[] = [];
  const dont = splitList(kit.voice_dont);
  if (dont.length) out.push(`- JANGAN pernah memakai kata/frasa ini (slide maupun caption): ${dont.map((d) => `"${d}"`).join(", ")}.`);
  const seo = splitList(kit.seo_keywords, 8);
  if (seo.length) out.push(`- Kata kunci utama brand (pakai salah satu secara alami di 125 karakter pertama caption, bergantian): ${seo.join(", ")}.`);
  if (kit.brand_lines?.trim()) out.push(`- Kalimat baku brand (bila menyebut siapa brand ini, pakai persis): ${kit.brand_lines.trim().slice(0, 400)}`);
  if (kit.caption_examples?.trim()) out.push(`- Contoh caption favorit pemilik brand — tiru nada, panjang & gaya ajakannya, JANGAN disalin:\n${kit.caption_examples.trim().slice(0, 1500)}`);
  return out.length ? `SUARA BRAND (wajib diikuti):\n${out.join("\n")}` : null;
}

/** Kata terlarang yang muncul di teks (huruf kecil, kata utuh). */
export function forbiddenHits(text: string, voiceDont: string | null | undefined) {
  const low = text.toLowerCase();
  return splitList(voiceDont).filter((w) => new RegExp(`(^|[^\\p{L}\\p{N}])${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "u").test(low));
}
