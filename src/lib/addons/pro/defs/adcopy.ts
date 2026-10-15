import "server-only";
import { clip, fileSlug, type SheetSpec } from "../../runtime";
import { atLeast, makeRunner, type ProDef } from "../kit";
import { AD_LIMITS, FORMAT_LABEL, PLATFORM_LABEL, adcopyForm, adcopyOutput, type AdVariant } from "../specs/adcopy";

const PLATFORM_RULES: Record<string, string> = {
  meta: `META (Facebook & Instagram)
- Format: campuran video 9:16/4:5, single image 1:1/4:5, carousel, collection (bila katalog). Placement utama Reels/Stories/Feed.
- primary_text: 125 karakter pertama harus memuat hook + alasan klik (sisanya tersembunyi di balik "Lihat selengkapnya"). Panjang total boleh
  50-400 karakter sesuai angle (long copy untuk objection handling/storytelling, short copy untuk offer). Baris baru & emoji secukupnya.
- headline ≤40 karakter (idealnya ≤27 agar tidak terpotong), description ≤30 karakter.
- cta_button pilih dari: Belanja Sekarang, Pesan Sekarang, Pelajari Selengkapnya, Kirim Pesan WhatsApp, Daftar, Dapatkan Penawaran, Instal Sekarang, Hubungi Kami.
- Struktur tes: 1 campaign Sales/Leads, 1 ad set per angle (ABO, budget sama) berisi 2-3 iklan, audiens luas (Advantage+) kecuali produk sangat niche.
- extra_headlines & extra_descriptions: array kosong.`,
  tiktok: `TIKTOK ADS
- Semua variasi format "video" 9:16, 9-34 detik, rasa native (bukan iklan TV): talent bicara ke kamera, UGC, demo, POV. Hook 0-3 detik wajib kuat.
- primary_text = ad text: MAKSIMAL 100 karakter, TANPA emoji (TikTok menolak emoji di ad text). headline = display name/judul singkat brand ≤40 karakter.
- description: catatan teks layar utama (≤60 karakter). visual: alur video per detik singkat (0-3, 3-10, 10-akhir) + saran Spark Ads bila memakai konten organik.
- cta_button pilih dari: Beli Sekarang, Pesan Sekarang, Pelajari Lebih Lanjut, Daftar, Hubungi Kami, Unduh.
- Struktur tes: 1 campaign, 1 ad group per angle, 2-3 video per ad group; jalankan pemenang sebagai Spark Ads.
- extra_headlines & extra_descriptions: array kosong.`,
  google: `GOOGLE SEARCH ADS (Responsive Search Ads)
- Semua variasi format "search". Satu variasi = satu RSA untuk satu ad group/tema kata kunci (angle).
- headline + extra_headlines (total 5-7 per variasi): SETIAP headline MAKSIMAL 30 karakter termasuk spasi. Hitung dengan teliti.
  Campurkan: kata kunci utama, manfaat, harga/offer, bukti (hanya dari user), CTA ("Pesan Hari Ini"), nama brand.
- description + extra_descriptions (total 2-3): SETIAP description MAKSIMAL 90 karakter.
- Kebijakan editorial Google: tanpa tanda seru di headline, tanpa emoji, tanpa HURUF KAPITAL berlebihan, tanpa tanda baca berulang, tanpa klaim superlatif tanpa bukti.
- hook: kata kunci/niat pencarian yang disasar (mis. "kopi literan murah jakarta"). primary_text: daftar 5-10 kata kunci untuk ad group ini (pisahkan koma,
  sebut match type, mis. [kopi literan], "kopi susu literan"). cta_button: "-". visual: sitelink & callout yang disarankan.
- Struktur tes: 1 campaign Search per tujuan, 1 ad group per angle/tema kata kunci, 1 RSA per ad group; kata kunci negatif disebut di structure.`,
  shopee: `SHOPEE ADS
- Format: single_image (Iklan Pencarian Produk/Iklan Produk Serupa — judul & foto utama produk adalah iklannya), video (Shopee Video/Live), collection (Iklan Toko).
- headline = usulan judul produk SEO (kata kunci utama di depan, ≤60 karakter), primary_text = teks voucher/badge + deskripsi singkat untuk Iklan Toko/foto utama,
  description = kata kunci yang ditargetkan (pisahkan koma). visual: arahan foto utama 1:1 (produk besar, harga/benefit di overlay, latar bersih).
- cta_button: "Beli Sekarang" atau "Kunjungi Toko". Bahas bidding kata kunci (broad vs exact), ROAS target Shopee (otomatis vs manual) di test_plan.
- extra_headlines & extra_descriptions: array kosong.`,
};

