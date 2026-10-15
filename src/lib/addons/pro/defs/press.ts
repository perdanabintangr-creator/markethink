import "server-only";
import { fileSlug } from "../../runtime";
import { makeRunner, type ProDef } from "../kit";
import { DESK_LABEL, PRESS_TYPE_LABEL, pressForm, pressOutput, pressParagraphs, wordCount } from "../specs/press";

/** Hal yang wajib ada per jenis berita (cara wartawan menilai rilis). */
const TYPE_RULES: Record<string, string> = {
  launch: `PELUNCURAN: masalah nyata yang dijawab produk, siapa penggunanya, harga & ketersediaan (kanal, kota, tanggal), pembeda yang bisa dibuktikan.
  Jangan menulis seperti brosur; fitur dijelaskan lewat manfaat bagi konsumen dengan angka.`,
  partnership: `KEMITRAAN: apa yang dikerjakan bersama secara konkret, sejak kapan, skala (jumlah lokasi/penerima/nilai bila disebut), manfaat bagi publik,
  bukan hanya bagi kedua perusahaan. Bila narasumber kedua pihak tersedia, kutip keduanya (satu kutipan per pihak).`,
  milestone: `PENCAPAIAN: angka pencapaian + pembanding (tahun lalu/awal berdiri) + apa artinya bagi pelanggan/industri. Hindari nada menyombongkan;
  kutipan berisi cerita di balik angka dan rencana berikutnya.`,
  event: `ACARA: nama acara, tanggal, jam (WIB), lokasi lengkap, siapa yang tampil/pembicara (hanya yang disebut user), cara daftar & biaya, perkiraan
  peserta bila disebut. Sertakan undangan liputan (media invitation) di notes_to_editor bila acara belum berlangsung.`,
  csr: `CSR/SOSIAL: penerima manfaat yang spesifik, angka dampak terukur (jumlah orang, lokasi, durasi), mitra pelaksana, keberlanjutan program.
  Hindari kesan pencitraan: fokus pada penerima manfaat, bukan pada kemurahan hati perusahaan. Jangan memakai foto/kutipan penerima tanpa izin.`,
  funding: `PENDANAAN: jumlah & tahap pendanaan, investor (HANYA yang disebut user), rencana penggunaan dana dengan angka/porsi bila ada, traksi bisnis.
  Jangan menyebut valuasi kecuali diberikan. Wartawan bisnis akan menanyakan profitabilitas & burn rate — siapkan di Q&A.`,
  statement: `PERNYATAAN RESMI: posisi organisasi di kalimat pertama, kronologi fakta singkat, langkah yang sudah & akan diambil (dengan tanggal), kanal
  pengaduan bila relevan. Nada tenang, empatik, tanpa menyalahkan pihak lain, tanpa spekulasi hukum, tanpa kata "oknum". Tanpa promosi apa pun.`,
};

const DESK_OUTLETS = `Contoh outlet Indonesia per desk (pilih yang relevan; nama media saja):
  nasional/umum: Kompas.com, Detikcom, Tempo.co, CNN Indonesia, Antara, Kumparan, Liputan6.com, Tribunnews, Okezone, Republika
  bisnis/ekonomi: Kontan, Bisnis Indonesia (Bisnis.com), CNBC Indonesia, Katadata, Investor Daily, Kompas Money, SWA, Marketeers, Detikfinance
  teknologi: DailySocial.id, Tech in Asia Indonesia, KompasTekno, Detikinet, Selular.id, Tekno Liputan6, Gadgetren, Jagat Review
  lifestyle: IDN Times, Kumparan Woman, Femina, Fimela, Popbela, Beautynesia, Wolipop (Detik), Kompas Lifestyle, Hipwee, Tempo Gaya
  lokal/daerah: jaringan Tribun daerah (Tribun Jabar, Tribun Jogja, dsb.), Radar (Jawa Pos Group), Pikiran Rakyat, Suara Merdeka, Jawa Pos,
    Harian Jogja, Bali Post, Kaltim Post, Antara biro daerah — pilih sesuai kota di dateline
  trade/industri: sesuaikan sektor — mis. Marketeers & MIX (marketing), FoodReview Indonesia (F&B),
    InfoSawit/Agrina (agribisnis), Selular (telko), Infobank (keuangan). Bila ragu outlet itu ada, jangan disebut.`;

