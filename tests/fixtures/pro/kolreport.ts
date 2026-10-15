/** Contoh hasil AI untuk tool "kolreport" (dipakai tes file & pratinjau tampilan). */
const c = (
  name: string,
  platform: string,
  content: string,
  followers: number,
  fee: number,
  views: number,
  likes: number,
  comments: number,
  shares: number | null,
  saves: number | null,
  clicks: number,
  orders: number,
  note: string,
  next_step: string,
) => ({ name, platform, content, followers, fee, views, likes, comments, shares, saves, engagements: null, clicks, orders, revenue: orders * 119000, note, next_step });

const fixture = {
  tool: "kolreport",
  input: {
    campaign: "Glow Up 10.10 — Serum Niacinamide",
    brand: "Skinfaa",
    objective: "penjualan",
    period: "1–15 Oktober 2026",
    data: "@rarasoraya, TikTok, 85rb, fee Rp2,5 jt, views 142rb, like 9.800, komen 410, share 260, save 1.150, klik 2.300, order 186",
    notes: "Harga serum Rp119rb, margin kotor 55%, atribusi pakai kode voucher per kreator. Target ROAS 3x.",
  },
  kinds: ["pptx", "xlsx"],
  output: {
    headline: "Fee Rp52,8 jt menghasilkan 749 order & omzet Rp89,1 jt (ROAS 1,69x, di bawah impas 1,82x) — 3 kreator micro/nano TikTok mencetak ROAS 5,7-8,9x.",
    summary:
      "Kampanye 10.10 Skinfaa menghasilkan 749 order lewat kode voucher kreator dengan total fee Rp52,8 jt. Hampir separuh order (289) datang dari 3 kreator TikTok di bawah 100rb followers yang hanya menyerap Rp4,3 jt fee. Sebaliknya 3 akun macro Instagram/YouTube menghabiskan Rp21,5 jt dengan ROAS di bawah 1,1x. Gelombang November kami usulkan memperbanyak micro TikTok berbasis fee kecil + komisi, menego ulang @glowwithtasya, dan menghentikan 4 kreator dengan ROAS di bawah 1,1x.",
    creators: [
      c("@rarasoraya", "TikTok", "2 video TikTok", 85000, 2500000, 142000, 9800, 410, 260, 1150, 2300, 186, "Video 'review jujur 7 hari' dengan close-up pori; video kedua tayang 10.10 pukul 20.00 dan menyumbang 70% order.", "Lanjut 3 video untuk November + minta izin Spark Ads 30 hari untuk video 10.10 (142rb views, 186 order)."),
      c("@kak.nadhira", "TikTok", "1 video TikTok", 38000, 1200000, 61500, 4700, 230, 120, 610, 980, 74, "Format before–after dengan teks 'hari ke-1 vs hari ke-14'; save rate tertinggi kedua.", "Lanjut 2 video; tawarkan skema fee Rp1,2 jt + komisi 8% agar ia ikut push di live."),
      c("@mahasiswi.glowing", "TikTok", "1 video TikTok", 9400, 600000, 23800, 2100, 96, 44, 330, 410, 29, "Nano kampus, angle 'skincare budget anak kos'; ER tertinggi kampanye (10,8%).", "Lanjut dan jadikan template: rekrut 8-10 nano kampus serupa dengan fee Rp500-750rb."),
      c("@glowwithtasya", "TikTok", "1 video TikTok + 1 live 60 menit", 1250000, 25000000, 610000, 21400, 880, 540, 2300, 6900, 312, "Order terbanyak (312), 60% dari sesi live; video feed sendiri hanya menyumbang ±125 order.", "Nego ulang ke kisaran Rp18-19 jt untuk paket live saja, atau fee Rp12 jt + komisi 10% dari GMV live."),
      c("@santisaraswati", "YouTube", "1 video review 9 menit", 210000, 7000000, 41000, 1900, 260, null, null, 1150, 63, "Review panjang, komentar banyak bertanya soal pemakaian bersama retinol; konversi YouTube biasanya tertunda.", "Stop untuk gelombang November; cek ulang kode voucher di akhir Oktober sebelum memutuskan kerja sama Q1."),
      c("@beautybyfara", "Instagram", "1 Reels", 156000, 5500000, 72000, 2900, 140, 55, 410, 610, 38, "Reels estetik tanpa demonstrasi tekstur; CTA hanya 'link di bio'.", "Stop; bila ingin dipakai lagi, hanya dengan skema affiliate tanpa fee tetap."),
      c("@dindaskincarediary", "Instagram", "1 Reels + 3 Story", 420000, 9000000, 98000, 3100, 95, 40, 240, 820, 41, "Story dengan link sticker menyumbang 820 klik, tapi konversi ke order hanya 5%.", "Stop; fee Rp9 jt menghasilkan 41 order (Rp219rb per order)."),
      c("@reviewjujurvia", "TikTok", "1 video TikTok", 64000, 2000000, 18200, 690, 31, 9, 55, 140, 6, "Video tayang 3 hari setelah jadwal dan tidak memakai hook dari brief; views hanya 28% dari followers.", "Stop; catat keterlambatan tayang di database kreator."),
    ],
    insights: [
      {
        title: "Micro & nano TikTok paling efisien",
        evidence: "3 kreator <100rb followers: fee Rp4,3 jt → 289 order, ROAS gabungan 8,0x. 3 macro IG/YouTube: fee Rp21,5 jt → 142 order, ROAS 0,79x.",
        action: "Geser minimal 50% budget November ke micro/nano TikTok dengan fee ≤Rp2,5 jt.",
      },
      {
        title: "Live mendorong order mega creator",
        evidence: "60% dari 312 order @glowwithtasya terjadi saat live 60 menit; video feed-nya hanya ±125 order.",
        action: "Bayar mega creator untuk live (dengan komisi), bukan untuk video feed.",
      },
      {
        title: "Klik Instagram tidak berubah jadi order",
        evidence: "@dindaskincarediary 820 klik → 41 order (5%); TikTok keranjang kuning rata-rata 8%.",
        action: "Instagram dipakai untuk awareness saja atau diarahkan ke Shopee dengan voucher khusus.",
      },
      {
        title: "Demonstrasi tekstur menentukan konversi",
        evidence: "3 konten teratas menampilkan close-up tekstur & hasil hari ke-14; 2 konten terbawah hanya estetika produk.",
        action: "Wajibkan adegan tekstur di 5 detik pertama pada brief berikutnya.",
      },
    ],
    lessons: [
      { aspect: "Hook", lesson: "Hook berbasis bukti (hari ke-1 vs hari ke-14) menahan penonton lebih lama daripada hook estetika.", example: "\"Aku pakai serum ini 14 hari, ini pori-poriku tanpa filter.\"" },
      { aspect: "Format", lesson: "Video TikTok 30-45 detik dengan close-up tekstur paling banyak disimpan.", example: "Save rate @rarasoraya 0,8% dan @kak.nadhira 1,0%." },
      { aspect: "CTA", lesson: "Kode voucher disebut lisan + teks di layar menaikkan pemakaian kode.", example: "\"Pakai kode RARA10, potongan 10rb, cuma sampai 15 Oktober.\"" },
      { aspect: "Waktu tayang", lesson: "Konten yang tayang 19.00-21.00 pada tanggal kembar menyumbang order terbesar.", example: "Video kedua @rarasoraya tayang 10.10 pukul 20.00 → 70% order-nya." },
    ],
    next_wave: {
      strategy:
        "November: 12-15 kreator TikTok (10 micro, 4 nano, 1 mega khusus live 11.11) dengan skema fee kecil + komisi 8-10%. Konten pemenang Oktober diperpanjang lewat Spark Ads. Instagram hanya untuk awareness dengan budget terbatas.",
      budget: [
        { bucket: "Repeat 3 kreator terbaik + Spark Ads", share_pct: 30, reason: "ROAS 5,7-8,9x; whitelisting memperpanjang umur konten yang terbukti menjual." },
        { bucket: "Rekrut 10 micro/nano TikTok baru", share_pct: 35, reason: "Pola Oktober: CPO Rp13-21rb vs rata-rata kampanye Rp70rb." },
        { bucket: "1 mega creator khusus live 11.11", share_pct: 25, reason: "Live menyumbang 187 order; fee dinego + komisi GMV." },
        { bucket: "Eksperimen & cadangan", share_pct: 10, reason: "Uji 2 kreator Shopee Video dan cadangan bonus performa." },
      ],
      budget_total: 52800000,
      tests: [
        "Uji fee kecil + komisi 10% vs fee tetap pada 6 micro dengan brief identik, bandingkan CPO.",
        "Uji hook 'hari ke-1 vs hari ke-14' vs hook harga pada 2 kreator yang sama.",
        "Uji Spark Ads Rp3 jt pada video @rarasoraya; target ROAS ≥4x.",
      ],
    },
    data_notes:
      "Order & omzet dihitung dari pemakaian kode voucher per kreator (harga Rp119rb, belum dikurangi diskon). Share & save YouTube tidak tersedia. Order organik tanpa kode tidak diatribusikan ke kreator mana pun.",
  },
};

export default fixture;
