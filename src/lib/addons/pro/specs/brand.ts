import { z } from "zod";
import type { ToolForm } from "../fields";
import { t } from "./common";

export const brandForm: ToolForm = {
  fields: [
    { type: "text", name: "brand", label: "Nama brand *", required: true, max: 100, placeholder: "mis. Rumah Rempah", half: true },
    { type: "text", name: "aspiration", label: "Ingin dikenal sebagai apa", max: 200, placeholder: "mis. dapur rempah modern andalan keluarga muda", half: true },
    {
      type: "textarea",
      name: "business",
      label: "Apa yang dijual & ke siapa *",
      required: true,
      min: 15,
      max: 1500,
      rows: 3,
      placeholder: "mis. Bumbu masak instan premium dari rempah asli (rendang, opor, soto) Rp28-45rb, dijual di Shopee, TikTok Shop & supermarket di Jawa.",
    },
    {
      type: "textarea",
      name: "audience",
      label: "Target audiens *",
      required: true,
      min: 10,
      max: 800,
      rows: 2,
      placeholder: "mis. Ibu bekerja & pasangan muda 25-38 th di kota besar, ingin masak rumahan enak tapi tidak punya waktu ulek bumbu.",
    },
    { type: "text", name: "personality", label: "Kepribadian yang diinginkan (3-5 kata sifat)", max: 200, placeholder: "mis. hangat, otentik, cekatan, sedikit jenaka", half: true },
    { type: "text", name: "competitors", label: "Kompetitor (opsional)", max: 300, placeholder: "mis. Bamboe, Sasa bumbu, Indofood Racik", half: true },
    {
      type: "textarea",
      name: "visual_now",
      label: "Logo / warna yang sudah ada (opsional)",
      max: 600,
      rows: 2,
      hint: "Tulis warna (hex bila tahu) dan bentuk logo sekarang supaya arahan visual menyesuaikan, bukan mengganti total.",
      placeholder: "mis. Logo wordmark serif warna merah bata #B5462B, kemasan krem. Ingin lebih modern tapi tetap terasa tradisional.",
    },
  ],
  steps: [
    "Membaca bisnis, audiens & kompetitor…",
    "Merumuskan brand essence & positioning…",
    "Menyusun nilai, kepribadian & tone of voice…",
    "Menulis messaging house & tagline…",
    "Menyusun arahan visual & word bank…",
    "Membuat PPT brand book & Excel…",
  ],
};

