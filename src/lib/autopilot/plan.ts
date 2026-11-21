import { z } from "zod";
import { slideSchema, LOOKS, POST_KINDS, type Look, type PostKind } from "./slides";

/**
 * Autopilot Konten — perencanaan slot & prompt generator (murni, diuji vitest).
 * Aturan menulis diadaptasi dari skill konten @marqthink.ai (SKILL.md, voice.md, hooks.md) untuk brand pelanggan mana pun.
 */

const DAY = 86_400_000;
/** Teks catatan internal dari AI: dipotong, bukan ditolak (satu field kepanjangan tidak boleh menggagalkan seminggu). */
const soft = (n: number) => z.preprocess((v) => (v === null ? undefined : typeof v === "string" ? v.trim().slice(0, n) : v), z.string().optional());
const kindOf = z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.enum(POST_KINDS));

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
  kind: kindOf,
  design: z.enum(LOOKS).optional().catch(undefined),
  product_id: z.string().max(60).optional().nullable().catch(null),
  pillar: soft(40),
  funnel: soft(40),
  title: z.string().trim().min(1).transform((t) => t.slice(0, 160)),
  hook: soft(300),
  slides: z.array(slideSchema).max(10).default([]),
  caption: z.string().min(1).max(2600),
  alt_text: soft(500),
  script: soft(4000),
  note: soft(600),
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
Teks slide: kalimat pendek, tanpa emoji, tanpa tanda pisah panjang (—), tanpa tanda kutip miring.
"title" + "accent" dibaca BERSAMBUNG sebagai satu kalimat: "accent" adalah lanjutan/penekanan, JANGAN mengulang kata yang sudah ada di "title"
(benar: title "Pilih pose", accent "yang bergerak"; salah: title "Pilih pose natural", accent "natural").

SENSE VISUAL (kamu art director — putuskan per slide, target komposisi ±80% visual di slide bervisual):
- Beri "visual" (bahasa Inggris, satu adegan konkret, tanpa teks/logo) pada slide "point"/"statement" yang isinya BISA DILIHAT:
  pose/cara/gerakan, produk dipakai, suasana/tempat, sebelum-sesudah, contoh hasil, emosi pelanggan. Slide ini tampil foto/visual layar penuh
  dengan teks ringkas di bawah → judul ≤ 6 kata, body ≤ 18 kata.
- JANGAN beri visual pada slide yang isinya abstrak/data: rangkuman (list), polling, angka/statistik, ajakan (cta), definisi. Tampil teks bersih.
- Carousel: biasanya 2–4 slide isi bervisual + cover. Visual tiap slide harus BERBEDA dan nyambung dengan isi slide itu (bukan objek generik).
- Gunakan SUBJEK VISUAL KHAS BRAND (bila ada) agar produk/layanan asli brand terlihat.

DESAIN STUDIO (kolom "design" per post, untuk carousel & single image):
- "glossy": latar terang, visual 3D glossy di bawah judul. Cocok untuk edukasi, tips, daftar alat/cara.
- "bold": latar hitam, huruf condensed raksasa, objek 3D dramatis. Cocok untuk tren, angka besar, pernyataan berani.
- "photo": foto penuh suasana nyata + judul putih besar. Cocok untuk relatable, cerita pelanggan, produk/BTS.
Variasikan dalam seminggu (jangan dua desain sama berurutan bila bisa).
Slide pertama (cover / statement single image) WAJIB punya:
- "visual": deskripsi gambar utama dalam BAHASA INGGRIS, satu subjek konkret yang langsung terkait topik
  (mis. "a glossy 3D coffee cup with steam and a small calendar icon", "a young Indonesian barista smiling while pouring latte art").
  Tanpa teks, huruf, logo, atau merek lain di gambar.
