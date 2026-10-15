import "server-only";
import { clip, fileSlug } from "../../runtime";
import { makeRunner, type ProDef } from "../kit";
import { brandForm, brandOutput, cleanHex } from "../specs/brand";
import { normalize100 } from "../specs/plan";

const VALUE_ICONS = ["heart", "shield", "sparkles", "handshake", "leaf", "star"];
const dots = (v: number) => "●".repeat(v) + "○".repeat(Math.max(0, 5 - v));

export const brandDef: ProDef<typeof brandOutput> = {
  tool: "brand",
  addon: "strategi_pro",
  form: brandForm,
  output: brandOutput,
  maxOutputTokens: 15000,
  role: `Kamu Brand Strategist senior dari agency branding di Jakarta yang sudah menyusun brand book untuk puluhan brand lokal (F&B, beauty,
fashion, jasa, edukasi). Brand guideline buatanmu dipakai sehari-hari oleh admin sosmed, desainer freelance, dan CS — jadi tiap aturan
harus bisa langsung dipraktikkan, bukan kata-kata indah di dinding kantor.`,
  rules: (input) => `- Bangun dari brand pyramid: atribut → manfaat fungsional → manfaat emosional → kepribadian → essence. Semua bagian harus konsisten satu sama lain.
- essence 2-4 kata, mudah diingat, bukan tagline iklan dan bukan kata generik ("kualitas terbaik", "inovatif", "terpercaya").
- purpose menjawab "kenapa ada"; vision = gambaran 3-5 tahun yang bisa dibayangkan; mission = 3-4 kata kerja yang bisa dicek pelaksanaannya.
- positioning: pilih segmen spesifik dari audiens user, frame kategori yang jelas, pembeda yang bisa dibuktikan (dari data user), dan alasan
  percaya yang nyata. Bila bukti belum ada, tulis apa yang harus dibuktikan. statement memakai format
  "Untuk [target] yang [kebutuhan], ${input.brand} adalah [kategori] yang [pembeda] karena [alasan]".
- promise: janji yang benar-benar bisa ditepati operasional (pengiriman, rasa, layanan), bukan slogan.
- values 3-5: tiap nilai punya arti spesifik untuk brand ini + 2-3 perilaku nyata (mis. "balas chat maks 10 menit di jam kerja").
- personality: ${input.personality ? `turunkan dari kata sifat user (${input.personality}), ` : ""}3-5 sifat, masing-masing dengan batas "bukan"
  agar tidak kebablasan (mis. "Jenaka — bukan receh atau menyindir pelanggan").
- tone: tepat 4 spektrum dengan skala 1-5 dan catatan praktis. Contoh suara per situasi wajib mencakup: caption promosi, balas komplain,
  balas pertanyaan harga, dan satu situasi khas bisnis user. Kalimat "say" siap pakai dalam bahasa sehari-hari target; "avoid" contoh
  yang sering terjadi tapi salah (terlalu kaku, lebay, atau menyalahkan pelanggan).
- messaging: 1 pesan utama + tepat 3 pesan pendukung, tiap pesan dengan 2-3 proof point. Jangan mengarang sertifikasi/penghargaan/angka;
  bila belum ada bukti tulis "perlu bukti: …".
- taglines 3-5 opsi, maks ±6 kata, bahasa yang dipakai target (Indonesia/campuran wajar), tidak meniru tagline brand terkenal; beri alasan.
- visual: ${input.visual_now ? `pertahankan aset yang sudah ada (${input.visual_now}) bila masih layak — evolusi, bukan revolusi; ` : ""}palet 4-6 warna
  hex #RRGGBB dengan peran (Primer, Sekunder, Aksen, Netral gelap, Netral terang) dan porsi pakai (pola 60-30-10). Kombinasi teks-latar
  harus lolos kontras WCAG AA. Font HARUS tersedia di Google Fonts (nama persis, mis. "Plus Jakarta Sans", "Fraunces", "DM Sans",
  "Playfair Display", "Poppins", "Inter"), satu untuk judul & satu untuk isi, dengan alasan. Gaya foto spesifik (subjek, cahaya, sudut,
  props khas Indonesia bila cocok). Aturan logo praktis (ruang kosong minimal, ukuran minimal, latar yang boleh, larangan distorsi/efek).
${input.competitors ? `- Bedakan jelas dari kompetitor (${input.competitors}) — di positioning, tone, dan warna.\n` : ""}- word_bank: kata khas yang dipakai vs dihindari (termasuk klise iklan dan kata yang bertentangan dengan kepribadian).
- dos/donts: perilaku komunikasi konkret, bukan pengulangan nilai.`,
  post(out) {
    out.visual.palette = out.visual.palette
      .map((p) => ({ ...p, hex: cleanHex(p.hex) ?? "" }))
      .filter((p) => p.hex);
    const shares = normalize100(out.visual.palette.map((p) => Number(p.share) || 0));
    out.visual.palette = out.visual.palette.map((p, i) => ({ ...p, share: shares[i] }));
    out.tone = out.tone.map((x) => ({ ...x, value: Math.min(5, Math.max(1, Math.round(Number(x.value) || 3))) }));
    const font = (f: string) => f.replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim() || "Inter";
    out.visual.heading_font.family = font(out.visual.heading_font.family);
    out.visual.body_font.family = font(out.visual.body_font.family);
  },
  title: (out, input) => `Brand guideline ${input.brand} — ${out.essence}`,
  files(out, input) {
    const brand = String(input.brand);
    const primary = out.visual.palette.find((p) => /primer|primary|utama/i.test(p.role)) ?? out.visual.palette[0];
    const v = out.visual;
    return {
      name: `brand-guideline-${fileSlug(brand)}`,
      deckLabel: "PPT brand book",
      sheetLabel: "Excel brand sheet",
      deck: {
        title: clip(`${brand} Brand Book`, 90),
        subtitle: clip(out.essence, 160),
        theme: "clean",
        cover_style: "split",
        ...(primary ? { brand_color: primary.hex } : {}),
        slides: [
          { layout: "quote", kicker: "BRAND ESSENCE", title: clip(out.essence, 90), quote: clip(out.essence_story, 240) },
          {
            layout: "cards",
            kicker: "FONDASI",
            title: "Purpose, visi & misi",
            cards: [
              { icon: "compass", title: "Purpose", text: clip(out.purpose, 160) },
              { icon: "eye", title: "Visi", text: clip(out.vision, 160) },
              { icon: "flag", title: "Misi", text: clip(out.mission.join(" · "), 160) },
            ],
          },
          { layout: "quote", kicker: "POSITIONING", title: "Posisi kita", quote: clip(out.positioning.statement, 240) },
          {
            layout: "cards",
            kicker: "JANJI BRAND",
            title: clip(out.promise, 90),
            cards: [
              { icon: "target", title: "Untuk siapa", text: clip(out.positioning.target, 160) },
              { icon: "star", title: "Pembeda", text: clip(out.positioning.difference, 160) },
              { icon: "circle-check", title: "Alasan percaya", text: clip(out.positioning.reason, 160) },
              { icon: "crown", title: clip(`Archetype: ${out.archetype}`, 40), text: clip(out.archetype_note, 160) },
            ],
          },
          {
            layout: "cards",
            kicker: "NILAI BRAND",
            title: "Yang kami pegang",
            cards: out.values.slice(0, 6).map((x, i) => ({ icon: VALUE_ICONS[i % VALUE_ICONS.length], title: clip(x.name, 40), text: clip(`${x.meaning} Contoh: ${x.behaviors[0] ?? ""}`, 160) })),
          },
          {
            layout: "comparison",
            kicker: "KEPRIBADIAN",
            title: "Kalau brand ini manusia",
            columns: [
              { heading: "Tapi bukan", bullets: out.personality.slice(0, 5).map((p) => clip(p.is_not, 110)) },
              { heading: "Kami adalah", bullets: out.personality.slice(0, 5).map((p) => clip(`${p.trait} — ${p.is}`, 110)) },
            ],
          },
          {
            layout: "table",
            kicker: "TONE OF VOICE",
            title: "Cara kami bicara",
            table: {
              headers: ["Spektrum", "Posisi (1-5)", "Artinya"],
              rows: out.tone.slice(0, 6).map((x) => [clip(`${x.left} ↔ ${x.right}`, 60), `${dots(x.value)} ${x.value}`, clip(x.note, 60)]),
            },
          },
          {
            layout: "comparison",
            kicker: "CONTOH SUARA",
            title: "Katakan ini, bukan itu",
            columns: [
              { heading: "Hindari", bullets: out.voice_examples.slice(0, 4).map((x) => clip(`${x.situation}: ${x.avoid}`, 110)) },
              { heading: "Katakan", bullets: out.voice_examples.slice(0, 4).map((x) => clip(`${x.situation}: ${x.say}`, 110)) },
            ],
          },
          {
            layout: "cards",
            kicker: "MESSAGING HOUSE",
            title: clip(out.messaging.core, 90),
            cards: out.messaging.pillars.slice(0, 3).map((m, i) => ({ icon: ["message-circle", "award", "thumbs-up"][i % 3], title: clip(m.message, 40), text: clip(m.proof.join(" · "), 160) })),
          },
          {
            layout: "bullets",
            kicker: "TAGLINE",
            title: "Opsi tagline",
            subtitle: "Urut dari yang paling direkomendasikan",
            bullets: out.taglines.slice(0, 5).map((x) => clip(`"${x.line}" — ${x.rationale}`, 140)),
          },
          {
            layout: "table",
            kicker: "IDENTITAS VISUAL",
            title: "Palet warna",
            subtitle: clip(v.direction, 160),
            table: {
              headers: ["Warna", "Hex", "Peran", "Porsi", "Dipakai untuk"],
              rows: v.palette.slice(0, 7).map((p) => [clip(p.name, 60), p.hex, clip(p.role, 60), `${p.share}%`, clip(p.usage, 60)]),
            },
          },
          {
            layout: "cards",
            kicker: "IDENTITAS VISUAL",
            title: "Tipografi & gaya visual",
            cards: [
              { icon: "pen-tool", title: clip(`Judul: ${v.heading_font.family}`, 40), text: clip(v.heading_font.why, 160) },
              { icon: "file-text", title: clip(`Isi: ${v.body_font.family}`, 40), text: clip(v.body_font.why, 160) },
              { icon: "camera", title: "Gaya foto", text: clip(v.photography, 160) },
              ...(v.illustration ? [{ icon: "palette", title: "Ilustrasi & ikon", text: clip(v.illustration, 160) }] : []),
            ],
          },
          {
            layout: "comparison",
            kicker: "LOGO",
            title: "Aturan pemakaian logo",
            columns: [
              { heading: "Jangan", bullets: v.logo_dont.slice(0, 5).map((x) => clip(x, 110)) },
              { heading: "Lakukan", bullets: v.logo_do.slice(0, 5).map((x) => clip(x, 110)) },
            ],
          },
          {
            layout: "comparison",
            kicker: "WORD BANK",
            title: "Kosakata brand",
            columns: [
              { heading: "Kata yang dihindari", bullets: chunk(out.word_bank.avoid) },
              { heading: "Kata yang kami pakai", bullets: chunk(out.word_bank.use) },
            ],
          },
          {
            layout: "comparison",
            kicker: "DO & DON'T",
            title: "Pegangan sehari-hari",
            columns: [
              { heading: "Jangan pernah", bullets: out.donts.slice(0, 5).map((x) => clip(x, 110)) },
              { heading: "Selalu", bullets: out.dos.slice(0, 5).map((x) => clip(x, 110)) },
            ],
          },
          {
            layout: "closing",
            title: clip(out.essence, 90),
            bullets: [out.promise, ...(out.taglines[0] ? [`Tagline: "${out.taglines[0].line}"`] : [])].map((b) => clip(b, 140)),
          },
        ],
      },
      sheets: [
        {
          name: "Brand sheet",
          title: `Brand sheet — ${brand}`,
          columns: [
            { header: "Aspek", key: "k", width: 26 },
            { header: "Isi", key: "v", width: 100 },
          ],
          rows: [
            { k: "Brand essence", v: `${out.essence} — ${out.essence_story}` },
            { k: "Purpose", v: out.purpose },
            { k: "Visi", v: out.vision },
            { k: "Misi", v: out.mission.map((m) => `• ${m}`).join("\n") },
            { k: "Archetype", v: `${out.archetype} — ${out.archetype_note}` },
            { k: "Positioning", v: out.positioning.statement },
            { k: "Brand promise", v: out.promise },
            ...out.values.map((x) => ({ k: `Nilai: ${x.name}`, v: `${x.meaning}\n${x.behaviors.map((b) => `• ${b}`).join("\n")}` })),
            ...out.personality.map((p) => ({ k: `Kepribadian: ${p.trait}`, v: `Adalah: ${p.is}\nBukan: ${p.is_not}` })),
            ...out.tone.map((x) => ({ k: `Tone: ${x.left} ↔ ${x.right}`, v: `${x.value}/5 — ${x.note}` })),
            { k: "Pesan utama", v: out.messaging.core },
            ...out.messaging.pillars.map((m, i) => ({ k: `Pesan pendukung ${i + 1}`, v: `${m.message}\n${m.proof.map((p) => `• ${p}`).join("\n")}` })),
            ...out.taglines.map((x, i) => ({ k: `Tagline opsi ${i + 1}`, v: `${x.line} — ${x.rationale}` })),
            { k: "Font judul", v: `${v.heading_font.family} — ${v.heading_font.why}` },
            { k: "Font isi", v: `${v.body_font.family} — ${v.body_font.why}` },
            { k: "Gaya foto", v: v.photography },
            ...(v.illustration ? [{ k: "Ilustrasi & ikon", v: v.illustration }] : []),
            { k: "Logo — lakukan", v: v.logo_do.map((x) => `• ${x}`).join("\n") },
            { k: "Logo — jangan", v: v.logo_dont.map((x) => `• ${x}`).join("\n") },
            { k: "Kata dipakai", v: out.word_bank.use.join(", ") },
            { k: "Kata dihindari", v: out.word_bank.avoid.join(", ") },
            { k: "Selalu", v: out.dos.map((x) => `• ${x}`).join("\n") },
            { k: "Jangan pernah", v: out.donts.map((x) => `• ${x}`).join("\n") },
          ],
        },
        {
          name: "Contoh suara",
          columns: [
            { header: "Situasi", key: "situation", width: 26 },
            { header: "Katakan", key: "say", width: 60 },
            { header: "Hindari", key: "avoid", width: 50 },
            { header: "Kenapa", key: "why", width: 40 },
          ],
          rows: out.voice_examples,
        },
        {
          name: "Palet warna",
          title: v.direction,
          columns: [
            { header: "Nama", key: "name", width: 20 },
            { header: "Hex", key: "hex", width: 11 },
            { header: "RGB", key: "rgb", width: 16 },
            { header: "Peran", key: "role", width: 18 },
            { header: "Porsi (%)", key: "share", width: 10 },
            { header: "Dipakai untuk", key: "usage", width: 60 },
          ],
          rows: v.palette.map((p) => ({ ...p, rgb: [1, 3, 5].map((i) => parseInt(p.hex.slice(i, i + 2), 16)).join(", ") })),
        },
      ],
    };
  },
};

/** Gabungkan kata menjadi maks 5 poin ≤110 karakter. */
function chunk(words: string[]) {
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} · ${w}` : w;
    if (next.length > 108 && cur) {
      out.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out.slice(0, 5).map((x) => clip(x, 110));
}

export const brandRunner = makeRunner(brandDef);
