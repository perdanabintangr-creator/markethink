/** Contoh hasil AI untuk tiap tool (dipakai tes pembuatan file & pratinjau tampilan). */

const long = (s: string, n: number) => (s + " ").repeat(Math.ceil(n / (s.length + 1))).slice(0, n);

export const listingFixture = {
  summary: "Fokuskan judul pada 'kopi susu gula aren literan' — kata kunci dengan volume tertinggi — dan tonjolkan tanpa pengawet.",
  keywords: [
    { keyword: "kopi susu gula aren", type: "utama", priority: 5, where: "judul" },
    { keyword: "kopi literan", type: "utama", priority: 5, where: "judul" },
    { keyword: "kopi susu 1 liter", type: "turunan", priority: 4, where: "judul & deskripsi" },
    { keyword: "kopi susu kekinian", type: "turunan", priority: 3, where: "deskripsi" },
    { keyword: "kopi tanpa pengawet", type: "long-tail", priority: 3, where: "deskripsi" },
    { keyword: "oleh oleh kopi", type: "long-tail", priority: 2, where: "tag" },
  ],
  listings: [
    {
      platform: "shopee",
      title: "Kopi Susu Gula Aren Literan 1 Liter Tanpa Pengawet Fresh Setiap Hari Original Less Sugar",
      title_reason: "Kata kunci utama di depan, varian di belakang.",
      description: "☕ Kopi susu gula aren literan favorit!\n\n✅ Gula aren asli\n✅ Tanpa pengawet\n\nIsi: 1 liter. Simpan di kulkas tahan 5 hari.",
      highlights: ["Gula aren asli", "Tanpa pengawet", "Fresh dibuat harian"],
      hashtags: [],
    },
    {
      platform: "tiktok",
      title: "Kopi Susu Gula Aren 1 Liter — fresh, tanpa pengawet, buat stok seminggu!",
      title_reason: "Gaya santai khas TikTok Shop.",
      description: long("Deskripsi panjang kopi susu", 1200),
      highlights: ["Hemat", "Praktis", "Enak"],
      hashtags: ["#kopisusu", "#kopiliteran", "#fyp"],
    },
  ],
  before_after: { before: "kopi susu 1L", after: "Kopi Susu Gula Aren Literan 1 Liter Tanpa Pengawet", improvements: ["Ada kata kunci utama", "Lebih spesifik"] },
  photo_tips: ["Foto utama latar putih", "Tampilkan ukuran botol", "Infografis manfaat"],
  price_tips: ["Bundling 2 botol hemat 10%"],
};

export const liveFixture = {
  title: "Live Kopi Susu Malam Jumat",
  opening_hooks: ["Stop scroll! Kopi 1 liter cuma 45 ribu malam ini!", "Siapa yang tiap pagi ngantuk? Sini merapat!", "Flash sale jam 8 tepat!"],
  segments: Array.from({ length: 8 }, (_, i) => ({
    start_min: i * 8,
    end_min: i * 8 + 8,
    name: `Segmen ${i + 1} ${i === 0 ? "Pembuka & sapa penonton baru yang baru masuk ke live" : ""}`,
    goal: "Menahan penonton dan menjelaskan produk",
    script: long("Halo kak selamat datang di live kita! Kopi susu gula aren literan ini dibuat fresh setiap hari.", 600),
    actions: ["Tunjukkan botol", "Pin komentar"],
    cta: "Klik keranjang kuning sekarang ya kak!",
  })),
  flash_sales: [{ at_min: 20, offer: "Diskon 30% 10 menit", script: "Flash sale dimulai!" }],
  objections: Array.from({ length: 6 }, (_, i) => ({ objection: `Keberatan nomor ${i + 1} yang cukup panjang dari pembeli`, answer: long("Jawaban host yang meyakinkan", 300) })),
  closing_lines: ["Terima kasih sudah nonton!", "Sampai jumpa besok jam 8!"],
  tips: ["Pencahayaan dari depan", "Pin komentar promo", "Sapa nama penonton"],
};

