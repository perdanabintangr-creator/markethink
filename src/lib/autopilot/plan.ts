import { z } from "zod";
import { slideSchema, POST_KINDS, type PostKind } from "./slides";

/**
 * Autopilot Konten — perencanaan slot & prompt generator (murni, diuji vitest).
 * Aturan menulis diadaptasi dari skill konten @marqthink.ai (SKILL.md, voice.md, hooks.md) untuk brand pelanggan mana pun.
 */

const DAY = 86_400_000;

/** "YYYY-MM-DD" + n hari. */
export function addDays(date: string, n: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

/** Tanggal hari ini di WIB. */
export function todayWib(now = new Date()) {
  return new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

export const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/**
 * Pilih slot posting dalam 7 hari mulai `start`: semua kombinasi (hari × jam) diurutkan, slot yang sudah terisi dilewati,
 * lalu diambil merata sebanyak `count`. Minggu hanya jam terakhir (seperti jadwal @marqthink.ai).
 */
export function planSlots(start: string, count: number, times: string[], taken: Set<string> = new Set()) {
  const sorted = [...new Set(times)].filter((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)).sort();
  const slotTimes = sorted.length ? sorted : ["19:00"];
  const all: { date: string; time: string }[] = [];
  for (let d = 0; d < 7; d++) {
    const date = addDays(start, d);
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    const ts = dow === 0 ? slotTimes.slice(-1) : slotTimes;
    for (const time of ts) if (!taken.has(`${date} ${time}`)) all.push({ date, time });
  }
  if (all.length <= count) return all;
  // Ambil merata (bukan menumpuk di awal minggu).
  const picked: typeof all = [];
  for (let k = 0; k < count; k++) picked.push(all[Math.floor((k * all.length) / count)]);
  return picked;
}

/** Campuran format per minggu: minimal 40% carousel, ±20% Reel (min 1 bila ≥5 post), sisanya single image. */
export function formatMix(count: number): Record<PostKind, number> {
  const reel = count >= 5 ? Math.max(1, Math.round(count * 0.2)) : 0;
  const carousel = Math.max(1, Math.ceil(count * 0.45));
  const image = Math.max(0, count - reel - carousel);
  return { carousel, image, reel };
}

export const generatedPostSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  kind: z.enum(POST_KINDS),
  pillar: z.string().max(40).optional(),
  funnel: z.string().max(40).optional(),
  title: z.string().min(1).max(160),
  hook: z.string().max(300).optional(),
  slides: z.array(slideSchema).max(10).default([]),
  caption: z.string().min(1).max(2600),
  alt_text: z.string().max(500).optional(),
  script: z.string().max(4000).optional(),
  note: z.string().max(600).optional(),
});
export const generatedWeekSchema = z.object({ posts: z.array(generatedPostSchema).min(1).max(14) });
export type GeneratedPost = z.infer<typeof generatedPostSchema>;

export const HOOKS = `20 formula hook (pilih yang cocok; satu hook = satu klaim konkret, maks 2 detik dibaca):
1 Biaya salah: {Hal konkret} hilang gara-gara {satu kesalahan}.
2 Perintah balik: Stop {kebiasaan umum}. Coba {alternatif}.
3 Nggak ada yang bilang: Nggak ada yang bilang kalau {kebenaran nggak enak}.
5 Waktu dipangkas: Dulu {kerjaan} makan {lama}. Sekarang {singkat}.
7 Salah cara: Kamu {melakukan hal} dengan cara yang salah, dan itu bukan salah kamu.
9 Curi ini: Curi {template/cara} ini.
10 Kalau kamu: Kalau kamu {situasi spesifik}, {durasi} ini buat kamu.
11 Daftar + favorit: {N} {hal} yang {hasil}. Nomor {k} paling jarang dipakai.
12 Keberatan: "{Keberatan yang beneran diucapkan pelanggan}." Oke. Ini jawabannya.
13 Sebelum-sesudah: {Versi lama}. {Versi baru}. {Satu kalimat pengungkit}.
14 Panggilan: {Grup spesifik}, ini yang sering kalian lewatkan.
16 Pertanyaan asli: "{Pertanyaan yang sering ditanya pelanggan}"
17 Adu langsung: {A} vs {B}. Bedanya jauh.
18 Langsung demo: {Mulai di tengah aksi}. Lihat hasilnya.
19 Tenggat: {Momen} tinggal {waktu}. Siapkan {aksi} dari sekarang.
20 Izin: Kamu nggak perlu {hal yang katanya wajib}.
22 Pepatah dibalik: {Pepatah populer, dibalik}.
24 Reveal: Ini {produk/menu/fitur} yang baru. (hanya bila memang ada di data brand)
26 Superlatif jujur: Cara {paling cepat/simpel} buat {hasil} adalah {jawaban}.
Dilarang tanpa data asli dari brand: testimoni, angka penjualan/pengguna, hasil pelanggan, kisah orang dalam.`;

