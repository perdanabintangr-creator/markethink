/** Contoh hasil AI untuk tool "gtm" (Rencana Peluncuran Produk). */
const fixture = {
  tool: "gtm",
  input: {
    brand: "Sejuk Skin",
    launch_date: "1 Desember 2026",
    product: "Sunscreen stick SPF50 PA++++ 15g, tidak lengket & tidak whitecast, praktis re-apply di atas makeup. Sudah BPOM.",
    market: "Perempuan 20-30 th, pekerja kantoran & mahasiswi di kota besar, aktif di luar ruangan, sudah pakai sunscreen tapi malas re-apply",
    price: "Rp79rb (HPP Rp24rb)",
    budget: "Rp50 jt untuk 3 bulan",
    channels: ["tiktok", "marketplace", "kol", "instagram"],
    competitors: "Azarine sunstick Rp55rb, Skin Aqua Rp65rb, Somethinc Rp99rb",
  },
  kinds: ["pptx", "xlsx"],
  output: {
    headline: "Luncurkan sunscreen stick Rp79rb pada 1 Desember dengan target 3.000 unit dalam 30 hari, lewat seeding 40 kreator & live TikTok.",
    summary:
      "Sejuk Skin masuk sebagai sunscreen stick untuk re-apply di atas makeup — celah yang belum dimiliki pemain murah. Harga Rp79rb diposisikan di antara Azarine dan Somethinc dengan margin kotor 70%. Peluncuran dibangun 4 minggu sebelumnya lewat waiting list & seeding kreator, meledak di minggu launch dengan live 3 jam, lalu dijaga lewat ulasan dan bundling 12.12.",
    assumptions: ["Stok awal 5.000 unit siap H-14", "Tim terdiri dari 1 brand manager, 1 admin, 1 CS"],
    canvas: {
      jobs: ["Melindungi kulit dari matahari sepanjang hari kerja", "Tetap terlihat rapi setelah perjalanan siang"],
      pains: ["Re-apply sunscreen cair merusak makeup", "Sunscreen lengket & whitecast di foto", "Lupa re-apply karena repot"],
      gains: ["Kulit terlindungi tanpa ribet", "Makeup tetap rapi sampai sore", "Praktis dibawa di tas kecil"],
      products: ["Sunscreen stick SPF50 PA++++ 15g", "Kemasan putar seukuran lipstik"],
      relievers: ["Diusap langsung di atas makeup tanpa menggeser foundation", "Tekstur kering, tanpa whitecast", "Ukuran saku, bisa dipakai di mana saja"],
      creators: ["Re-apply 5 detik", "Hasil natural di foto", "Muat di pouch makeup"],
    },
    icp: [
      { name: "Pekerja komuter", profile: "Perempuan 22-30 th, kerja kantoran, naik KRL/ojol, pakai makeup tipis setiap hari", trigger: "Kulit terasa terbakar setelah makan siang di luar", where: "TikTok FYP & TikTok Shop malam hari", priority: "utama", why: "Masalah re-apply paling terasa dan daya beli cukup" },
      { name: "Mahasiswi aktif", profile: "Perempuan 19-23 th, banyak kegiatan luar ruangan", trigger: "Persiapan acara kampus & liburan", where: "Shopee saat promo tanggal kembar", priority: "kedua", why: "Sensitif harga, cocok digarap saat bundling" },
    ],
    positioning: {
      statement:
        "Untuk perempuan aktif yang malas re-apply sunscreen karena takut makeup rusak, Sejuk Skin adalah sunscreen stick SPF50 yang bisa diusap langsung di atas makeup, karena teksturnya kering tanpa whitecast.",
      versus: "Lebih praktis dibanding sunscreen cair (Skin Aqua) dan lebih terjangkau dibanding Somethinc; dibanding Azarine, kita fokus pada pemakaian di atas makeup.",
    },
    pricing: {
      recommended: 79000,
      anchor: "Tampilkan bundle 2 stick Rp149rb (hemat Rp9rb) sebagai pilihan utama; harga satuan Rp79rb menjadi jangkar.",
      tiers: [
        { name: "Satuan", price: 79000, contents: "1 stick 15g", role: "entry" },
        { name: "Duo hemat", price: 149000, contents: "2 stick (kantor & tas)", role: "best seller" },
        { name: "Paket hadiah", price: 219000, contents: "2 stick + pouch + kartu ucapan", role: "anchor" },
      ],
      intro_offer: "Harga perdana Rp69rb untuk 1.000 pembeli pertama (1-7 Desember), khusus waiting list & live.",
      rationale: "Rp79rb berada di tengah rentang kompetitor (Rp55-99rb) dan mendukung klaim kepraktisan; angka 79 terasa di bawah Rp80rb.",
      margin_note: "HPP Rp24rb → margin kotor 70% di harga normal; harga perdana Rp69rb masih menyisakan margin 65%.",
    },
    channels: [
      { channel: "TikTok Shop", role: "Kanal penjualan utama", tactics: ["Live launch 3 jam 1 Desember", "Affiliate komisi 15%"], phase: "semua", kpi: "Unit terjual" },
      { channel: "KOL & kreator", role: "Seeding & bukti sosial", tactics: ["40 kreator nano kirim sampel H-21", "5 mikro KOL video re-apply di atas makeup"], phase: "pre", kpi: "Video tayang" },
      { channel: "Shopee", role: "Menangkap pencarian & 12.12", tactics: ["Listing lengkap H-7", "Voucher 12.12 bundling"], phase: "post", kpi: "Order Shopee" },
      { channel: "Instagram", role: "Waiting list & edukasi", tactics: ["Story countdown & link waiting list", "Reels cara re-apply"], phase: "pre", kpi: "Pendaftar waiting list" },
    ],
    phases: [
      { phase: "pre", duration: "4 minggu (3-30 Nov)", goal: "Kumpulkan 2.000 pendaftar waiting list & 40 video kreator", activities: ["Kirim sampel ke 40 kreator", "Buka waiting list via WhatsApp", "Siapkan listing & stok"], kpis: ["2.000 waiting list", "40 video siap tayang"] },
      { phase: "launch", duration: "1 minggu (1-7 Des)", goal: "Jual 1.500 unit di minggu pertama", activities: ["Live launch 3 jam", "Video kreator tayang serentak", "Harga perdana untuk 1.000 pembeli"], kpis: ["1.500 unit", "ROAS ≥4x"] },
      { phase: "post", duration: "6 minggu (8 Des-17 Jan)", goal: "Kumpulkan ulasan & dorong pembelian kedua", activities: ["Minta ulasan foto H+5", "Bundling 12.12", "Retargeting penonton video"], kpis: ["500 ulasan ≥4,8", "Repeat 15%"] },
    ],
    timeline: [
      { week: -4, activity: "Finalisasi stok, kemasan & foto produk", owner: "Brand manager" },
      { week: -3, activity: "Kirim sampel ke 40 kreator nano & 5 mikro KOL", owner: "Brand manager" },
      { week: -2, activity: "Buka waiting list via Instagram & WhatsApp", owner: "Admin" },
      { week: -1, activity: "Listing TikTok Shop & Shopee, tes alur order", owner: "Admin" },
      { week: 0, activity: "Live launch 3 jam, video kreator tayang serentak", owner: "Brand manager" },
      { week: 1, activity: "Minta ulasan dari pembeli pertama", owner: "CS" },
      { week: 2, activity: "Kampanye 12.12 bundling Duo hemat", owner: "Admin" },
      { week: 4, activity: "Evaluasi 30 hari & keputusan restock", owner: "Brand manager" },
    ],
    checklist: [
      { team: "marketing", task: "Brief & jadwal tayang 45 kreator", due: "H-21" },
      { team: "marketing", task: "Siapkan UTM & kode voucher per kreator", due: "H-10" },
      { team: "sales", task: "Atur voucher perdana & bundling di semua toko", due: "H-3" },
      { team: "operasional", task: "Stok 5.000 unit & bahan packing siap", due: "H-14" },
      { team: "operasional", task: "Tes alur order, pembayaran & pengiriman", due: "H-5" },
      { team: "cs", task: "Template jawaban 15 pertanyaan umum", due: "H-7" },
      { team: "cs", task: "Jadwal piket chat 08.00-22.00 di minggu launch", due: "H-3" },
    ],
    runbook: [
      { time: "07.00", activity: "Cek stok, link toko, dan voucher aktif", owner: "Admin", note: "Bila voucher error, aktifkan voucher cadangan" },
      { time: "09.00", activity: "Kreator mulai tayang video serentak", owner: "Brand manager", note: "Kirim pengingat via WA ke kreator yang belum tayang" },
      { time: "12.00", activity: "Broadcast WhatsApp ke waiting list", owner: "Admin", note: "Kirim bertahap 500 kontak per jam" },
      { time: "19.00", activity: "Live launch 3 jam di TikTok Shop", owner: "Host + brand manager", note: "Host cadangan siap bila host utama berhalangan" },
      { time: "22.00", activity: "Rekap penjualan & catat masalah", owner: "Brand manager", note: "Kirim ringkasan ke owner" },
    ],
    kpis: [
      { metric: "Unit terjual", target: "3.000 unit", when: "30 hari pasca launch" },
      { metric: "Ulasan bintang", target: "≥4,8 dari 500 ulasan", when: "45 hari pasca launch" },
      { metric: "ROAS iklan", target: "≥4x", when: "Mingguan" },
      { metric: "Repeat order", target: "15%", when: "60 hari pasca launch" },
    ],
    budget: {
      total: 50000000,
      basis: "user",
      items: [
        { item: "KOL & seeding", pct: 40, amount: 20000000, note: "45 kreator + sampel" },
        { item: "TikTok Ads", pct: 30, amount: 15000000, note: "Spark Ads dari video kreator terbaik" },
        { item: "Voucher perdana", pct: 15, amount: 7500000, note: "Rp10rb × 750 pemakaian" },
        { item: "Produksi konten", pct: 10, amount: 5000000, note: "Foto produk & video live" },
        { item: "Cadangan", pct: 5, amount: 2500000, note: "Boost video yang meledak" },
      ],
    },
    risks: [
      { risk: "Stok habis di minggu launch", likelihood: "sedang", mitigation: "Siapkan pre-order dengan estimasi kirim 7 hari & restock H+10" },
      { risk: "Ulasan negatif soal whitecast di kulit gelap", likelihood: "sedang", mitigation: "Kirim sampel ke kreator kulit sawo matang lebih dulu & tampilkan hasilnya" },
      { risk: "Kreator telat posting", likelihood: "tinggi", mitigation: "Kontrak tayang dengan tanggal & 10 kreator cadangan" },
    ],
  },
};

export default fixture;
