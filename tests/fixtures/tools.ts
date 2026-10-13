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