const OBJECTIVE: Record<string, string> = {
  penjualan: "Penjualan: metrik utama CPA/cost per purchase & ROAS. Hitung CPA maksimal dan ROAS impas dari harga (asumsikan margin kotor bila tidak disebut, tulis asumsinya).",
  leads: "Leads/chat WhatsApp: metrik utama cost per chat/lead & persentase chat yang jadi order. Copy menurunkan hambatan chat (kata kunci, promo khusus chat).",
  traffic: "Traffic: metrik utama CPC (link) & CTR; tetap jaga kualitas kunjungan (bounce, add to cart).",
  awareness: "Awareness: metrik utama CPM, ThruPlay/2-second view, hook rate & ad recall; copy pendek, brand muncul di 3 detik pertama.",
  install: "Install aplikasi: metrik utama CPI & event setelah install (registrasi/transaksi pertama).",
};

export const adcopyDef: ProDef<typeof adcopyOutput> = {
  tool: "adcopy",
  addon: "dokter_iklan",
  form: adcopyForm,
  output: adcopyOutput,
  maxOutputTokens: 15000,
  role: `Kamu Performance Creative Strategist yang mengelola miliaran Rupiah spend Meta, TikTok & Google per tahun untuk brand D2C dan UMKM Indonesia.
Kamu tahu bahwa kreatif adalah targeting terbesar: tiap variasi yang kamu tulis menguji SATU hipotesis (angle × audiens × format) yang jelas,
copy-nya siap tempel tanpa diedit, dan rencana tesnya punya aturan angka yang tegas kapan iklan dimatikan atau dinaikkan budgetnya.`,
  rules: (input) => {
    const count = Number(input.count) || 8;
    const platform = String(input.platform);
    return `JUMLAH & SEBARAN
- Buat TEPAT ${count} variasi untuk ${PLATFORM_LABEL[platform] ?? platform}. Pakai 4-6 angle; tiap angle minimal 1 variasi; tidak ada dua variasi dengan hook yang mirip.
- Angle yang tersedia: pain (masalah yang dirasakan), benefit/hasil, social proof (HANYA bukti dari user), offer/penawaran, curiosity, comparison
  (vs cara lama/alternatif umum — jangan menyebut merek pesaing), objection handling (harga, ragu kualitas, ongkir, rasa), urgency yang jujur
  (hanya bila promo punya batas waktu nyata), founder story, demo/how-to.
- Field angle tiap variasi = salah satu nama angle di daftar angles.

STANDAR COPY
- Hook: berhenti-scroll dalam 1 kalimat — angka spesifik, pertanyaan tajam, situasi relatable, kontras, atau hasil di depan. Bukan "Hai Kak!" atau nama brand.
- Primary text: struktur PAS (problem–agitate–solution) atau before–after–bridge, lalu offer yang jelas (harga/promo/batas waktu bila ada) dan satu CTA.
  Bahasa lisan target (kak/kamu), kalimat pendek, spesifik ke produk (ukuran, isi, waktu kirim, cara pakai). Hindari klaim kosong ("terbaik", "berkualitas").
- Headline: manfaat atau offer paling kuat, bukan nama produk saja.
- Visual: arahan konkret (rasio, apa yang terlihat di frame pertama, teks overlay ≤6 kata, warna/latar, talent, ritme cut) — desainer bisa langsung kerja.
- reason: hipotesis yang diuji ("orang yang sensitif harga merespons hitungan per gelas lebih baik daripada diskon %").
- Audiens tiap variasi: penargetan yang realistis (umur, minat/perilaku, lookalike/retargeting pengunjung/pembeli, atau broad) sesuai angle.

${PLATFORM_RULES[platform] ?? PLATFORM_RULES.meta}

TUJUAN
- ${OBJECTIVE[String(input.objective)] ?? OBJECTIVE.penjualan}
- Landing/arah klik: ${input.landing ? String(input.landing) : "tidak disebut — sarankan yang paling cocok dan sebut di strategy.funnel"}.

RENCANA TES A/B (test_plan)
- structure: campaign → ad set/ad group → iklan dengan konvensi penamaan (mis. KS_SALES_OKT | AS_PAIN | V3_VID).
- budget_split: total 100%, pembagian per angle/ad set${input.budget ? `; budget harian user ${input.budget} — sebut nominal per item di note` : ""}. Sisakan 10-20% untuk retargeting bila relevan.
- duration: minimal 5-7 hari atau sampai tiap iklan menghabiskan ±2-3× target CPA / ±3.000 impresi, jangan memutuskan di 24 jam pertama (fase learning).
- rules 4-6 berbasis angka, contoh pola: kill bila spend ≥2× target CPA tanpa konversi; kill bila CTR link <0,8% setelah 3.000 impresi (Meta) / <0,5% (TikTok);
  video: kill bila hook rate (3-sec view ÷ impresi) <25%; scale +20-30% budget tiap 48-72 jam bila CPA ≤ target selama 3 hari; iterate: CTR tinggi tapi
  konversi rendah → perbaiki landing/offer, bukan kreatif. Sesuaikan angka dengan harga produk; tandai sebagai patokan perkiraan.

KEPATUHAN (compliance 3-5, spesifik ke produk & copy ini)
- Meta: dilarang menyiratkan atribut pribadi penonton ("Kamu yang gemuk…", "Punya utang?", "Jerawatmu parah?") — ubah ke sudut pandang orang pertama/umum.
  Konten berat badan/kesehatan: tanpa before-after ekstrem, tanpa janji waktu ("turun 5 kg dalam 7 hari").
- Klaim kesehatan/kosmetik/pangan mengikuti BPOM: tanpa "menyembuhkan", "100% aman", "permanen"; label halal/BPOM/SNI hanya bila disebut user.
- "Gratis", "diskon", "termurah", "No.1", "terlaris" hanya bila benar & bisa dibuktikan; promo wajib ada syarat/batas waktu yang jelas.
- Google: kebijakan editorial (tanda baca, kapital, emoji) & merek dagang pesaing. TikTok: tanpa emoji di ad text, tanpa klaim menyesatkan.
- Tiap catatan: risiko → aturan → perbaikan copy yang konkret.`;
  },
  post(out, input) {
    const platform = String(input.platform);
    out.platform = platform;
    out.variants = out.variants.map((v, i) => fixVariant({ ...v, code: `V${String(i + 1).padStart(2, "0")}` }, platform));
    const total = out.test_plan.budget_split.reduce((s, b) => s + (Number(b.share_pct) || 0), 0);
    if (total > 0 && Math.abs(total - 100) > 1)
      out.test_plan.budget_split = out.test_plan.budget_split.map((b) => ({ ...b, share_pct: Math.round(((Number(b.share_pct) || 0) / total) * 100) }));
  },
  title: (_out, input) => `Variasi iklan ${PLATFORM_LABEL[String(input.platform)] ?? ""} — ${input.brand}`,
  files(out, input) {
    const platform = out.platform ?? String(input.platform);
    const brand = String(input.brand);
    const slug = fileSlug(brand).toUpperCase().replace(/-/g, "").slice(0, 6) || "BRAND";
    const camp = `${slug}_${String(input.objective).toUpperCase()}_TES-KREATIF`;
    const adset = (v: AdVariant) => `AS_${fileSlug(v.angle).toUpperCase().slice(0, 18)}`;
    const adName = (v: AdVariant) => `${v.code}_${FORMAT_LABEL[v.format].replace(/\s+/g, "").toUpperCase()}`;
    const url = String(input.landing ?? "");
    const flagColor = (r: Record<string, unknown>) => (r.flags ? "FFF7E0" : null);
    return {
      name: `variasi-iklan-${platform}-${fileSlug(brand)}`,
      deckLabel: "PPT konsep iklan",
      sheetLabel: `Excel siap upload (${PLATFORM_LABEL[platform] ?? platform})`,
      deck: {
        title: clip(`Konsep Iklan ${PLATFORM_LABEL[platform] ?? ""}`, 90),
        subtitle: clip(`${brand} · ${out.variants.length} variasi untuk diuji`, 160),
        theme: "sunset",
        cover_style: "split",
        slides: [
          { layout: "quote", kicker: "STRATEGI KREATIF", title: "Apa yang kita uji", quote: clip(out.strategy.summary, 240) },
          {
            layout: "cards",
            kicker: "ANGLE",
            title: "Hipotesis yang diuji",
            cards: out.angles.slice(0, 6).map((a, i) => ({ icon: ["target", "lightbulb", "users", "tag", "eye", "shield"][i % 6], title: clip(a.name, 40), text: clip(a.why, 160) })),
          },
          {
            layout: "table",
            kicker: "VARIASI",
            title: "Ringkasan variasi iklan",
            table: {
              headers: ["Kode", "Angle", "Format", "Hook", "Headline"],
              rows: out.variants.slice(0, 7).map((v) => [v.code, clip(v.angle, 60), FORMAT_LABEL[v.format], clip(v.hook, 60), clip(v.headline, 60)]),
            },
          },
          ...(out.variants.length > 7
            ? [
                {
                  layout: "table" as const,
                  kicker: "VARIASI (LANJUTAN)",
                  title: "Ringkasan variasi iklan",
                  table: {
                    headers: ["Kode", "Angle", "Format", "Hook", "Headline"],
                    rows: out.variants.slice(7, 14).map((v) => [v.code, clip(v.angle, 60), FORMAT_LABEL[v.format], clip(v.hook, 60), clip(v.headline, 60)]),
                  },
                },
              ]
            : []),
          {
            layout: "cards",
            kicker: "CONTOH COPY",
            title: "Tiga variasi unggulan",
            cards: out.variants.slice(0, 3).map((v) => ({ icon: "megaphone", title: clip(`${v.code} · ${v.headline}`, 40), text: clip(platform === "google" ? v.description : v.primary_text, 160) })),
          },
          {
            layout: "chart",
            kicker: "BUDGET TES",
            title: "Pembagian budget",
            subtitle: clip(out.test_plan.duration, 160),
            chart: { type: "doughnut", labels: out.test_plan.budget_split.map((b) => clip(b.item, 30)), series: [{ name: "Porsi", values: out.test_plan.budget_split.map((b) => Number(b.share_pct) || 0) }], unit: "%" },
          },
          {
            layout: "table",
            kicker: "ATURAN TES",
            title: "Kapan dimatikan, kapan dinaikkan",
            subtitle: clip(`Metrik utama: ${out.test_plan.primary_metric}`, 160),
            table: { headers: ["Aksi", "Kondisi", "Langkah"], rows: out.test_plan.rules.slice(0, 7).map((r) => [RULE_LABEL[r.type], clip(r.condition, 60), clip(r.action, 60)]) },
          },
          {
            layout: "timeline",
            kicker: "STRUKTUR",
            title: "Alur peluncuran tes",
            steps: atLeast(
              [
                { title: "Siapkan kampanye", text: clip(out.test_plan.structure, 120) },
                { title: "Jalankan tes", text: clip(out.test_plan.duration, 120) },
                { title: "Putuskan pemenang", text: clip(out.test_plan.primary_metric, 120) },
              ],
              3,
              { title: "Evaluasi", text: "Review angka tiap 48 jam." },
            ),
          },
          { layout: "closing", title: "Catatan kepatuhan iklan", bullets: out.compliance.slice(0, 6).map((c) => clip(`${c.risk}: ${c.fix}`, 140)) },
        ],
      },
      sheets: [
        uploadSheet(platform, out.variants, { camp, adset, adName, url }),
        {
          name: "Semua variasi",
          title: `Variasi iklan ${PLATFORM_LABEL[platform] ?? ""} — ${brand}`,
          columns: [
            { header: "Kode", key: "code", width: 8 },
            { header: "Angle", key: "angle", width: 18 },
            { header: "Format", key: "format", width: 12 },
            { header: "Audiens", key: "audience", width: 30 },
            { header: "Hook", key: "hook", width: 36 },
            { header: platform === "google" ? "Kata kunci" : "Primary text", key: "primary_text", width: 60 },
            { header: "Headline", key: "headline", width: 30 },
            { header: "Deskripsi", key: "description", width: 36 },
            { header: "Tombol CTA", key: "cta_button", width: 18 },
            { header: "Arahan visual", key: "visual", width: 50 },
            { header: "Alasan / hipotesis", key: "reason", width: 44 },
            { header: "Catatan sistem", key: "flags", width: 36 },
          ],
          rows: out.variants.map(flat),
          rowColor: flagColor,
        },
        {
          name: "Rencana tes",
          columns: [
            { header: "Bagian", key: "k", width: 22 },
            { header: "Isi", key: "v", width: 80 },
            { header: "Angka", key: "n", width: 14 },
          ],
          rows: [
            { k: "Struktur kampanye", v: out.test_plan.structure, n: "" },
            { k: "Durasi & syarat data", v: out.test_plan.duration, n: "" },
            { k: "Metrik utama", v: out.test_plan.primary_metric, n: "" },
            ...out.test_plan.budget_split.map((b) => ({ k: `Budget: ${b.item}`, v: b.note, n: `${b.share_pct}%` })),
            ...out.test_plan.rules.map((r) => ({ k: `Aturan ${RULE_LABEL[r.type]}`, v: `Jika ${r.condition} → ${r.action}`, n: "" })),
          ],
          rowColor: (r) => (String(r.k).includes("Matikan") ? "FDECEC" : String(r.k).includes("Naikkan") ? "E8F8EF" : null),
        },
        {
          name: "Kepatuhan",
          columns: [
            { header: "Risiko", key: "risk", width: 40 },
            { header: "Aturan", key: "guideline", width: 60 },
            { header: "Perbaikan", key: "fix", width: 60 },
          ],
          rows: out.compliance,
        },
      ],
    };
  },
};