export const whatsappFixture = {
  messages: [
    { category: "broadcast_promo", title: "Promo payday", text: "Halo {nama}! 🎉 *Payday sale* diskon 20% sampai 28 Sept. Cek di {link}\n\nBalas STOP untuk berhenti.", when: "Tanggal 25 pagi", tip: "Kirim ke pelanggan aktif" },
    { category: "follow_up", title: "Follow-up", text: "Hai {nama}, masih minat {produk}? _Stok tinggal sedikit_ ya kak.", when: "1 hari setelah tanya", tip: "Personal" },
    { category: "faq", title: "Ongkir", text: "Ongkir mulai Rp9rb kak, pakai voucher gratis ongkir ya!", when: "Saat ditanya", tip: "Simpan di quick reply" },
  ],
  broadcast_tips: ["Maks 2 broadcast/minggu", "Gunakan daftar siaran", "Sertakan opsi berhenti"],
};

export const adsFixture = {
  headline: "Dua kampanye menghabiskan 60% budget dengan ROAS di bawah impas — pindahkan ke kampanye retargeting.",
  score: 58,
  verdict: "perlu_perhatian",
  result_label: "Pembelian",
  totals: { spend: 12500000, revenue: 31250000, results: 410, roas: 2.5, cpa: 30487, ctr: 1.4 },
  campaigns: Array.from({ length: 9 }, (_, i) => ({
    name: `Kampanye ${["Prospek Lookalike", "Retargeting 7 Hari", "Video Views", "Katalog Dinamis", "Promo Payday"][i % 5]} ${i + 1}`,
    spend: 3000000 - i * 250000,
    results: 40 + i * 5,
    revenue: 9000000 - i * 500000,
    cpa: 30000 + i * 1000,
    roas: 3 - i * 0.2,
    ctr: 1.2 + i * 0.1,
    status: (["bagus", "perhatian", "boros"] as const)[i % 3],
    diagnosis: long("Biaya per pembelian naik karena frekuensi tinggi", 200),
    action: "Ganti kreatif & batasi frekuensi",
  })),
  wins: ["Retargeting ROAS 4,2x"],
  problems: ["Prospek boros", "Kreatif lelah"],
  budget_plan: [
    { name: "Retargeting", current_share: 20, recommended_share: 40, reason: "ROAS tertinggi" },
    { name: "Prospek", current_share: 60, recommended_share: 40, reason: "Turunkan sampai kreatif baru" },
    { name: "Video", current_share: 20, recommended_share: 20, reason: "Pertahankan" },
  ],
  next_steps: [
    { step: "Matikan 2 iklan dengan CPA > Rp45rb", impact: "tinggi" },
    { step: "Buat 3 kreatif baru", impact: "sedang" },
  ],
  data_notes: "Periode 1-30 September, mata uang Rupiah.",
};