- "corners" (khusus glossy): 4 frasa sangat pendek (2-3 kata) untuk teks kecil di 4 sudut, mis. ["Kopi enak tiap hari", ...].
- Boleh "num" di cover untuk konten daftar ("7", "5") — tampil sebagai angka raksasa.
- Boleh satu kata di judul diapit bintang (*kata*) untuk tampil serif miring sebagai penekanan.
- Untuk "photo": "label" = frasa pendek pembuka (mis. "cara bangun") yang tampil sebagai stiker sorot.
Judul cover maks 7 kata + aksen maks 5 kata, supaya hurufnya bisa besar.`;

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
  /** Ringkasan performa Instagram 30 hari (lihat performance.ts). */
  performance?: string | null;
  /** Aturan suara brand dari Brand Kit (voice.ts). */
  voice?: string | null;
  /** Gaya desain tetap dari DNA (pustaka industri / referensi). */
  style?: string | null;
  /** Katalog produk (SKU) — lihat products.ts. */
  catalog?: string | null;
  /** Riset brand otomatis: ringkasan + subjek visual khas (research-shape.ts). */
  research?: string | null;
  /** Brand DNA yang sudah di-ACC (brand/dna.ts dnaBlock) — paling tinggi prioritasnya setelah Brand Kit. */
  brandDna?: string | null;
  /** Tujuan & campuran pilar (strategy.ts). */
  strategy?: string | null;
  /** Rencana dari strategist (tahap 2: penulis menulis persis sesuai ide). */
  ideas?: Idea[] | null;
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
${
    p.ideas?.length
      ? `RENCANA DARI STRATEGIST (tulis SATU post untuk SETIAP ide, tanggal/jam/format/pilar/produk PERSIS sama; kembangkan sudut & hook yang diberikan):
${p.ideas.map(ideaLine).join("\n")}`
      : `SLOT (isi tepat satu post per slot, tanggal & jam persis sama):
${slots}

CAMPURAN FORMAT: ${p.mix.carousel} carousel, ${p.mix.image} single image, ${p.mix.reel} Reel. Jangan dua format atau dua pilar sama berurutan.
${p.strategy ?? "Pilar: ±40% Edukasi, ±30% Relatable/hiburan, ±10% Insight & momen, ±20% Produk/BTS. Funnel: Awareness, Consideration, Acquisition."}`
  }
Format: carousel untuk edukasi bertahap (target simpan), single image untuk satu punchline/pertanyaan/polling (target komen), Reel untuk menjangkau non-follower.
${p.recentTitles.length ? `\nJANGAN mengulang tema yang sudah dipakai 3 minggu terakhir:\n${p.recentTitles.map((t) => `- ${t}`).join("\n")}\n` : ""}${p.market ? `\n${p.market}\n` : ""}${p.outcomes ? `\n${p.outcomes}\n` : ""}${p.performance ? `\n${p.performance}\n` : ""}${p.voice ? `\n${p.voice}\n` : ""}${p.style ? `\n${p.style}\n` : ""}${p.catalog ? `\n${p.catalog}\n` : ""}${p.research ? `\n${p.research}\n` : ""}${p.brandDna ? `\n${p.brandDna}\n` : ""}
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
{"posts":[{"date":"YYYY-MM-DD","time":"HH:MM","kind":"carousel|image|reel","design":"glossy|bold|photo","product_id":"(opsional, id dari katalog)","pillar":"Edukasi|Relatable|Insight & momen|Produk/BTS","funnel":"Awareness|Consideration|Acquisition","title":"judul internal singkat","hook":"nomor formula + alasan singkat","slides":[...],"caption":"...","alt_text":"1-2 kalimat deskripsi gambar (carousel/image)","script":"(Reel saja)","note":"catatan singkat untuk pemilik brand bila perlu"}]}`;
}

/** Prompt gambar visual utama per gaya (tanpa teks; latar disesuaikan agar menyatu dengan desain). */
export function visualPrompt(look: Look, visual: string, colors: { primary: string; accent: string }) {
  const subject = visual.replace(/\s+/g, " ").trim().slice(0, 380);
  const no = "Absolutely no text, letters, numbers, captions, logos, brand names or watermarks anywhere in the image.";
  if (look === "photo")
    return `${subject}. Editorial lifestyle photograph for an Instagram cover, natural light, authentic Indonesian setting and people where relevant, shallow depth of field, rich colour grading with subtle ${colors.primary} tones, main subject in the upper two thirds, calm darker area at the bottom. Portrait 3:4. ${no}`;
  if (look === "bold")
    return `${subject}. Premium 3D render, single hero object centered with generous empty space around it, isolated on a pure black background, dramatic rim lighting in ${colors.primary} and ${colors.accent}, glossy glass and metal materials, high detail, studio product shot. ${no}`;
  return `${subject}. Premium glossy 3D render, soft clay and glass materials with ${colors.primary} and ${colors.accent} accents, single hero subject centered with generous empty space around it, isolated on a seamless very light lavender-white background, soft studio lighting, gentle shadow, high detail, Apple-style product illustration. ${no}`;
}

