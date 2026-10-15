/**
 * Katalog add-on "Tools Pro" (teks UI). Harga & kuota disimpan di tabel `addons` (bisa diubah di back office).
 * Aman dipakai di server maupun client.
 */

export type AddonId =
  | "strategi_pro"
  | "riset_pro"
  | "konten_pro"
  | "dokter_iklan"
  | "jualan_kit"
  | "crm_pro"
  | "kolpr_pro"
  | "laporan_pro";

export type ToolId =
  // Strategi & Brand
  | "plan"
  | "brand"
  | "campaign"
  | "gtm"
  // Market Research
  | "sizing"
  | "persona"
  | "competitor"
  | "entry"
  | "survey"
  // Konten & Sosmed
  | "calendar"
  | "script"
  | "audit"
  // Iklan & Performance
  | "adcopy"
  | "ads"
  | "calc"
  // Jualan Online
  | "listing"
  | "live"
  | "promo"
  // CRM & Retensi
  | "whatsapp"
  | "flow"
  | "loyalty"
  // KOL & PR
  | "kol"
  | "kolreport"
  | "press"
  // Laporan
  | "report";

export interface AddonInfo {
  id: AddonId;
  name: string;
  /** Nama kelompok di menu sidebar (per role marketing). */
  menu: string;
  emoji: string;
  tagline: string;
  /** Untuk role siapa add-on ini. */
  role: string;
  /** Harga & kuota bawaan (cadangan bila DB tidak terbaca). */
  price: number;
  quota: number;
  tools: ToolId[];
}

export interface ToolInfo {
  id: ToolId;
  addon: AddonId;
  name: string;
  /** Nama pendek untuk submenu sidebar. */
  menu: string;
  short: string;
  /** Hasil yang didapat user — ditampilkan di kartu tool. */
  outputs: string[];
  /** Tool tanpa AI (kalkulator) tidak memotong kuota. */
  noQuota?: boolean;
  /** Perkiraan lama proses (detik) untuk tampilan progres. */
  seconds?: number;
}

/** Urutan = urutan menu "Tools Pro" di sidebar & halaman Tools Pro (per role marketing). */
export const ADDONS: AddonInfo[] = [
  {
    id: "strategi_pro",
    name: "Strategi & Brand",
    menu: "Strategi & Brand",
    emoji: "🎯",
    tagline: "Marketing plan, brand guideline, campaign brief & rencana peluncuran produk",
    role: "Owner, Marketing Manager, Brand Manager",
    price: 75000,
    quota: 6,
    tools: ["plan", "brand", "campaign", "gtm"],
  },
  {
    id: "riset_pro",
    name: "Market Research Pro",
    menu: "Market Research",
    emoji: "🔎",
    tagline: "Riset pasar ala konsultan: ukuran pasar, persona, kompetitor, kelayakan & survei",
    role: "Market Research, Strategy, Owner",
    price: 50000,
    quota: 6,
    tools: ["sizing", "persona", "competitor", "entry", "survey"],
  },
  {
    id: "konten_pro",
    name: "Konten & Sosmed",
    menu: "Konten & Sosmed",
    emoji: "✍️",
    tagline: "Kalender konten bulanan, naskah video pendek & audit akun media sosial",
    role: "Content Strategist, Social Media Specialist, Copywriter",
    price: 50000,
    quota: 15,
    tools: ["calendar", "script", "audit"],
  },
  {
    id: "dokter_iklan",
    name: "Iklan & Performance",
    menu: "Iklan & Performance",
    emoji: "📊",
    tagline: "Bikin variasi iklan siap tayang, rapor laporan iklan & kalkulator bisnis",
    role: "Performance Marketer, Ads Specialist",
    price: 50000,
    quota: 10,
    tools: ["adcopy", "ads", "calc"],
  },
  {
    id: "jualan_kit",
    name: "Jualan Online",
    menu: "Jualan Online",
    emoji: "🛒",
    tagline: "Listing marketplace, skrip live selling & kalender promo marketplace",
    role: "E-commerce / Marketplace Specialist, Seller",
    price: 30000,
    quota: 15,
    tools: ["listing", "live", "promo"],
  },
  {
    id: "crm_pro",
    name: "CRM & Retensi",
    menu: "CRM & Retensi",
    emoji: "💬",
    tagline: "Template WhatsApp, alur follow-up otomatis & program pelanggan setia",
    role: "CRM, Customer Service, Owner",
    price: 30000,
    quota: 10,
    tools: ["whatsapp", "flow", "loyalty"],
  },
  {
    id: "kolpr_pro",
    name: "KOL & PR",
    menu: "KOL & PR",
    emoji: "🤝",
    tagline: "Brief KOL, laporan performa KOL & siaran pers",
    role: "KOL / Affiliate Specialist, PR & Komunikasi",
    price: 50000,
    quota: 10,
    tools: ["kol", "kolreport", "press"],
  },
  {
    id: "laporan_pro",
    name: "Laporan Marketing",
    menu: "Laporan",
    emoji: "📈",
    tagline: "Laporan marketing bulanan siap presentasi ke atasan atau klien",
    role: "Marketing Manager, Analyst, Agency",
    price: 50000,
    quota: 8,
    tools: ["report"],
  },
];

