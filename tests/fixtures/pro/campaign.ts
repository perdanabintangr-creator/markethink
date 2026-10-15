/** Contoh hasil AI untuk tool "campaign" (Campaign Brief). */
const fixture = {
  tool: "campaign",
  input: {
    brand: "Glowlab Skincare",
    objective: "launch",
    product: "Serum Niacinamide 10% 20ml Rp89rb — varian baru untuk kulit berminyak & bekas jerawat, tekstur ringan, sudah BPOM.",
    audience: "Perempuan 18-27 th, mahasiswi & first jobber, kulit berminyak, belanja skincare di TikTok Shop & Shopee",
    period: "1-30 November 2026",
    budget: "Rp60 jt total",
    channels: ["tiktok", "instagram", "kol", "tiktok_ads", "marketplace"],
    context: "Penjualan serum lama stagnan Rp40 jt/bulan; pembeli bingung bedanya dengan produk kompetitor yang lebih murah.",
    mandatory: "Wajib logo BPOM; dilarang klaim 'menghilangkan jerawat' atau membandingkan merek lain",
  },
  kinds: ["pptx", "xlsx"],
  output: {
    name: "Minyak Boleh, Kusam Jangan",
    name_note: "Mengakui kondisi kulit berminyak sebagai hal wajar, lalu fokus pada masalah yang benar-benar mengganggu: kusam & bekas jerawat.",
    background:
      "Penjualan serum Glowlab stagnan di Rp40 jt/bulan selama 4 bulan. Di TikTok Shop, serum niacinamide Rp35-60rb membanjiri pencarian, sehingga harga Rp89rb terlihat mahal tanpa alasan yang jelas.",
    problem: "Pembeli menganggap semua serum niacinamide sama, jadi memilih yang paling murah.",
    objective: "Menjual 2.500 botol serum baru dalam 30 hari dan membuat target paham kenapa formula ringan untuk kulit berminyak layak dibayar lebih.",
    kpis: [
      { metric: "Botol terjual", target: "2.500 botol", note: "TikTok Shop + Shopee, 1-30 Nov" },
      { metric: "ROAS iklan", target: "≥3x", note: "TikTok Ads Manager, dihitung mingguan" },
      { metric: "Ulasan bintang 5", target: "300 ulasan", note: "Ulasan dengan foto/video di marketplace" },
    ],
    audience: {
      profile: "Perempuan 18-27 th, mahasiswi & first jobber kota besar, kulit berminyak, belanja skincare di TikTok Shop sambil scroll malam hari.",
      current: "Membeli serum termurah yang viral, ganti-ganti produk tiap bulan karena hasilnya tidak terasa.",
      desired: "Paham bahwa formula & tekstur menentukan hasil di kulit berminyak, lalu mencoba Glowlab selama 4 minggu penuh.",
      insight: "\"Aku sudah pakai skincare rajin, tapi kulitku tetap kelihatan kusam dan berminyak di foto — jadi aku terus ganti produk, berharap yang berikutnya akhirnya cocok.\"",
    },
    proposition: "Serum ringan yang bikin kulit berminyak tetap cerah, bukan cuma kering.",
    big_idea: {
      title: "Tes Tisu 4 Minggu",
      description:
        "Kreator & pembeli menempelkan tisu minyak di wajah sebelum dan sesudah 4 minggu pemakaian, lalu membandingkan kulit di foto tanpa filter. Format ini jadi seri konten mingguan di TikTok, carousel progres di Instagram, dan template ulasan di marketplace. Live TikTok tiap Jumat menampilkan hasil tes tisu dari pembeli nyata.",
      why: "Menjawab kebiasaan ganti produk dengan bukti bertahap yang bisa dilihat sendiri, bukan janji instan.",
    },
    key_message: "Kulit berminyak itu normal. Yang bikin kusam bisa diatasi — buktikan sendiri dalam 4 minggu.",
    taglines: [
      { line: "Minyak boleh, kusam jangan", note: "Ringan, jenaka, mengakui kondisi target." },
      { line: "Buktikan di tisu", note: "Menautkan langsung ke big idea." },
      { line: "Ringan di kulit, nyata di foto", note: "Menonjolkan tekstur & hasil." },
    ],
    rtb: ["Niacinamide 10% dengan tekstur gel ringan", "Terdaftar BPOM", "Botol 20ml cukup untuk ±4 minggu pemakaian"],
    tone: { words: ["jujur", "ringan", "suportif"], note: "Bicara seperti teman yang pernah punya masalah kulit sama; tidak menakut-nakuti, tidak menjanjikan hasil instan." },
    channels: [
      { channel: "KOL TikTok", role: "Bukti sosial & jangkauan", execution: "5 mikro KOL kecantikan + 30 nano kreator membuat video Tes Tisu Minggu 1 & Minggu 4", phase: "semua", timing: "Minggu 1-4" },
      { channel: "TikTok Ads", role: "Konversi dari video KOL terbaik", execution: "Spark Ads dari 6 video KOL dengan CTR tertinggi, GMV Max untuk TikTok Shop", phase: "launch", timing: "Minggu 2-4" },
      { channel: "TikTok Shop live", role: "Penjualan & edukasi", execution: "Live 3 jam tiap Jumat 19.00 dengan voucher live Rp15rb", phase: "launch", timing: "Minggu 2-4" },
      { channel: "Instagram", role: "Edukasi & progres", execution: "Carousel 'Kenapa serum murahmu gak terasa', Reels progres mingguan", phase: "teaser", timing: "Minggu 1" },
      { channel: "Shopee", role: "Menangkap pencarian", execution: "Iklan kata kunci 'serum niacinamide kulit berminyak' + voucher toko", phase: "sustain", timing: "Minggu 3-4" },
    ],
    deliverables: [
      { item: "Video KOL Tes Tisu", qty: 35, spec: "9:16, 30-45 dtk, hook 3 detik pertama, disclosure #ad", channel: "TikTok", owner: "KOL", deadline: "H-3 tiap minggu" },
      { item: "Carousel edukasi", qty: 4, spec: "1080×1350, 7 slide", channel: "Instagram", owner: "Desainer", deadline: "28 Okt" },
      { item: "Reels progres", qty: 8, spec: "9:16, 15-20 dtk", channel: "Instagram", owner: "Tim konten", deadline: "Mingguan" },
      { item: "Banner toko & voucher", qty: 6, spec: "Ukuran Shopee & TikTok Shop", channel: "Marketplace", owner: "Desainer", deadline: "30 Okt" },
      { item: "Naskah live", qty: 4, spec: "Rundown 3 jam + jawaban keberatan", channel: "TikTok Shop", owner: "Brand manager", deadline: "H-2 live" },
      { item: "Kit kreator", qty: 35, spec: "Serum + tisu minyak + kartu brief", channel: "KOL", owner: "Operasional", deadline: "25 Okt" },
    ],
    phases: [
      { phase: "teaser", period: "1-7 Nov", goal: "Memancing rasa penasaran soal kenapa serum murah tidak terasa", activities: ["Carousel edukasi di Instagram", "Video KOL Tes Tisu Minggu 1", "Waiting list voucher launching"] },
      { phase: "launch", period: "8-21 Nov", goal: "Ledakan penjualan dengan penawaran perdana", activities: ["Spark Ads video KOL terbaik", "Live TikTok tiap Jumat", "Voucher perdana Rp15rb untuk 1.000 pembeli pertama"] },
      { phase: "sustain", period: "22-30 Nov", goal: "Kumpulkan bukti & ulasan", activities: ["Video KOL Tes Tisu Minggu 4", "Repost ulasan pembeli", "Iklan Shopee kata kunci"] },
    ],
    budget: {
      total: 60000000,
      basis: "user",
      items: [
        { item: "KOL & kreator", pct: 40, amount: 24000000, note: "5 mikro @Rp2,5 jt + 30 nano @Rp350rb + kit" },
        { item: "TikTok Ads (Spark + GMV Max)", pct: 30, amount: 18000000, note: "Hanya untuk video dengan CTR ≥1,5%" },
        { item: "Voucher perdana", pct: 15, amount: 9000000, note: "Rp15rb × 600 pemakaian" },
        { item: "Produksi konten", pct: 10, amount: 6000000, note: "Desain, Reels, banner" },
        { item: "Cadangan", pct: 5, amount: 3000000, note: "Boost video yang meledak" },
      ],
    },
    mandatories: {
      must: ["Logo & nomor notifikasi BPOM di kemasan yang tampil", "Disclosure #ad / #sponsored di semua konten KOL", "Hashtag kampanye #TesTisu4Minggu"],
      avoid: ["Klaim 'menghilangkan jerawat' atau 'menyembuhkan'", "Menyebut atau membandingkan merek lain", "Foto before-after hasil edit"],
    },
    success: [
      { level: "bisnis", metric: "Botol terjual", target: "2.500", how: "Seller Center, rekap akhir kampanye" },
      { level: "kampanye", metric: "ROAS TikTok Ads", target: "≥3x", how: "Ads Manager, mingguan" },
      { level: "kampanye", metric: "Biaya per order", target: "≤Rp30rb", how: "Ads Manager + Seller Center" },
      { level: "konten", metric: "View rate 6 detik", target: "≥35%", how: "TikTok analytics per video" },
    ],
  },
};

export default fixture;