const MONTHS = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
/** Nama hari untuk tanggal di dateline (AI sering salah menghitung hari). */
function weekdayNote(dateline: string) {
  const m = dateline.toLowerCase().match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  const month = m ? MONTHS.indexOf(m[2]) : -1;
  if (!m || month < 0) return "";
  const d = new Date(Date.UTC(Number(m[3]), month, Number(m[1])));
  return ` (${Number(m[1])} ${m[2][0].toUpperCase()}${m[2].slice(1)} ${m[3]} jatuh pada hari ${DAYS[d.getUTCDay()]} — pakai hari ini bila menyebut hari)`;
}

export const pressDef: ProDef<typeof pressOutput> = {
  tool: "press",
  addon: "kolpr_pro",
  form: pressForm,
  output: pressOutput,
  maxOutputTokens: 12000,
  role: `Kamu PR Director senior Indonesia, mantan wartawan desk ekonomi, yang sudah puluhan kali menembus Kompas, Kontan, Detik, CNBC Indonesia,
dan media lifestyle nasional. Kamu tahu wartawan menerima ratusan rilis per hari dan hanya memuat yang punya nilai berita, fakta jelas,
dan kutipan yang bisa dipakai. Siaran persmu bisa disalin redaksi hampir tanpa suntingan.`,
  rules: (input) => {
    const desks = ((input.target_media as unknown as string[]) ?? []).map((d) => DESK_LABEL[d] ?? d).join(", ");
    return `- Jenis berita: ${PRESS_TYPE_LABEL[String(input.type)] ?? input.type}. ${TYPE_RULES[String(input.type)] ?? ""}
- Sasaran media: ${desks}.

STRUKTUR SIARAN PERS (format standar redaksi Indonesia)
- headlines: tepat 3 opsi dengan sudut berbeda (mis. angka, dampak ke publik, hal baru). Judul ≤90 karakter, kalimat berita aktif (subjek + kata kerja
  + fakta/angka), BUKAN slogan iklan, tanpa tanda seru, tanpa huruf kapital semua, tanpa superlatif ("terbaik", "pertama", "terdepan", "terbesar",
  "revolusioner") kecuali terbukti & disebut user. Subjudul 1 kalimat yang menambah fakta.
- dateline: ${input.dateline ? `pakai "${input.dateline}" (nama kota huruf kapital)${weekdayNote(String(input.dateline))}` : "kota kantor pusat (atau lokasi acara) huruf kapital + tanggal hari ini"}.
- lead: 5W1H dalam 1-2 kalimat (≤45 kata): siapa, melakukan apa, kapan, di mana, mengapa penting/berapa. Fakta terpenting di depan.
- body 3-5 paragraf, piramida terbalik: (1) detail & angka terpenting, (2) konteks — mengapa ini relevan sekarang (tren/masalah publik; tanpa angka
  pasar karangan; bila butuh data industri tulis placeholder [data pendukung: …]), (3) detail teknis: harga, cara mendapatkan, lokasi, jadwal,
  (4-5) rencana berikutnya / info tambahan. Paragraf ≤4 kalimat, kalimat ≤25 kata. Kutipan TIDAK ditulis di body.
- Gaya bahasa: jurnalistik baku (EYD) tapi hidup, kata kerja aktif. Penulisan angka ala redaksi: "Rp2,5 miliar", "15 persen" (bukan %), hari & tanggal
  "Rabu (15/10/2026)" atau "pada 3 November 2026", jam "pukul 10.00 WIB". Nama organisasi ditulis lengkap sekali, lalu nama pendek.
- quotes 1-2: terdengar seperti manusia bicara — alasan di balik keputusan, cerita kecil, pengamatan lapangan, atau sikap; BUKAN mengulang fakta dan
  BUKAN jargon. DILARANG: "kami berkomitmen untuk terus berinovasi", "menghadirkan solusi terbaik", "mendukung ekosistem", "langkah strategis",
  "kami sangat bangga dan senang". Atribusi: “…,” ujar/kata [Nama], [Jabatan] [Organisasi]. ${input.spokesperson ? `Narasumber: ${input.spokesperson}.` : "Narasumber belum diberikan: pakai placeholder [Nama Narasumber], [Jabatan] dan masukkan ke to_verify."}
  "after" = nomor paragraf body tempat kutipan disisipkan (kutipan pertama biasanya setelah paragraf 1 atau 2).
- boilerplate_title "Tentang ${input.organization}". boilerplate 60-100 kata: siapa, sejak kapan, apa yang dilakukan, skala (hanya angka dari user), situs.
  ${input.boilerplate ? "Rapikan boilerplate dari user tanpa menambah klaim baru." : "Boilerplate belum diberikan: susun dari detail yang ada, tandai bagian yang belum diketahui dengan [..] dan masukkan ke to_verify."}
- media_contact: ${input.contact ? `pakai persis: ${input.contact}` : "placeholder [Nama PR], [Jabatan], [No. WA], [Email] dan masukkan ke to_verify"}.
- notes_to_editor: lampiran foto (sebut isinya), data pendukung, ketersediaan narasumber untuk wawancara.
- JANGAN mengarang angka, nama mitra/investor, penghargaan, testimoni, atau kutipan pihak ketiga. Fakta yang kurang ditulis sebagai placeholder [..]
  dan didaftarkan di to_verify.

MATERI PENDUKUNG
- social: 2 versi — LinkedIn (≤120 kata, sudut bisnis/dampak, tanpa hashtag berlebihan, maks 3) dan Instagram/X (≤60 kata, lebih ringan, 2-3 hashtag).
- pitch email: subjek ≤70 karakter yang langsung menyebut fakta berita (bukan "PRESS RELEASE: …"). Isi ≤150 kata: sapaan "Halo Mas/Mbak [Nama wartawan],",
  1 kalimat kenapa relevan untuk desk/rubriknya, 2-3 fakta kunci dalam poin, tawaran eksklusif (wawancara narasumber, data tambahan, foto resolusi tinggi),
  penutup singkat, nama pengirim. Siaran pers ditempel di badan email (bukan hanya lampiran). DILARANG "semoga email ini menemukan Anda dalam keadaan baik".
- media_targets: satu baris per desk yang dipilih user (prioritas tinggi untuk desk yang paling cocok dengan berita). outlets = 3-6 nama media nyata.
  JANGAN mengarang nama wartawan, email redaksi, atau nomor telepon. angle = sudut khusus untuk desk itu (mis. bisnis: angka investasi & ekspansi;
  lifestyle: pengalaman konsumen; lokal: penyerapan tenaga kerja daerah).
${DESK_OUTLETS}
- qa 5-8: pertanyaan yang benar-benar akan ditanyakan wartawan, termasuk yang tidak nyaman (angka yang tidak disebut, omzet/valuasi, kompetitor,
  harga, dampak negatif, isu sensitif). Jawaban jujur & aman; bila tidak bisa diungkap, beri cara menolak yang sopan ("Untuk angka itu belum bisa kami
  buka, yang bisa kami sampaikan …").
- distribution: best_time — kirim Selasa-Kamis pukul 08.00-10.00 WIB (sebelum rapat redaksi), hindari Jumat sore, akhir pekan, tanggal merah &
  hari kejepit; sesuaikan dengan tanggal di dateline. embargo — jelaskan perlu/tidak (mis. peluncuran dengan acara: kirim H-1 dengan embargo hingga
  jam acara; berita yang sudah terjadi: tanpa embargo). assets — foto landscape ≥1920 px dengan caption & kredit, logo PNG, factsheet; file besar via
  tautan Google Drive, total lampiran email ≤5 MB. checklist 6-10 langkah H-7 s.d. H+3: finalisasi & persetujuan narasumber, siapkan media list,
  kirim personal (BCC bila massal), follow up sopan sekali via WA/telepon H+1, pantau & kliping pemberitaan, kirim terima kasih ke wartawan yang memuat.
- to_verify: daftar semua placeholder & angka yang perlu dicek sebelum rilis dikirim; kosong bila semua lengkap.`;
  },
  post(out, input) {
    if (String(input.dateline ?? "").trim()) {
      const [city, ...rest] = String(input.dateline).split(",");
      out.dateline = [city.trim().toUpperCase(), rest.join(",").trim()].filter(Boolean).join(", ");
    }
    if (String(input.contact ?? "").trim()) out.media_contact = String(input.contact).trim();
    out.headlines = out.headlines.map((h) => ({ ...h, title: h.title.trim().replace(/[.!]+$/, "") }));
    out.quotes = out.quotes.map((q) => ({ ...q, after: Math.max(1, Math.min(Math.max(1, out.body.length), Math.round(Number(q.after) || 1))) }));
  },
  title: (out, input) => `Siaran pers — ${out.headlines[0]?.title ?? input.organization}`,
  files(out, input) {
    const h = out.headlines;
    let para = 0;
    return {
      name: `siaran-pers-${fileSlug(String(input.organization))}`,
      deck: null,
      sheetLabel: "Excel siaran pers, media list & Q&A",
      sheets: [
        {
          name: "Siaran pers",
          title: `Siaran pers — ${input.organization}`,
          columns: [
            { header: "Bagian", key: "part", width: 22 },
            { header: "Isi", key: "text", width: 110 },
            { header: "Catatan", key: "note", width: 30 },
          ],
          rows: [
            ...h.map((x, i) => ({ part: i === 0 ? "Judul (utama)" : `Opsi judul ${i + 1}`, text: x.title, note: `${x.title.length} karakter · ${x.angle}` })),
            ...h.map((x, i) => ({ part: `Subjudul ${i + 1}`, text: x.subtitle, note: "" })),
            ...pressParagraphs(out).map((p) => ({ part: p.kind === "lead" ? "Lead (dateline)" : p.kind === "quote" ? "Kutipan" : `Paragraf ${++para}`, text: p.text, note: "" })),
            { part: out.boilerplate_title, text: out.boilerplate, note: "" },
            { part: "Kontak media", text: out.media_contact, note: "" },
            ...(out.notes_to_editor ? [{ part: "Catatan untuk editor", text: out.notes_to_editor, note: "" }] : []),
            { part: "Email pitching — subjek", text: out.pitch.subject, note: `${out.pitch.subject.length} karakter` },
            { part: "Email pitching — isi", text: out.pitch.body, note: `${wordCount(out.pitch.body)} kata` },
            ...out.social.map((s) => ({ part: `Versi ${s.platform}`, text: s.text, note: "" })),
          ],
          rowColor: (r) => (String(r.part).startsWith("Judul") ? "EEF2FF" : null),
        },
        {
          name: "Media sasaran",
          title: "Daftar media sasaran — isi nama wartawan dari database/kontak tim sendiri",
          columns: [
            { header: "Desk", key: "desk", width: 22 },
            { header: "Contoh outlet", key: "outlets", width: 46 },
            { header: "Angle khusus", key: "angle", width: 60 },
            { header: "Prioritas", key: "priority", width: 10 },
            { header: "Nama wartawan", key: "x1", width: 20 },
            { header: "Kontak", key: "x2", width: 20 },
            { header: "Tgl kirim", key: "x3", width: 12 },
            { header: "Status / dimuat?", key: "x4", width: 18 },
          ],
          rows: out.media_targets.map((m) => ({ ...m, outlets: m.outlets.join(", "), x1: "", x2: "", x3: "", x4: "" })),
          rowColor: (r) => (r.priority === "tinggi" ? "E8F8EF" : r.priority === "sedang" ? "FFF7E0" : null),
        },
        {
          name: "Q&A wartawan",
          columns: [
            { header: "No", key: "no", width: 5 },
            { header: "Pertanyaan", key: "question", width: 50 },
            { header: "Jawaban yang disiapkan", key: "answer", width: 80 },
          ],
          rows: out.qa.map((q, i) => ({ no: i + 1, ...q })),
        },
        {
          name: "Checklist distribusi",
          title: `Waktu kirim: ${out.distribution.best_time}`,
          columns: [
            { header: "Kapan", key: "when", width: 16 },
            { header: "Tugas", key: "task", width: 80 },
            { header: "Selesai?", key: "done", width: 10 },
          ],
          rows: [
            ...out.distribution.checklist.map((c) => ({ ...c, done: "" })),
            { when: "Embargo", task: out.distribution.embargo, done: "" },
            ...out.distribution.assets.map((a) => ({ when: "Lampiran", task: a, done: "" })),
            ...out.to_verify.map((v) => ({ when: "Cek sebelum kirim", task: v, done: "" })),
          ],
          rowColor: (r) => (r.when === "Cek sebelum kirim" ? "FDECEC" : null),
        },
      ],
    };
  },
};

export const pressRunner = makeRunner(pressDef);