/** Kolom datar satu variasi (tanpa array) untuk Excel. */
const flat = (v: AdVariant) => ({
  code: v.code,
  angle: v.angle,
  audience: v.audience,
  format: FORMAT_LABEL[v.format],
  hook: v.hook,
  primary_text: v.primary_text,
  headline: v.headline,
  description: v.description,
  cta_button: v.cta_button,
  visual: v.visual,
  reason: v.reason,
  flags: (v.flags ?? []).join("; "),
});

const RULE_LABEL = { kill: "Matikan", scale: "Naikkan", iterate: "Perbaiki" } as const;

/** Potong di akhir kalimat (bila cukup panjang) atau batas kata agar tidak melebihi n karakter. */
function cut(s: string, n: number) {
  const chars = [...s.trim()];
  if (chars.length <= n) return s.trim();
  const head = chars.slice(0, n).join("");
  const end = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "), head.endsWith(".") ? head.length - 1 : -1);
  if (end > n * 0.6) return head.slice(0, end + 1);
  const sp = head.lastIndexOf(" ");
  return (sp > n * 0.5 ? head.slice(0, sp) : head).replace(/[\s,.;:–-]+$/, "");
}

const EMOJI = /\p{Extended_Pictographic}️?/gu;
const len = (s: string) => [...s].length;

