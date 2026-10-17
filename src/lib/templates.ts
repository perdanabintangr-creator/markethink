/** Template siap pakai per peran: kerangka perintah, bagian [..] diisi user. */
export interface Template {
  title: string;
  desc: string;
  prompt: string;
  research?: boolean;
}

export const TEMPLATE_GROUPS: { id: string; label: string; roles: string[]; items: Template[] }[] = [
  {
    id: "umkm",
    label: "UMKM",
    roles: ["umkm_owner"],
    items: [
      { title: "Caption promo produk", desc: "5 caption IG/TikTok + hashtag", prompt: "Buatkan 5 caption Instagram/TikTok untuk promo [nama produk] (harga [harga], promo [isi promo]). Target pembeli [target]. Gaya santai, ada ajakan beli, plus hashtag lokal." },
      { title: "Pesan WA blast", desc: "Pesan promo ke pelanggan", prompt: "Buatkan 3 versi pesan WhatsApp blast untuk pelanggan lama tentang [promo/produk baru]. Singkat, ramah, tidak terkesan spam, ada tombol ajakan (balas/klik link [link])." },
      { title: "Deskripsi produk marketplace", desc: "Shopee/Tokopedia, ramah SEO", prompt: "Buatkan judul & deskripsi produk Shopee/Tokopedia untuk [nama produk]: bahan [bahan], ukuran [ukuran], keunggulan [keunggulan]. Pakai kata kunci yang sering dicari, poin-poin jelas, dan FAQ singkat." },
      { title: "Foto Produk Studio", desc: "Foto HP jadi foto katalog", prompt: "Ubah foto produk yang saya lampirkan jadi foto katalog [studio putih/lifestyle/flatlay] untuk [marketplace/iklan], 2 variasi." },
      { title: "Poster promo", desc: "Poster feed/story siap posting", prompt: "Buatkan poster promo [isi promo, mis. Beli 2 Gratis 1] untuk [nama usaha], berlaku [tanggal], format [4:5 feed / 9:16 story], gaya [ceria/elegan]." },
      { title: "Balas komplain pelanggan", desc: "Jawaban sopan yang menenangkan", prompt: "Bantu saya membalas komplain pelanggan ini dengan sopan dan solutif: \"[tempel komplain]\". Tawarkan solusi [refund/tukar/diskon]." },
    ],
  },
  {
    id: "officer",
    label: "Marketing Officer",
    roles: ["marketing_pro", "student", "other"],
    items: [
      { title: "Laporan bulanan (PPT)", desc: "Dari data Excel/CSV terlampir", prompt: "Buatkan PPT laporan kinerja marketing bulan [bulan] dari data terlampir: ringkasan eksekutif, KPI vs target, grafik tren, insight, dan rencana bulan depan. Audiens: [atasan/direksi]." },
      { title: "Kalender konten 1 bulan", desc: "Ide posting per hari", prompt: "Buatkan kalender konten [Instagram/TikTok] 1 bulan untuk [brand] dengan pilar konten [edukasi/promo/engagement], lengkap hook, format, dan CTA tiap posting." },
      { title: "Carousel edukasi", desc: "Carousel IG 6–8 slide", prompt: "Buatkan carousel Instagram 7 slide tentang [topik] untuk [brand], target [audiens]. Hook kuat di slide 1, tips praktis, dan CTA simpan & follow." },
      { title: "Copy iklan (A/B)", desc: "Meta/TikTok Ads 3 versi", prompt: "Buatkan 3 versi copy iklan [Meta/TikTok] Ads untuk [produk] dengan angle berbeda (masalah, manfaat, bukti sosial). Sertakan headline, primary text, dan CTA." },
      { title: "Analisis kompetitor", desc: "Dengan riset web & sumber", prompt: "Riset dan bandingkan [brand kami] dengan kompetitor [kompetitor 1, 2, 3]: harga, positioning, channel, konten yang berhasil, dan peluang yang bisa kami ambil.", research: true },
      { title: "Brief untuk desainer/agency", desc: "Brief kampanye yang jelas", prompt: "Buatkan creative brief untuk kampanye [nama kampanye]: tujuan, target audiens, pesan utama, mandatories, deliverables [daftar], timeline [tanggal], dan budget [nominal]." },
    ],
  },
  {
    id: "agency",
    label: "Agency",
    roles: [],
    items: [
      { title: "Pitch deck klien baru", desc: "Deck agency untuk pitching", prompt: "Buatkan pitch deck untuk calon klien [nama klien, industri]: pemahaman masalah, insight, big idea, strategi channel, contoh eksekusi, timeline, dan investasi [range budget]." },
      { title: "Proposal kampanye", desc: "Strategi + estimasi budget", prompt: "Susun proposal kampanye [tujuan kampanye] untuk [klien] selama [durasi]: strategi, rencana konten, media plan, KPI, dan rincian estimasi biaya total [budget]." },
      { title: "Laporan bulanan klien", desc: "PPT hasil kampanye", prompt: "Buatkan PPT laporan bulanan untuk klien [nama klien] dari data terlampir: highlight, performa per channel, konten terbaik, pembelajaran, dan rekomendasi bulan depan." },
      { title: "3 big idea kreatif", desc: "Alternatif konsep kampanye", prompt: "Berikan 3 alternatif big idea kampanye untuk [brand/produk] dengan tujuan [tujuan]. Tiap ide: nama konsep, insight, tagline, contoh eksekusi di [channel], dan kenapa akan berhasil." },
      { title: "Moodboard visual", desc: "Arah visual dalam carousel", prompt: "Buatkan moodboard visual untuk kampanye [nama kampanye] brand [brand]: arah warna, gaya foto, tipografi, dan contoh visual, dalam bentuk carousel 6 slide format 4:5." },
      { title: "Media plan & KPI", desc: "Alokasi budget per channel", prompt: "Susun media plan [durasi] untuk [klien] dengan budget [nominal]: alokasi per channel, estimasi reach/CPM/CPA, KPI, dan jadwal, dalam bentuk tabel." },
    ],
  },
  {
    id: "freelancer",
    label: "Freelancer",
    roles: ["freelancer"],
    items: [
      { title: "Proposal penawaran jasa", desc: "Proposal singkat yang meyakinkan", prompt: "Buatkan proposal penawaran jasa [jenis jasa] untuk [calon klien]: pemahaman kebutuhan, ruang lingkup, timeline, harga [harga/paket], dan langkah selanjutnya." },
      { title: "Brief klien jadi checklist", desc: "Rapikan brief yang berantakan", prompt: "Rapikan brief klien berikut jadi checklist kerja yang jelas (deliverables, deadline, pertanyaan yang perlu dikonfirmasi): \"[tempel brief]\"." },
      { title: "Case study portofolio", desc: "Carousel studi kasus", prompt: "Buatkan carousel case study 6 slide untuk portofolio saya: proyek [nama proyek] untuk [klien], masalah, solusi, hasil [angka hasil], dan CTA hubungi saya." },
      { title: "Hitung harga jasa", desc: "Rate card yang masuk akal", prompt: "Bantu saya menyusun rate card jasa [jenis jasa] untuk pasar [lokasi/segmen]: paket dasar–premium, apa saja yang termasuk, dan alasan harganya." },
      { title: "Email follow-up klien", desc: "Tagih jawaban / pembayaran dengan sopan", prompt: "Buatkan email follow-up yang sopan tapi tegas ke klien [nama] tentang [penawaran/invoice yang belum dibalas] sejak [tanggal]." },
      { title: "Personal branding LinkedIn", desc: "5 ide posting + 1 draft", prompt: "Berikan 5 ide posting LinkedIn untuk personal branding saya sebagai [profesi] dan tuliskan 1 draft posting lengkap tentang [topik]." },
    ],
  },
];

/** Grup bawaan sesuai peran user (onboarding). */
export function groupForRole(role: string | null | undefined) {
  return TEMPLATE_GROUPS.find((g) => role && g.roles.includes(role))?.id ?? "umkm";
}
