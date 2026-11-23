import { BGS, FONT_IDS, FONT_INFO, HERO_POS, ORNAMENTS, SOSMED_INFO, SOSMED_TEMPLATES, VISUAL_STYLES, type StyleDna } from "./style";

/** Prompt analisis referensi desain → DNA Gaya (modul murni). */
export function analyzePrompt(o: { count: number; feedback?: string | null; previous?: StyleDna | null; en?: boolean }) {
  const fonts = FONT_IDS.map((f) => `  - ${f}: ${FONT_INFO[f].label} — ${FONT_INFO[f].feel}${FONT_INFO[f].upper ? " (biasanya KAPITAL)" : ""}`).join("\n");
  return `Kamu art director senior. Pelajari ${o.count} gambar referensi desain Instagram yang disukai pemilik brand ini secara MENDALAM,
lalu terjemahkan gaya bersamanya ke "DNA Gaya" untuk mesin desain kami. Fokus pada pola yang konsisten di sebagian besar referensi.
Satu gambar bisa berupa KOLASE beberapa desain (mis. grid 3×3 dari satu feed): anggap tiap kotak sebagai referensi terpisah.

Yang wajib kamu bedah:
1. Latar: terang lembut / gelap / foto penuh / warna solid / krem-kertas. Nada warna latar (hex) bila solid/krem.
2. Huruf judul: geometris tebal, condensed, serif kontras, serif tipis mewah, bulat ceria, futuristik; kapital atau tidak; ada kata serif miring sebagai penekanan?
3. Tata letak: judul rata tengah atau kiri; judul di atas atau bawah; visual utama di bawah judul, di atas judul, foto penuh di belakang, atau tanpa visual.
4. Gaya visual utama: 3D glossy, clay 3D, foto lifestyle, foto produk studio, ilustrasi flat, foto editorial, objek minimal. Detail pencahayaan & properti.
5. Ornamen: bola glossy, garis orbit, teks kecil di 4 sudut, butiran film (grain), bingkai tipis, grid titik, stiker/label sorot.
6. Ukuran judul relatif (sangat besar = 1.15–1.25, normal = 1, kalem = 0.85–0.9).
7. Pola "feed UMKM Indonesia"? Ciri: logo kiri atas, judul tebal dengan kata kunci di KOTAK warna, subjek (orang/produk) di depan latar warna/suasana brand,
   kertas catatan/clipboard untuk tips, label harga/stiker promo, dan BAR KONTAK di bawah (WA, IG, website, tombol "Pesan Sekarang").
   Bila ya → layout "sosmed" dan pilih template paling mirip:
${SOSMED_TEMPLATES.map((t) => `   - ${t}: ${SOSMED_INFO[t].feel}`).join("\n")}
   Bila tidak (gaya studio/editorial/3D) → layout "studio".

Pilihan yang tersedia (WAJIB pakai salah satu nilai ini):
- bg: ${BGS.join(" | ")}
- font:
${fonts}
- hero: ${HERO_POS.join(" | ")}  (full = foto memenuhi slide)
- ornaments (maks 5): ${ORNAMENTS.join(", ")}
- visualStyle: ${VISUAL_STYLES.join(" | ")}

ATURAN:
- Jangan menyalin logo, teks, foto, atau elemen merek dari referensi. Kita meniru NUANSA & GAYA, bukan desainnya.
- Warna aksen selalu dari Brand Kit pelanggan; isi bgColor hanya bila latar solid/krem dengan nada khas.
- imageHint: arahan gaya gambar dalam bahasa Inggris (pencahayaan, material, suasana, properti), maks 40 kata, tanpa nama merek.
${o.previous ? `\nDNA sebelumnya:\n${JSON.stringify(o.previous)}\n` : ""}${o.feedback ? `\nMASUKAN PEMILIK BRAND (wajib diikuti, sesuaikan DNA): ${o.feedback}\n` : ""}
Balas HANYA JSON:
{"dna":{"name":"nama gaya singkat (maks 4 kata)","description":"1 kalimat","layout":"studio|sosmed","template":"(bila sosmed) ${SOSMED_TEMPLATES.join("|")}","bg":"...","bgColor":"#RRGGBB (opsional)","font":"...","upper":false,"serifAccent":true,"align":"center|left","titlePos":"top|bottom","hero":"...","ornaments":["..."],"visualStyle":"...","imageHint":"...","titleScale":1},
"analysis":"3-5 poin singkat Bahasa ${o.en ? "Inggris" : "Indonesia"} tentang apa yang kamu tangkap dari referensi (pisahkan dengan baris baru, awali '- ')",
"limits":"1 kalimat: bagian referensi yang belum bisa ditiru persis oleh mesin (bila ada)"}`;
}