export const competitorFixture = {
  summary: "Pasar kopi literan dikuasai pemain dengan harga Rp40-60rb; celah ada di konten edukasi & varian rendah gula.",
  competitors: [
    { name: "Kopi Kenangan", price_range: "Rp45–65rb/liter", positioning: "Kopi susu kekinian terjangkau", target: "Pekerja muda", strengths: ["Brand kuat", "Gerai banyak"], weaknesses: ["Rasa standar"], channels: ["GoFood", "Shopee"], content_style: "Promo & meme", price_score: 5, quality_score: 8 },
    { name: "Fore Coffee", price_range: "Rp55–75rb", positioning: "Kopi spesialti", target: "Profesional", strengths: ["Kualitas biji"], weaknesses: ["Harga lebih mahal"], channels: ["App"], content_style: "Estetik", price_score: 7, quality_score: 8 },
    { name: "Tuku", price_range: "Rp40–55rb", positioning: "Kopi tetangga", target: "Lokal", strengths: ["Loyal"], weaknesses: ["Distribusi"], channels: ["Gerai"], content_style: "Hangat", price_score: 4, quality_score: 7 },
  ],
  our_position: { price_score: 4, quality_score: 6, note: "Harga bersaing, brand masih dibangun." },
  swot: { strengths: ["Gula aren asli", "Harga"], weaknesses: ["Brand baru", "Distribusi"], opportunities: ["Konten edukasi", "Bundling kantor"], threats: ["Perang harga", "Promo agregator"] },
  content_gaps: [
    { gap: "Edukasi gula aren", idea: "Seri 'beda gula aren vs gula biasa'", format: "TikTok" },
    { gap: "Behind the scene", idea: "Proses pembuatan harian", format: "Reels" },
    { gap: "Kopi untuk kantor", idea: "Paket langganan kantor", format: "Carousel" },
  ],
  recommendations: [
    { title: "Kuasai niche rendah gula", detail: "Luncurkan varian less sugar", priority: "tinggi" },
    { title: "Konten edukasi", detail: "3 konten/minggu", priority: "sedang" },
    { title: "B2B kantor", detail: "Langganan mingguan", priority: "sedang" },
  ],
  sources: [{ title: "Contoh sumber", url: "https://example.com" }],
};

export const kolFixture = {
  campaign_name: "Pagi Lebih Semangat bareng Kopi Senja",
  objective: "Meningkatkan penjualan lewat affiliate TikTok",
  key_message: "Kopi literan gula aren asli, stok seminggu, tanpa pengawet.",
  audience: "Pekerja 22-35 tahun di kota besar",
  deliverables: [{ format: "Video TikTok 30-60 detik", qty: 2, specs: "Unboxing + rasa + CTA keranjang kuning" }],
  talking_points: ["Gula aren asli", "Tanpa pengawet", "Hemat dibanding beli per cup"],
  dos: ["Tunjukkan botol", "Sebut promo", "Pakai #ad"],
  donts: ["Sebut kompetitor", "Klaim medis", "Edit berlebihan"],
  hashtags: ["#kopisenja", "#kopiliteran"],
  cta: "Checkout lewat keranjang kuning",
  timeline: [
    { when: "Minggu 1", task: "Brief & kirim produk" },
    { when: "Minggu 2", task: "Draft & revisi" },
    { when: "Minggu 3", task: "Tayang" },
  ],
  kpis: [
    { metric: "Views", target: "500rb" },
    { metric: "Penjualan", target: "300 botol" },
    { metric: "ROAS", target: "3x" },
  ],
  fee_estimate: {
    rows: [
      { tier: "Nano", followers: "1rb–10rb", fee_min: 150000, fee_max: 500000, qty: 3 },
      { tier: "Micro", followers: "10rb–100rb", fee_min: 750000, fee_max: 2500000, qty: 2 },
    ],
    total_min: 1950000,
    total_max: 6500000,
    note: "Estimasi pasar, sesuaikan rate card.",
  },
  dm_template: "Halo kak {nama_kreator}! Kami dari Kopi Senja ingin mengajak kolaborasi…",
  contract_points: ["Hak pakai konten 3 bulan", "Pembayaran 50% di muka", "Maks 2 revisi"],
};

// ---------------------------------------------------------------- Market Research

const rec = (title: string, priority: "tinggi" | "sedang" | "rendah" = "tinggi") => ({ title, detail: long("Detail langkah yang bisa langsung dieksekusi tim", 200), priority });