/** Patuhi batas karakter & aturan platform: yang ditolak platform dipotong, yang hanya terpotong di tampilan ditandai. */
export function fixVariant(v: AdVariant, platform: string): AdVariant {
  const lim = AD_LIMITS[platform] ?? { hard: false };
  const flags: string[] = [];
  const out = { ...v, extra_headlines: [...(v.extra_headlines ?? [])], extra_descriptions: [...(v.extra_descriptions ?? [])] };
  if (platform === "google") {
    out.format = "search";
    const fixH = (h: string, label: string) => {
      if (h.includes("!") || h.match(EMOJI)) flags.push(`${label}: tanda seru/emoji dihapus (kebijakan editorial Google)`);
      let x = h.replace(/!/g, "").replace(EMOJI, "").replace(/\s+/g, " ").trim();
      if (len(x) > 30) {
        const before = len(x);
        x = cut(x, 30);
        flags.push(`${label} dipotong ${before}→${len(x)} karakter`);
      }
      return x;
    };
    const fixD = (d: string, label: string) => {
      let x = d.replace(EMOJI, "").replace(/\s+/g, " ").trim();
      if (len(x) > 90) {
        const before = len(x);
        x = cut(x, 90);
        flags.push(`${label} dipotong ${before}→${len(x)} karakter`);
      }
      return x;
    };
    out.headline = fixH(out.headline, "Headline 1");
    out.extra_headlines = out.extra_headlines.map((h, i) => fixH(h, `Headline ${i + 2}`)).filter(Boolean).slice(0, 14);
    out.description = fixD(out.description, "Description 1");
    out.extra_descriptions = out.extra_descriptions.map((d, i) => fixD(d, `Description ${i + 2}`)).filter(Boolean).slice(0, 3);
    const hs = [out.headline, ...out.extra_headlines];
    if (hs.length < 3) flags.push(`RSA butuh minimal 3 headline (baru ${hs.length})`);
    if (1 + out.extra_descriptions.length < 2) flags.push("RSA butuh minimal 2 description");
  } else {
    out.extra_headlines = [];
    out.extra_descriptions = [];
  }
  if (platform === "tiktok") {
    if (out.primary_text.match(EMOJI)) flags.push("Emoji dihapus dari ad text (tidak didukung TikTok)");
    let x = out.primary_text.replace(EMOJI, "").replace(/[ \t]+/g, " ").trim();
    if (len(x) > 100) {
      const before = len(x);
      x = cut(x.replace(/\s*\n\s*/g, " "), 100);
      flags.push(`Ad text dipotong ${before}→${len(x)} karakter`);
    }
    out.primary_text = x;
  }
  if (!lim.hard) {
    if (lim.primary && len(out.primary_text) > lim.primary) flags.push(`Primary text ${len(out.primary_text)} karakter — hanya ±${lim.primary} pertama tampil sebelum "Lihat selengkapnya"`);
    if (lim.headline && len(out.headline) > lim.headline) flags.push(`Headline ${len(out.headline)} karakter — bisa terpotong (saran ≤${lim.headline})`);
    if (lim.description && len(out.description) > lim.description) flags.push(`Deskripsi ${len(out.description)} karakter — bisa terpotong (saran ≤${lim.description})`);
  }
  return { ...out, flags };
}