export const SLIDE_SPEC = `Format slide (JSON) — tiap slide punya "type":
- "cover": {"type":"cover","title":"hook <= 8 kata (boleh \\n)","accent":"baris janji, tampil gradasi warna brand","sub":"1 kalimat penjelas"}
- "point": {"type":"point","label":"LANGKAH #1","num":"01","title":"3-7 kata","accent":"kata kunci gradasi (opsional)","body":"<= 25 kata"}
- "poll": {"type":"poll","title":"Pembuka,","accent":"pertanyaan?","options":["opsi A","opsi B"],"tag":"Jawab di komentar","cta":"Tulis A atau B"}
- "list": {"type":"list","label":"RANGKUMAN","title":"judul ringkasan","items":["poin 1","poin 2","poin 3","poin 4"]}
- "statement": {"type":"statement","title":"satu pernyataan kuat","accent":"bagian yang ditekankan","sub":"opsional"}
- "cta": {"type":"cta","title":"Simpan dulu,","accent":"pakai besok.","sub":"1 kalimat","button":"teks tombol pendek"}
Carousel 5-8 slide: 1 cover (hook + janji) → 1 takaran (kenapa penting, type point/statement) → poin-poin (satu ide per slide)
→ 1 rangkuman (type list, slide yang di-screenshot orang) → 1 cta (satu ajakan saja).
Single image: tepat 1 slide (statement, poll, atau cover). Reel: "slides": [] dan naskah di "script".
Teks slide: kalimat pendek, tanpa emoji, tanpa tanda pisah panjang (—), tanpa tanda kutip miring.`;

export interface PromptInput {
  brandBlock: string;
  brandName: string;
  handle: string;
  brandTag: string;
  slots: { date: string; time: string }[];
  mix: Record<PostKind, number>;
  recentTitles: string[];
  market: string | null;
  outcomes: string | null;
  focus: string | null;
  en: boolean;
}

export function buildGeneratePrompt(p: PromptInput) {
  const slots = p.slots.map((s) => `- ${s.date} (${DAY_NAMES[new Date(`${s.date}T00:00:00Z`).getUTCDay()]}) ${s.time}`).join("\n");
  const lang = p.en ? "English" : "Bahasa Indonesia santai dan to the point (kamu, nggak, udah, biar, bikin), seperti teman yang paham bisnisnya, bukan brosur";
  return `Kamu adalah tim konten Instagram untuk brand "${p.brandName}" (akun ${p.handle || "-"}). Siapkan konten untuk slot berikut sebagai DRAF yang akan di-ACC pemilik brand.

DATA BRAND (satu-satunya sumber fakta tentang brand ini):
${p.brandBlock || "- (Brand Kit belum diisi: tulis konten edukatif & relatable yang aman, jangan menyebut produk/harga spesifik)"}
${p.focus ? `\nFOKUS DARI PEMILIK BRAND MINGGU INI (prioritaskan): ${p.focus}\n` : ""}
SLOT (isi tepat satu post per slot, tanggal & jam persis sama):
${slots}

CAMPURAN FORMAT: ${p.mix.carousel} carousel, ${p.mix.image} single image, ${p.mix.reel} Reel. Jangan dua format atau dua pilar sama berurutan.
Pilar: ±40% Edukasi, ±30% Relatable/hiburan, ±10% Insight & momen, ±20% Produk/BTS. Funnel: Awareness, Consideration, Acquisition.
Format: carousel untuk edukasi bertahap (target simpan), single image untuk satu punchline/pertanyaan/polling (target komen), Reel untuk menjangkau non-follower.
${p.recentTitles.length ? `\nJANGAN mengulang tema yang sudah dipakai 3 minggu terakhir:\n${p.recentTitles.map((t) => `- ${t}`).join("\n")}\n` : ""}${p.market ? `\n${p.market}\n` : ""}${p.outcomes ? `\n${p.outcomes}\n` : ""}
${HOOKS}

${SLIDE_SPEC}

NASKAH REEL (kolom "script", 15-30 detik): tulis 3 hook dari formula berbeda lalu pilih satu (sebut alasannya);
0-2 dtk HOOK (ucapan + teks layar <= 6 kata), 2-7 dtk TAKARAN, BADAN satu ide per beat (<= 4 dtk per beat, ganti frame),
3 dtk terakhir PAYOFF + satu ajakan, baris terakhir menggemakan kata dari hook. Sertakan saran visual per beat dan saran musik.

CAPTION:
- Kalimat pertama = hook dan memuat kata kunci bisnis brand; 125 karakter pertama bikin orang tap "selengkapnya". Tanpa sapaan pembuka.
- 2-5 paragraf pendek, satu ajakan (komen / simpan / DM / follow), 3-5 hashtag spesifik di baris terakhir termasuk ${p.brandTag || "hashtag merek"}.
- Tanpa link (taruh di bio). Panjang 300-700 karakter. Emoji secukupnya (maks 3).
- Hindari frasa klise: "di era digital", "game changer", "solusi terbaik", "rahasia sukses", "tidak dapat dipungkiri", "simak sampai habis", "dijamin", "100%".
- Tanpa tanda pisah panjang (—). Pakai "kamu", bukan "Anda".

ATURAN MUTLAK:
- Jangan mengarang fakta: tidak ada angka, harga, promo, testimoni, nama klien, atau klaim hasil yang tidak ada di DATA BRAND/FOKUS.
  Butuh angka yang tidak diketahui? Pakai sudut lain.
- Tidak ada janji berlebihan ("dijamin laris", "auto viral"). Tidak menjelekkan kompetitor dengan nama.
- Semua teks dalam ${lang}.

Balas HANYA JSON tanpa teks lain:
{"posts":[{"date":"YYYY-MM-DD","time":"HH:MM","kind":"carousel|image|reel","pillar":"Edukasi|Relatable|Insight & momen|Produk/BTS","funnel":"Awareness|Consideration|Acquisition","title":"judul internal singkat","hook":"nomor formula + alasan singkat","slides":[...],"caption":"...","alt_text":"1-2 kalimat deskripsi gambar (carousel/image)","script":"(Reel saja)","note":"catatan singkat untuk pemilik brand bila perlu"}]}`;
}
