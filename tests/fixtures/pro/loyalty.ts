/** Contoh hasil AI untuk tool "loyalty" (dipakai tes file & pratinjau tampilan). */
import { computeLoyalty, loyaltyInputs } from "../../../src/lib/addons/pro/specs/loyalty";

const input = {
  business: "Kopi Tepi Kota — 3 outlet kopi susu di Bandung + GrabFood/GoFood. Menu andalan es kopi susu Rp28 rb. Pelanggan mahasiswa & pekerja 20-30 th, kasir pakai Moka POS.",
  aov: 48000,
  margin: 62,
  frequency: 18,
  customers: 4200,
  model: "recommend",
  budget: "maks Rp2 jt/bulan di luar biaya hadiah",
};

const ai = {
  summary:
    "Pelanggan Kopi Tepi Kota datang rata-rata 18 kali setahun dengan AOV kecil, jadi poin sederhana berbasis nomor HP + 3 tier lebih cocok daripada member berbayar. Hadiah memakai menu sendiri sehingga biaya riilnya sekitar sepertiga nilai tukar, dan hadiah pertama bisa diraih dalam 3 kunjungan.",
  model: {
    name: "Teman Tepi Kota",
    type: "gabungan" as const,
    why: "Frekuensi tinggi (18×/tahun) dan AOV Rp48 rb membuat pelanggan cepat mengumpulkan poin; margin 62% memberi ruang earn rate 5%. Tier mendorong pelanggan 1-2×/bulan naik ke mingguan, karena benefit tier atas (upgrade gratis tiap Senin) murah bagi outlet.",
    not_chosen: "Member berbayar: AOV terlalu kecil, pelanggan mahasiswa sensitif biaya di muka. Stamp card fisik: mudah dipalsukan dan tidak ada data pelanggan. Referral: cocok jadi bonus, bukan mesin utama.",
  },
  earn_burn: {
    earn_rule: "Setiap belanja Rp1.000 = 1 poin (di kasir & pesan-antar lewat link sendiri), cukup sebut nomor HP",
    spend_per_point: 1000,
    point_value: 50,
    burn_rule: "Tukar mulai 120 poin di kasir dengan OTP WhatsApp. Satu hadiah per transaksi, tidak bisa digabung promo lain.",
    expiry: "Poin berlaku 12 bulan sejak didapat; pengingat WA 30 hari sebelum hangus",
    bonus_rules: ["Bonus 100 poin saat daftar (langsung bisa tukar upgrade ukuran di kunjungan ke-1)", "Poin 2× Senin-Rabu 14.00-17.00 (jam sepi)", "Minuman gratis di minggu ulang tahun"],
  },
  tiers: [
    { name: "Teman", requirement: "Daftar dengan nomor HP", multiplier: 1, benefits: ["1 poin per Rp1.000", "Bonus 100 poin pendaftaran"] },
    { name: "Langganan", requirement: "≥ 24 transaksi atau belanja Rp1,2 jt dalam 12 bulan", multiplier: 1.25, benefits: ["Poin 1,25×", "Upgrade ukuran gratis tiap Senin", "Info menu baru lebih dulu"] },
    { name: "Keluarga Tepi Kota", requirement: "≥ 60 transaksi atau belanja Rp3 jt dalam 12 bulan", multiplier: 1.5, benefits: ["Poin 1,5×", "Cicip menu baru sebelum rilis", "Antre prioritas di jam sibuk", "Tumbler member saat naik tier"] },
  ],
  rewards: [
    { reward: "Upgrade ukuran large", points: 120, cost: 2000, note: "Hadiah pertama, bisa diraih di kunjungan ke-1/3." },
    { reward: "Croissant butter", points: 360, cost: 7000, note: "Mendorong coba kategori pastry (cross-sell)." },
    { reward: "Es Kopi Susu Tepi Kota", points: 560, cost: 8500, note: "Hadiah paling dicari; ±11 kunjungan." },
    { reward: "Menu rahasia khusus member", points: 600, cost: 9500, note: "Eksklusif, tidak dijual umum — nilai persepsi tinggi." },
    { reward: "Biji kopi house blend 250 g", points: 1800, cost: 45000, note: "Untuk pelanggan setia yang ngopi di rumah." },
    { reward: "Tumbler Tepi Kota", points: 2400, cost: 55000, note: "Media promosi berjalan; hanya 1 per member per tahun." },
  ],
  assumptions: {
    participation_pct: 45,
    redemption_pct: 55,
    uplift_pct: 12,
    avg_multiplier: 1.1,
    fixed_cost_year: 18000000,
    notes:
      "Partisipasi 45% karena daftar cukup nomor HP di kasir; redemption 55% (sebagian poin hangus/tidak ditukar); uplift 12% = kurang dari 2 kunjungan tambahan per anggota per tahun. Biaya tetap: fitur loyalty POS ±Rp1 jt/bulan, materi & pelatihan Rp6 jt/tahun (perkiraan).",
  },
  launch: [
    { phase: "Persiapan", when: "Minggu 1-2", actions: "Aktifkan fitur loyalty di POS, uji OTP WhatsApp, latih 12 barista dengan skrip 10 detik, cetak akrilik kasir & stiker meja." },
    { phase: "Soft launch", when: "Minggu 3", actions: "Mulai di outlet Dago saja; target 40 pendaftar/hari; perbaiki alur kasir yang lambat." },
    { phase: "Grand launch", when: "Minggu 4", actions: "Semua outlet + Instagram; bonus 200 poin untuk 1.000 pendaftar pertama; kontes barista dengan pendaftar terbanyak." },
    { phase: "Evaluasi", when: "Bulan ke-3", actions: "Bandingkan frekuensi anggota vs non-anggota, redemption rate, dan biaya hadiah riil; sesuaikan katalog hadiah." },
  ],
  comms: [
    {
      channel: "Pengumuman WhatsApp",
      title: "Broadcast ke pelanggan yang pernah order",
      text: "Halo Kak {nama} 👋\nMulai 1 Desember, tiap belanja di Kopi Tepi Kota dapat poin: Rp1.000 = 1 poin.\n\nDaftar cukup sebut nomor HP di kasir, langsung dapat *100 poin* — bisa dipakai upgrade ukuran large di kunjungan berikutnya.\n\nSampai ketemu di outlet ☕\nBalas STOP kalau tidak mau dapat info lagi.",
    },
    {
      channel: "Caption Instagram",
      title: "Pengumuman program",
      text: "Ngopi di sini sekarang ada balasannya ☕✨\n\nKenalan sama Teman Tepi Kota: tiap Rp1.000 = 1 poin, daftar langsung dapat 100 poin, dan es kopi susu gratis nunggu di 560 poin.\n\nCaranya? Sebut nomor HP kamu di kasir. Udah, gitu aja.\n\nSenin-Rabu jam 14.00-17.00 poinnya dobel. Siapa yang ngopi sore? 👀\n\n#KopiTepiKota #KopiBandung #NgopiBandung",
    },
    {
      channel: "Skrip kasir",
      title: "Diucapkan saat pelanggan bayar",
      text: "\"Kak, sudah jadi Teman Tepi Kota? Cukup nomor HP, transaksi ini langsung dapat poin plus bonus 100 poin buat upgrade large gratis.\"",
    },
    {
      channel: "Skrip CS",
      title: "Jawaban pertanyaan poin di DM/WA",
      text: "Halo Kak! Poin didapat dari setiap transaksi di kasir & link order kami (Rp1.000 = 1 poin). Cek saldo dengan balas *POIN* ke nomor ini ya. Pesanan lewat GrabFood/GoFood belum dapat poin karena transaksinya tercatat di aplikasi mereka 🙏",
    },
  ],
  kpis: [
    { metric: "Anggota terdaftar 6 bulan", target: "1.900 (45% pelanggan aktif)" },
    { metric: "Transaksi oleh anggota", target: "≥ 55% total transaksi outlet" },
    { metric: "Frekuensi anggota vs non-anggota", target: "+12% atau lebih" },
    { metric: "Redemption rate", target: "45-65%" },
    { metric: "Biaya program", target: "≤ 4,5% omzet anggota" },
  ],
  risks: [
    { risk: "Barista memasukkan nomor HP sendiri", prevention: "Poin hanya masuk dengan OTP ke nomor pelanggan; laporan mingguan nomor dengan > 5 transaksi/hari." },
    { risk: "Poin dari transaksi yang dibatalkan", prevention: "Poin terkunci 24 jam dan otomatis ditarik bila transaksi void/refund." },
    { risk: "Akun ganda untuk bonus pendaftaran", prevention: "Bonus 100 poin baru bisa ditukar setelah transaksi kedua." },
    { risk: "Liabilitas poin menumpuk", prevention: "Catat saldo poin × Rp50 sebagai kewajiban tiap bulan; poin hangus 12 bulan." },
  ],
};

const fixture = {
  tool: "loyalty",
  input,
  kinds: ["pptx", "xlsx"],
  output: { ...ai, rewards: ai.rewards.map((r) => ({ ...r, face_value: r.points * ai.earn_burn.point_value })), economics: computeLoyalty(loyaltyInputs(ai, input), ai.rewards) },
};

export default fixture;