export const brandOutput = z.object({
  essence: t(30).describe("Brand essence 2-4 kata, mis. 'Rasa rumah, tanpa repot'"),
  essence_story: t(320).describe("2-3 kalimat yang menjelaskan essence: dari mana asalnya & apa artinya untuk pelanggan"),
  purpose: t(200).describe("Purpose: kenapa brand ini ada (di luar cari untung)"),
  vision: t(200).describe("Visi 3-5 tahun, konkret"),
  mission: z.array(t(160)).describe("3-4 misi berupa kata kerja yang bisa dicek"),
  archetype: t(40).describe("Brand archetype utama, mis. 'Caregiver' (Pengasuh)"),
  archetype_note: t(200).describe("Kenapa archetype ini & bagaimana terlihat di komunikasi"),
  positioning: z.object({
    target: t(160).describe("Untuk siapa (segmen spesifik)"),
    need: t(160).describe("Kebutuhan/ketegangan yang mereka rasakan"),
    frame: t(80).describe("Kategori/kerangka acuan brand"),
    difference: t(160).describe("Pembeda utama"),
    reason: t(200).describe("Alasan untuk percaya (bukti nyata dari data user)"),
    statement: t(400).describe("Kalimat lengkap: 'Untuk … yang …, [brand] adalah … yang … karena …'"),
  }),
  promise: t(160).describe("Brand promise: janji yang selalu ditepati di setiap interaksi, 1 kalimat"),
  values: z
    .array(z.object({ name: t(30), meaning: t(200), behaviors: z.array(t(140)).describe("2-3 perilaku nyata tim/brand yang mencerminkan nilai ini") }))
    .describe("3-5 nilai brand"),
  personality: z
    .array(z.object({ trait: t(30), is: t(140).describe("Kami adalah …"), is_not: t(140).describe("… tapi bukan …") }))
    .describe("3-5 sifat kepribadian, masing-masing dengan batas 'bukan'"),
  tone: z
    .array(
      z.object({
        left: t(20).describe("Kutub kiri, mis. 'Formal'"),
        right: t(20).describe("Kutub kanan, mis. 'Santai'"),
        value: z.number().describe("Skala 1-5 (1 = sangat kiri, 5 = sangat kanan)"),
        note: t(160).describe("Penjelasan praktis posisi ini"),
      }),
    )
    .describe("Tepat 4 spektrum tone of voice: formal↔santai, serius↔jenaka, hormat↔berani/nyeleneh, informatif↔emosional (boleh disesuaikan)"),
  voice_examples: z
    .array(
      z.object({
        situation: t(60).describe("Situasi, mis. 'Balas komplain keterlambatan', 'Caption launching', 'Bio Instagram'"),
        say: t(260).describe("Contoh kalimat yang benar, siap pakai"),
        avoid: t(200).describe("Contoh kalimat yang salah / tidak sesuai brand"),
        why: t(140).describe("Kenapa contoh benar lebih tepat"),
      }),
    )
    .describe("4-6 contoh suara per situasi"),
  messaging: z.object({
    core: t(160).describe("Pesan utama (atap messaging house)"),
    pillars: z
      .array(z.object({ message: t(120), proof: z.array(t(140)).describe("2-3 proof point nyata dari data user; tandai 'perlu bukti' bila belum ada") }))
      .describe("Tepat 3 pesan pendukung"),
  }),
  taglines: z.array(z.object({ line: t(60), rationale: t(200) })).describe("3-5 opsi tagline, urut dari yang paling direkomendasikan"),
  visual: z.object({
    direction: t(300).describe("Arah visual keseluruhan dalam 2-3 kalimat (mood, kesan)"),
    palette: z
      .array(
        z.object({
          name: t(30).describe("Nama warna yang mudah diingat"),
          hex: t(7).describe("Kode hex #RRGGBB"),
          role: t(40).describe("Peran: Primer, Sekunder, Aksen, Netral gelap, Netral terang"),
          usage: t(140).describe("Dipakai untuk apa"),
          share: z.number().describe("Porsi pemakaian (%), total 100"),
        }),
      )
      .describe("4-6 warna; kontras teks cukup (WCAG AA); pertahankan warna lama user bila masih layak"),
    heading_font: z.object({ family: t(40).describe("Nama font Google Fonts persis"), why: t(160) }),
    body_font: z.object({ family: t(40).describe("Nama font Google Fonts persis"), why: t(160) }),
    photography: t(300).describe("Gaya foto: subjek, pencahayaan, komposisi, warna, contoh shot"),
    illustration: t(200).describe("Gaya ilustrasi/grafis & ikon; kosongkan bila tidak relevan"),
    logo_do: z.array(t(120)).describe("3-5 aturan pemakaian logo yang benar"),
    logo_dont: z.array(t(120)).describe("3-5 larangan pemakaian logo"),
  }),
  word_bank: z.object({
    use: z.array(t(40)).describe("8-15 kata/frasa khas yang dipakai"),
    avoid: z.array(t(40)).describe("6-12 kata/frasa yang dihindari"),
  }),
  dos: z.array(t(160)).describe("4-6 hal yang selalu dilakukan brand"),
  donts: z.array(t(160)).describe("4-6 hal yang tidak pernah dilakukan brand"),
});

export type BrandOutput = z.infer<typeof brandOutput>;

/** Hex valid #RRGGBB (huruf besar) atau null. */
export function cleanHex(v: string) {
  const m = String(v ?? "").trim().match(/^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return `#${h.toUpperCase()}`;
}

/** Warna teks yang terbaca di atas warna latar (hitam/putih). */
export function inkOn(hex: string) {
  const h = cleanHex(hex);
  if (!h) return "#111111";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.179 ? "#111111" : "#FFFFFF";
}