export const TOOLS: ToolInfo[] = [
  // ------------------------------------------------ Strategi & Brand
  {
    id: "plan",
    addon: "strategi_pro",
    name: "Marketing Plan",
    menu: "Marketing Plan",
    short: "Rencana marketing 3–12 bulan: tujuan & KPI, target pasar, strategi per kanal, kalender aktivitas, dan alokasi budget.",
    outputs: ["Ringkasan eksekutif", "Tujuan & KPI", "Strategi per kanal", "Roadmap & kalender", "Alokasi budget", "PPT presentasi", "Excel budget"],
    seconds: 90,
  },
  {
    id: "brand",
    addon: "strategi_pro",
    name: "Brand Guideline",
    menu: "Brand Guideline",
    short: "Fondasi brand: positioning, brand promise, kepribadian, tone of voice, pesan kunci, panduan visual & do/don't.",
    outputs: ["Positioning & brand promise", "Tone of voice + contoh", "Pesan kunci", "Panduan visual", "PPT brand book"],
    seconds: 80,
  },
  {
    id: "campaign",
    addon: "strategi_pro",
    name: "Campaign Brief",
    menu: "Campaign Brief",
    short: "Brief kampanye siap kirim ke tim kreatif/agency: insight, big idea, pesan, deliverables, timeline, budget & KPI.",
    outputs: ["Insight & big idea", "Pesan & tagline", "Daftar deliverables", "Timeline", "Budget & KPI", "PPT brief"],
    seconds: 80,
  },
  {
    id: "gtm",
    addon: "strategi_pro",
    name: "Rencana Peluncuran Produk",
    menu: "Peluncuran Produk",
    short: "Go-to-market produk baru: segmen sasaran, positioning, harga, kanal, fase pre-launch → launch → post-launch.",
    outputs: ["Positioning & value proposition", "Strategi harga", "Fase peluncuran", "Checklist tim", "PPT GTM", "Excel timeline"],
    seconds: 90,
  },
  // ------------------------------------------------ Market Research
  {
    id: "sizing",
    addon: "riset_pro",
    name: "Ukuran & Tren Pasar",
    menu: "Ukuran & Tren Pasar",
    short: "Hitung TAM/SAM/SOM dengan riset web, proyeksi 5 tahun, tren & analisis PESTEL.",
    outputs: ["TAM/SAM/SOM + cara hitung", "Proyeksi 3 skenario", "Tren & PESTEL", "Sumber riset", "PPT laporan", "Excel model"],
    seconds: 150,
  },
  {
    id: "persona",
    addon: "riset_pro",
    name: "Segmentasi & Persona Konsumen",
    menu: "Persona Konsumen",
    short: "Segmen pasar paling menarik, persona pembeli, customer journey & insight perilaku konsumen.",
    outputs: ["Peta segmen", "Kartu persona", "Customer journey", "Faktor keputusan beli", "PPT laporan", "Excel"],
    seconds: 150,
  },
  {
    id: "competitor",
    addon: "riset_pro",
    name: "Riset Kompetitor",
    menu: "Riset Kompetitor",
    short: "Riset web otomatis: harga, keunggulan, peta posisi, SWOT & celah konten.",
    outputs: ["Tabel perbandingan", "Peta posisi brand", "SWOT", "Sumber riset", "PPT laporan", "Excel"],
    seconds: 120,
  },
  {
    id: "entry",
    addon: "riset_pro",
    name: "Kelayakan & Strategi Masuk Pasar",
    menu: "Studi Kelayakan",
    short: "Studi kelayakan: skor go/no-go, Porter's 5 Forces, izin & risiko, strategi harga & rencana 90 hari.",
    outputs: ["Skor kelayakan", "Porter's 5 Forces", "Izin & regulasi", "Peta risiko", "Rencana 90 hari", "PPT laporan", "Excel"],
    seconds: 150,
  },
  {
    id: "survey",
    addon: "riset_pro",
    name: "Desain Survei & Kuesioner",
    menu: "Desain Survei",
    short: "Kuesioner siap sebar ala lembaga riset + jumlah responden, screener & rencana analisis.",
    outputs: ["Kuesioner lengkap", "Hitung jumlah responden", "Screener", "Rencana analisis", "Excel siap Google Form"],
    seconds: 60,
  },
  // ------------------------------------------------ Konten & Sosmed
  {
    id: "calendar",
    addon: "konten_pro",
    name: "Kalender Konten Bulanan",
    menu: "Kalender Konten",
    short: "Pilar konten + jadwal posting 1 bulan per platform lengkap dengan hook, caption, format, CTA & hashtag.",
    outputs: ["Pilar & mix konten", "Kalender per tanggal", "Caption siap posting", "Momen & tanggal penting", "Excel kalender", "PPT ringkasan"],
    seconds: 90,
  },
  {
    id: "script",
    addon: "konten_pro",
    name: "Naskah Video Pendek",
    menu: "Naskah Video",
    short: "Naskah Reels/TikTok/Shorts per detik: hook 3 detik, adegan, teks layar, voice over, CTA & arahan syuting.",
    outputs: ["3–5 naskah per adegan", "Variasi hook", "Shot list", "Caption & hashtag", "Excel naskah"],
    seconds: 60,
  },
  {
    id: "audit",
    addon: "konten_pro",
    name: "Audit Akun Sosmed",
    menu: "Audit Akun Sosmed",
    short: "Nilai akun Instagram/TikTok: bio, konsistensi, pilar, performa konten, lalu rencana perbaikan 30 hari.",
    outputs: ["Skor per aspek", "Temuan & bukti", "Perbaikan bio & highlight", "Rencana 30 hari", "PPT audit"],
    seconds: 90,
  },
  // ------------------------------------------------ Iklan & Performance
  {
    id: "adcopy",
    addon: "dokter_iklan",
    name: "Pembuat Variasi Iklan",
    menu: "Variasi Iklan",
    short: "Konsep & copy iklan siap tayang untuk Meta/TikTok/Google: angle berbeda, headline, primary text, visual & struktur tes A/B.",
    outputs: ["6–10 variasi iklan", "Angle & audiens", "Arahan visual", "Rencana tes A/B", "Excel siap upload"],
    seconds: 70,
  },
  {
    id: "ads",
    addon: "dokter_iklan",
    name: "Analis Laporan Iklan",
    menu: "Analis Laporan Iklan",
    short: "Upload laporan Meta/TikTok/Shopee Ads → rapor, iklan boros vs bagus, budget baru.",
    outputs: ["Skor kesehatan & grafik", "Rapor per kampanye", "Usulan budget", "PPT laporan", "Excel bertanda warna"],
    seconds: 60,
  },
  {
    id: "calc",
    addon: "dokter_iklan",
    name: "Kalkulator Bisnis",
    menu: "Kalkulator Bisnis",
    short: "Harga jual dari HPP, ROAS impas, dan budget iklan untuk target omzet.",
    outputs: ["Hitung instan", "Tanpa memotong kuota"],
    noQuota: true,
  },
  // ------------------------------------------------ Jualan Online
  {
    id: "listing",
    addon: "jualan_kit",
    name: "Optimasi Listing Marketplace",
    menu: "Optimasi Listing",
    short: "Judul, deskripsi & kata kunci produk untuk Shopee, TikTok Shop, Tokopedia.",
    outputs: ["Judul & deskripsi per platform", "Tabel kata kunci berprioritas", "Sebelum vs sesudah", "Excel"],
    seconds: 50,
  },
  {
    id: "live",
    addon: "jualan_kit",
    name: "Skrip Live Selling",
    menu: "Skrip Live Selling",
    short: "Rundown live berwaktu + kalimat host, flash sale & jawaban keberatan pembeli.",
    outputs: ["Rundown per menit", "Mode contekan host", "PPT contekan", "Excel rundown"],
    seconds: 60,
  },
  {
    id: "promo",
    addon: "jualan_kit",
    name: "Kalender Promo Marketplace",
    menu: "Kalender Promo",
    short: "Rencana promo 1–3 bulan mengikuti tanggal kembar, payday & musim belanja: mekanisme, voucher, target & persiapan stok.",
    outputs: ["Kalender campaign", "Mekanisme & voucher", "Hitung margin promo", "Checklist persiapan", "Excel kalender"],
    seconds: 70,
  },
  // ------------------------------------------------ CRM & Retensi
  {
    id: "whatsapp",
    addon: "crm_pro",
    name: "Template WhatsApp",
    menu: "Template WhatsApp",
    short: "Pesan broadcast, follow-up & balasan cepat yang siap kirim.",
    outputs: ["Pratinjau gelembung WA", "Tombol salin", "Excel template"],
    seconds: 50,
  },
  {
    id: "flow",
    addon: "crm_pro",
    name: "Alur Follow-up Otomatis",
    menu: "Alur Follow-up",
    short: "Urutan pesan WA/email dari pertama chat sampai repeat order: pemicu, jeda waktu, isi pesan & cara mengukurnya.",
    outputs: ["Peta alur pelanggan", "Pesan per tahap", "Jadwal kirim", "Target konversi", "Excel alur"],
    seconds: 70,
  },
  {
    id: "loyalty",
    addon: "crm_pro",
    name: "Program Pelanggan Setia",
    menu: "Program Loyalty",
    short: "Desain program member/poin/tier yang tetap untung: aturan, hadiah, hitungan biaya, materi komunikasi & KPI.",
    outputs: ["Mekanisme & tier", "Hitung biaya vs untung", "Materi pengumuman", "Rencana peluncuran", "Excel kalkulasi"],
    seconds: 70,
  },
  // ------------------------------------------------ KOL & PR
  {
    id: "kol",
    addon: "kolpr_pro",
    name: "Brief KOL / Affiliate",
    menu: "Brief KOL",
    short: "Brief kreator siap kirim + estimasi fee & pesan DM ajakan kerja sama.",
    outputs: ["Dokumen brief", "Estimasi fee", "Template DM", "PPT brief"],
    seconds: 60,
  },
  {
    id: "kolreport",
    addon: "kolpr_pro",
    name: "Laporan Performa KOL",
    menu: "Laporan KOL",
    short: "Upload/isi data hasil kreator → peringkat KOL, biaya per hasil, mana yang lanjut, mana yang distop.",
    outputs: ["Peringkat kreator", "CPM/CPE/biaya per order", "Rekomendasi lanjut/stop", "PPT laporan", "Excel bertanda warna"],
    seconds: 70,
  },
  {
    id: "press",
    addon: "kolpr_pro",
    name: "Siaran Pers",
    menu: "Siaran Pers",
    short: "Press release format standar media + judul alternatif, kutipan narasumber, daftar media sasaran & email pitching.",
    outputs: ["Press release siap kirim", "Variasi judul", "Email pitching", "Daftar media sasaran", "Q&A wartawan"],
    seconds: 60,
  },
  // ------------------------------------------------ Laporan
  {
    id: "report",
    addon: "laporan_pro",
    name: "Laporan Marketing Bulanan",
    menu: "Laporan Bulanan",
    short: "Upload data bulan ini (iklan, sosmed, penjualan) → laporan siap presentasi: ringkasan, KPI vs target, analisis & rencana bulan depan.",
    outputs: ["Ringkasan eksekutif", "KPI vs target", "Analisis per kanal", "Rencana bulan depan", "PPT siap presentasi", "Excel data"],
    seconds: 90,
  },
];

export const toolInfo = (id: string) => TOOLS.find((t) => t.id === id);
export const addonInfo = (id: string) => ADDONS.find((a) => a.id === id);

/** Kelompok submenu "Tools Pro" di sidebar (per role marketing). */
export const MENU_GROUPS = ADDONS.map((a) => ({ addon: a.id, label: a.menu }));