export const sizingFixture = {
  summary: "Pasar kopi siap minum di Jabodetabek bernilai ±Rp9,6 triliun dan tumbuh 12%/tahun; kanal online tumbuh tercepat.",
  market_definition: "Kopi susu siap minum (RTD & literan) untuk konsumen 18-40 tahun.",
  tam: { value_idr: 9_600_000_000_000, buyers: "16 juta peminum kopi", definition: "Semua penjualan kopi siap minum di Jabodetabek", formula: "16 jt × 50 gelas/thn × Rp12rb" },
  sam: { value_idr: 1_200_000_000_000, buyers: "2 juta pembeli online", definition: "Kopi literan dibeli online", formula: "2 jt × 13 liter/thn × Rp45rb" },
  som: { value_idr: 12_000_000_000, buyers: "20 ribu pelanggan", definition: "1% SAM dalam 3 tahun", formula: "1% × SAM" },
  bottom_up: [
    { step: "Penduduk 18-40 th Jabodetabek", value: "14 juta", source: "BPS 2025" },
    { step: "Peminum kopi rutin", value: "45%", source: "Survei Jakpat" },
    { step: "Beli kopi literan online", value: "30%", source: "Asumsi" },
    { step: "Belanja per tahun", value: "Rp585rb", source: "13 liter × Rp45rb" },
  ],
  cagr_pct: 12,
  projection: [2026, 2027, 2028, 2029, 2030].map((year, i) => ({
    year,
    conservative: 1.2e12 * 1.08 ** i,
    base: 1.2e12 * 1.12 ** i,
    optimistic: 1.2e12 * 1.17 ** i,
  })),
  lifecycle: "pertumbuhan",
  lifecycle_note: "Pemain baru masih bisa masuk lewat diferensiasi rasa & kanal.",
  channels: [
    { channel: "Marketplace", share_pct: 40 },
    { channel: "Social commerce", share_pct: 25 },
    { channel: "Gerai", share_pct: 35 },
  ],
  trends: [
    { title: "Gula rendah", detail: "Konsumen makin peduli kadar gula.", impact: "peluang" },
    { title: "Perang harga", detail: "Brand besar agresif promo.", impact: "ancaman" },
  ],
  pestel: [
    { factor: "politik", point: "Rencana cukai minuman berpemanis.", impact: "negatif" },
    { factor: "ekonomi", point: "Daya beli kelas menengah tertekan.", impact: "negatif" },
    { factor: "sosial", point: "Budaya ngopi di rumah meningkat.", impact: "positif" },
    { factor: "teknologi", point: "Live shopping mendorong penjualan.", impact: "positif" },
    { factor: "lingkungan", point: "Tuntutan kemasan ramah lingkungan.", impact: "netral" },
    { factor: "hukum", point: "Wajib PIRT/BPOM & halal.", impact: "netral" },
  ],
  drivers: ["Kebiasaan ngopi harian", "Pertumbuhan e-commerce"],
  barriers: ["Umur simpan pendek", "Ongkir rantai dingin"],
  recommendations: [rec("Fokus varian gula aren rendah gula"), rec("Masuk TikTok Shop dulu", "sedang"), rec("Bundling langganan mingguan", "rendah")],
  confidence: "sedang",
  data_gaps: ["Validasi frekuensi beli lewat survei 200 responden"],
};