/** Desain untuk satu post: pilihan pengguna, pilihan AI, atau bergiliran. */
export function pickLook(setting: string, ai: Look | undefined, index: number, kind: PostKind): Look {
  if (kind === "reel") return "classic";
  if (setting !== "auto" && (LOOKS as readonly string[]).includes(setting)) return setting as Look;
  if (ai && ai !== "classic") return ai;
  return (["glossy", "bold", "photo"] as const)[index % 3];
}

// ---------------------------------------------------------------------------
// Tahap 1: strategist (ide) — terpisah dari penulisan
// ---------------------------------------------------------------------------
export const ideaSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  kind: kindOf,
  pillar: soft(40),
  funnel: soft(40),
  product_id: z.string().max(60).optional().nullable().catch(null),
  title: z.string().trim().min(1).transform((t) => t.slice(0, 200)),
  angle: soft(400),
  hook: soft(300),
  why: soft(400),
});
export type Idea = z.infer<typeof ideaSchema>;
export const ideasWeekSchema = z.object({ ideas: z.array(ideaSchema).min(1).max(14) });

function ideaLine(i: Idea) {
  return `- ${i.date} ${i.time} | ${i.kind} | ${i.pillar ?? "-"} | ${i.funnel ?? "-"}${i.product_id ? ` | product_id=${i.product_id}` : ""} | "${i.title}"${i.angle ? ` | sudut: ${i.angle}` : ""}${i.hook ? ` | hook: ${i.hook}` : ""}`;
}

/** Prompt strategist: rencana ide seminggu (belum menulis slide/caption). */
export function buildIdeasPrompt(p: PromptInput & { replaceNote?: string | null; keep?: Idea[] }) {
  const slots = p.slots.map((s) => `- ${s.date} (${DAY_NAMES[new Date(`${s.date}T00:00:00Z`).getUTCDay()]}) ${s.time}`).join("\n");
  return `Kamu content strategist Instagram senior untuk brand "${p.brandName}" (akun ${p.handle || "-"}). Tugasmu HANYA merencanakan ide konten (belum menulis slide/caption).

DATA BRAND (satu-satunya sumber fakta):
${p.brandBlock || "- (Brand Kit belum diisi: pilih ide edukatif & relatable yang aman, tanpa produk/harga spesifik)"}
${p.focus ? `\nFOKUS DARI PEMILIK BRAND (prioritaskan): ${p.focus}\n` : ""}
SLOT (satu ide per slot, tanggal & jam persis sama):
${slots}

CAMPURAN FORMAT: ${p.mix.carousel} carousel, ${p.mix.image} single image, ${p.mix.reel} Reel. Jangan dua format atau dua pilar sama berurutan.
${p.strategy ?? ""}
Format: carousel untuk edukasi bertahap (target simpan), single image untuk punchline/pertanyaan/polling (target komen), Reel untuk jangkauan non-follower.
${p.recentTitles.length ? `\nJANGAN mengulang tema 3 minggu terakhir:\n${p.recentTitles.map((t) => `- ${t}`).join("\n")}\n` : ""}${p.keep?.length ? `\nIde lain minggu ini (jangan ditiru):\n${p.keep.map(ideaLine).join("\n")}\n` : ""}${p.market ? `\n${p.market}\n` : ""}${p.outcomes ? `\n${p.outcomes}\n` : ""}${p.performance ? `\n${p.performance}\n` : ""}${p.voice ? `\n${p.voice}\n` : ""}${p.catalog ? `\n${p.catalog}\n` : ""}${p.research ? `\n${p.research}\n` : ""}${p.brandDna ? `\n${p.brandDna}\n` : ""}${p.replaceNote ? `\nMASUKAN PEMILIK BRAND UNTUK IDE PENGGANTI: ${p.replaceNote}\n` : ""}
${HOOKS}

Untuk setiap ide tentukan: judul kerja yang spesifik (bukan generik), sudut pandang unik (kenapa orang peduli), hook (formula + kalimatnya),
dan alasan strategis singkat (pilar, funnel, data performa/momen yang mendukung). Jangan mengarang fakta, angka, atau promo.
Semua teks dalam ${p.en ? "English" : "Bahasa Indonesia"}.

Balas HANYA JSON:
{"ideas":[{"date":"YYYY-MM-DD","time":"HH:MM","kind":"carousel|image|reel","pillar":"Edukasi|Relatable|Insight & momen|Produk/BTS","funnel":"Awareness|Consideration|Acquisition","product_id":"(opsional, id dari katalog)","title":"...","angle":"...","hook":"#nomor: kalimat hook","why":"..."}]}`;
}