function uploadSheet(
  platform: string,
  variants: AdVariant[],
  n: { camp: string; adset: (v: AdVariant) => string; adName: (v: AdVariant) => string; url: string },
): SheetSpec {
  if (platform === "google") {
    const hMax = Math.min(15, Math.max(3, ...variants.map((v) => 1 + v.extra_headlines.length)));
    const dMax = Math.min(4, Math.max(2, ...variants.map((v) => 1 + v.extra_descriptions.length)));
    return {
      name: "Upload Google Ads",
      title: "Format Google Ads Editor — Responsive Search Ads (headline ≤30, description ≤90 karakter)",
      columns: [
        { header: "Campaign", key: "campaign", width: 26 },
        { header: "Ad group", key: "adgroup", width: 22 },
        ...Array.from({ length: hMax }, (_, i) => ({ header: `Headline ${i + 1}`, key: `h${i + 1}`, width: 26 })),
        ...Array.from({ length: dMax }, (_, i) => ({ header: `Description ${i + 1}`, key: `d${i + 1}`, width: 50 })),
        { header: "Final URL", key: "url", width: 30 },
        { header: "Kata kunci", key: "keywords", width: 50 },
      ],
      rows: variants.map((v) => {
        const row: Record<string, string> = { campaign: n.camp, adgroup: n.adset(v), url: n.url, keywords: v.primary_text };
        [v.headline, ...v.extra_headlines].slice(0, hMax).forEach((h, i) => (row[`h${i + 1}`] = h));
        [v.description, ...v.extra_descriptions].slice(0, dMax).forEach((d, i) => (row[`d${i + 1}`] = d));
        return row;
      }),
    };
  }
  if (platform === "tiktok")
    return {
      name: "Upload TikTok Ads",
      title: "Format TikTok Ads Manager (ad text ≤100 karakter, tanpa emoji)",
      columns: [
        { header: "Campaign name", key: "campaign", width: 26 },
        { header: "Ad group name", key: "adgroup", width: 22 },
        { header: "Ad name", key: "ad", width: 16 },
        { header: "Ad text", key: "primary_text", width: 60 },
        { header: "Karakter", key: "chars", width: 10 },
        { header: "Call to action", key: "cta_button", width: 18 },
        { header: "Landing page URL", key: "url", width: 30 },
        { header: "Display name", key: "headline", width: 22 },
        { header: "Hook 0-3 dtk", key: "hook", width: 40 },
        { header: "Arahan video", key: "visual", width: 60 },
      ],
      rows: variants.map((v) => ({ ...flat(v), campaign: n.camp, adgroup: n.adset(v), ad: n.adName(v), url: n.url, chars: len(v.primary_text) })),
    };
  if (platform === "shopee")
    return {
      name: "Upload Shopee Ads",
      title: "Shopee Ads — judul produk, foto utama & kata kunci per variasi",
      columns: [
        { header: "Nama iklan", key: "ad", width: 18 },
        { header: "Jenis iklan", key: "format", width: 16 },
        { header: "Judul produk / headline", key: "headline", width: 44 },
        { header: "Teks iklan / voucher", key: "primary_text", width: 50 },
        { header: "Kata kunci", key: "description", width: 44 },
        { header: "Arahan foto utama", key: "visual", width: 50 },
        { header: "CTA", key: "cta_button", width: 16 },
      ],
      rows: variants.map((v) => ({ ...flat(v), ad: n.adName(v) })),
    };
  return {
    name: "Upload Meta Ads",
    title: "Format Meta Ads Manager (primary text: hook di 125 karakter pertama)",
    columns: [
      { header: "Campaign Name", key: "campaign", width: 26 },
      { header: "Ad Set Name", key: "adgroup", width: 22 },
      { header: "Ad Name", key: "ad", width: 18 },
      { header: "Format", key: "format", width: 13 },
      { header: "Primary Text", key: "primary_text", width: 60 },
      { header: "Headline", key: "headline", width: 30 },
      { header: "Description", key: "description", width: 26 },
      { header: "Call to Action", key: "cta_button", width: 22 },
      { header: "Website URL", key: "url", width: 30 },
      { header: "Arahan visual", key: "visual", width: 50 },
    ],
    rows: variants.map((v) => ({ ...flat(v), campaign: n.camp, adgroup: n.adset(v), ad: n.adName(v), url: n.url })),
  };
}

export const adcopyRunner = makeRunner(adcopyDef);