export const personaFixture = {
  summary: "Dua segmen utama: pekerja kantoran praktis dan ibu muda pencari camilan keluarga.",
  segments: [
    { name: "Pekerja praktis", description: "Butuh kopi enak tanpa antre.", share_pct: 45, attractiveness: 8, ease: 7, why: "Belanja rutin" },
    { name: "Ibu muda", description: "Stok kopi di kulkas untuk keluarga.", share_pct: 30, attractiveness: 7, ease: 6, why: "Beli banyak" },
    { name: "Mahasiswa", description: "Sensitif harga.", share_pct: 25, attractiveness: 4, ease: 8, why: "Ramai tapi murah" },
  ],
  priority_segment: "Pekerja praktis — paling sering beli dan mudah dijangkau lewat TikTok.",
  personas: [
    {
      name: "Rina, Karyawati Praktis",
      segment: "Pekerja praktis",
      age: "27 tahun",
      occupation: "Staf admin",
      income: "Rp7-9 jt/bulan",
      location: "Bekasi",
      quote: "Pengennya kopi enak tapi nggak ribet antre tiap pagi.",
      goals: ["Hemat waktu pagi", "Hemat uang jajan"],
      pains: ["Antre lama", "Kopi kemanisan"],
      jobs: ["Saat berangkat kerja, saya ingin kopi siap minum, agar tetap fokus"],
      triggers: ["Promo gajian", "Review TikTok"],
      objections: ["Takut cepat basi"],
      channels: ["TikTok", "Shopee"],
      message: "Kopi kafe di kulkasmu, cukup tuang.",
    },
    {
      name: "Dewi, Ibu Muda",
      segment: "Ibu muda",
      age: "32 tahun",
      occupation: "Ibu rumah tangga",
      income: "Rp10-15 jt/bulan (RT)",
      location: "Depok",
      quote: "Kalau ada tamu enak ada stok kopi.",
      goals: ["Stok praktis"],
      pains: ["Ongkir mahal"],
      jobs: ["Saat ada tamu, saya ingin suguhan cepat, agar tidak repot"],
      triggers: ["Gratis ongkir"],
      objections: ["Harga per liter"],
      channels: ["WhatsApp", "Instagram"],
      message: "Stok kopi keluarga, hemat lebih banyak.",
    },
  ],
  journey: ["Kenal", "Pertimbangkan", "Beli", "Pakai ulang", "Rekomendasi"].map((stage) => ({
    stage,
    doing: "Melihat konten TikTok",
    thinking: "Enak nggak ya?",
    touchpoints: ["TikTok", "Shopee"],
    pain: "Ragu rasa",
    opportunity: "Tampilkan uji rasa jujur",
  })),
  drivers: [
    { factor: "Rasa", importance: 9 },
    { factor: "Harga", importance: 8 },
    { factor: "Review", importance: 7 },
  ],
  insights: [
    { insight: "Kopi literan dianggap investasi hemat", evidence: "Ulasan menyebut 'lebih hemat dari beli cup'", implication: "Komunikasikan harga per gelas" },
    { insight: "Takut basi menahan pembelian", evidence: "Pertanyaan umur simpan sering muncul", implication: "Tampilkan tanggal & cara simpan" },
  ],
  recommendations: [rec("Konten 'harga per gelas'"), rec("Garansi segar", "sedang")],
};

export const entryFixture = {
  summary: "Bisnis dimsum frozen premium layak dijalankan bertahap lewat marketplace & reseller.",
  verdict: "go_bersyarat",
  verdict_reason: "Pasar tumbuh dan margin sehat, tetapi perlu PIRT & halal sebelum skala besar.",
  scorecard: [
    { criterion: "Ukuran pasar", weight_pct: 25, score: 8, note: "Besar" },
    { criterion: "Persaingan", weight_pct: 20, score: 5, note: "Ramai" },
    { criterion: "Margin", weight_pct: 20, score: 7, note: "40%" },
    { criterion: "Kemudahan masuk", weight_pct: 15, score: 7, note: "Modal kecil" },
    { criterion: "Risiko regulasi", weight_pct: 20, score: 6, note: "Perlu izin" },
  ],
  five_forces: [
    { force: "pesaing", level: "tinggi", reasons: ["Banyak brand frozen food"] },
    { force: "pendatang_baru", level: "tinggi", reasons: ["Modal masuk rendah"] },
    { force: "produk_pengganti", level: "sedang", reasons: ["Makanan siap saji lain"] },
    { force: "kuasa_pembeli", level: "sedang", reasons: ["Mudah pindah brand"] },
    { force: "kuasa_pemasok", level: "rendah", reasons: ["Bahan mudah didapat"] },
  ],
  barriers: ["Rantai dingin", "Kepercayaan merek"],
  regulations: [
    { name: "NIB (OSS)", status: "wajib", detail: "Daftar usaha", time: "1 hari", cost: "Gratis" },
    { name: "SPP-IRT", status: "wajib", detail: "Izin pangan rumahan", time: "2-4 minggu", cost: "Gratis-Rp500rb" },
    { name: "Sertifikat halal", status: "wajib", detail: "BPJPH self-declare", time: "2-4 minggu", cost: "Gratis (SEHATI)" },
  ],
  entry_modes: [
    { mode: "Marketplace", pros: "Jangkauan luas", cons: "Persaingan harga", fit: 8 },
    { mode: "Reseller", pros: "Modal promosi kecil", cons: "Margin terbagi", fit: 7 },
    { mode: "B2B kafe", pros: "Order besar", cons: "Tempo bayar", fit: 5 },
  ],
  pricing: { strategy: "Premium terjangkau", price_range: "Rp50-60rb/pack", rationale: "Di atas brand massal, di bawah restoran." },
  unit_economics: { price: 55000, cogs: 25000, marketing: 8000, other: 7000, note: "Belum termasuk gaji pemilik." },
  capital: [
    { item: "Freezer", amount_idr: 6_000_000 },
    { item: "Bahan awal", amount_idr: 5_000_000 },
    { item: "Izin & kemasan", amount_idr: 3_000_000 },
  ],
  risks: [
    { risk: "Produk rusak saat kirim", likelihood: 3, impact: 4, mitigation: "Kemasan ice gel & kurir instan" },
    { risk: "Perang harga", likelihood: 4, impact: 3, mitigation: "Bundling & diferensiasi rasa" },
  ],
  plan: [
    { phase: "Hari 1-30", focus: "Izin & uji rasa", actions: ["Urus NIB", "Tes 50 pembeli"], kpi: "50 order" },
    { phase: "Hari 31-60", focus: "Marketplace", actions: ["Buka toko Shopee"], kpi: "200 order" },
    { phase: "Hari 61-90", focus: "Reseller", actions: ["Rekrut 10 reseller"], kpi: "500 order" },
  ],
  kpis: [{ metric: "Repeat order", target: "30%" }],
};

export const surveyFixture = {
  title: "Survei Minat Kopi Literan Gula Aren",
  intro: "Halo! Survei 10 menit ini untuk memahami kebiasaan minum kopimu. Jawaban dirahasiakan.",
  objectives: ["Mengukur minat beli", "Menentukan harga optimal"],
  hypotheses: ["Pekerja kantoran mau membayar Rp55-65rb per liter"],
  screener: [{ text: "Seberapa sering kamu minum kopi?", options: ["Setiap hari", "2-3×/minggu", "Jarang"], qualify: "Lanjut bila minimal 2-3×/minggu" }],
  quotas: [
    { group: "Pria", share_pct: 50 },
    { group: "Wanita", share_pct: 50 },
  ],
  sections: [
    {
      title: "Kebiasaan",
      purpose: "Memahami pola beli",
      questions: [
        { code: "x", text: "Di mana kamu biasa beli kopi?", type: "multi", options: ["Gerai", "Online", "Minimarket"], note: "" },
        { code: "x", text: "Seberapa besar kemungkinan kamu merekomendasikan brand kopi favoritmu?", type: "nps", options: [], note: "" },
      ],
    },
    {
      title: "Harga",
      purpose: "Van Westendorp",
      questions: [{ code: "x", text: "Di harga berapa kopi literan terasa terlalu mahal?", type: "angka", options: [], note: "" }],
    },
  ],
  analysis: [{ objective: "Harga optimal", questions: "Q3", method: "Van Westendorp", output: "Rentang harga" }],
  fieldwork: ["Sebar lewat grup WA kantor", "Tambahkan pertanyaan cek perhatian"],
  incentive: "Voucher Rp10rb untuk 50 responden terpilih",
};
