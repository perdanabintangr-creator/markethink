/** Contoh hasil AI untuk tool "audit" (dipakai tes file & pratinjau tampilan). */
const fixture = {
  tool: "audit",
  input: {
    platform: "instagram",
    handle: "@kopisenja.id",
    niche: "Kopi Senja — kopi susu literan gula aren Rp45rb, jualan di Shopee & TikTok Shop, target pekerja kantoran Jabodetabek 22-35 th.",
    bio: "Kopi susu literan ☕ | Enak & murah | Order via Shopee 👇",
    followers: "3.240",
    frequency: "2-3x seminggu, tidak tentu",
    data:
      "Reels 12/9 — tutorial seduh kopi literan jadi 6 gelas — 8.400 views, 210 likes, 14 komen, 96 saves, 41 share\nReels 5/9 — POV ngopi di kantor tanggal tua — 5.100 views, 180 likes, 22 komen, 30 saves\nCarousel 10/9 — promo 9.9 diskon 20% — 900 reach, 31 likes, 2 komen, 3 saves\nFoto produk 7/9 — 640 reach, 22 likes, 1 komen\nFoto produk 1/9 — 580 reach, 19 likes, 0 komen\nCarousel 28/8 — testimoni chat pembeli — 1.700 reach, 64 likes, 6 komen, 18 saves",
    goal: "sales",
  },
  kinds: ["pptx", "xlsx"],
  output: {
    verdict: "Reels edukasi ditonton 9x lebih banyak dari foto produk, tapi bio dan highlight belum memberi alasan untuk beli.",
    summary:
      "Akun punya modal kuat: Reels tutorial dan POV kantor menghasilkan reach 5-8 ribu dengan save tinggi. Masalahnya, 3 dari 6 konten terakhir adalah foto produk/promo yang reach-nya di bawah 1.000, dan profil tidak punya jalur order yang jelas selain 'Order via Shopee'. Perubahan paling berdampak: ganti slot foto produk dengan Reels edukasi-hemat, lalu benahi bio + highlight 'Cara order' minggu ini.",
    score_total: 51,
    aspects: [
      { key: "profile", name: "Profil & bio", score: 4, finding: "Bio menyebut produk tapi tidak menyebut untuk siapa dan kenapa harus beli di sini; 'Enak & murah' tidak membedakan.", evidence: "Bio: \"Kopi susu literan ☕ | Enak & murah | Order via Shopee 👇\" — tanpa harga per gelas, tanpa bukti, tanpa WA.", fix: "Pakai salah satu bio baru, isi kolom Nama dengan 'Kopi Senja | Kopi Susu Literan', tambahkan tombol WhatsApp dan link-in-bio 3 tombol (Shopee, TikTok Shop, WA).", priority: "tinggi" },
      { key: "visual", name: "Identitas visual", score: 5, finding: "Foto produk dan carousel memakai gaya berbeda-beda; cover Reels tanpa teks sehingga grid tidak menjelaskan isi.", evidence: "Asumsi: dari jenis konten yang disebut (foto produk vs carousel promo); screenshot grid belum diupload.", fix: "Buat 1 template cover Reels (teks 4-5 kata, warna cokelat-krem) dan 1 template carousel di Canva; pakai mulai minggu 1.", priority: "sedang" },
      { key: "pillars", name: "Pilar & konsistensi", score: 5, finding: "Belum ada pilar tetap; konten melompat dari tutorial ke promo ke foto produk.", evidence: "6 konten terakhir: 2 Reels edukasi/relatable, 1 testimoni, 3 promo/foto produk (50% jualan langsung).", fix: "Tetapkan 4 pilar: Hemat ngopi (35%), Relatable kantor (25%), Bukti pembeli (20%), Promo & produk (20%).", priority: "tinggi" },
      { key: "hook", name: "Hook & storytelling", score: 7, finding: "Reels tutorial dan POV punya hook yang jelas dan relatable; foto produk tidak punya hook sama sekali.", evidence: "Reels tutorial 8.400 views & POV 5.100 views vs foto produk 580-640 reach.", fix: "Pakai pola hook hitungan hemat ('1 liter = 6 gelas, Rp7.500 per gelas') di 3 Reels berikutnya; uji 2 hook per video.", priority: "sedang" },
      { key: "engagement", name: "Engagement & komunitas", score: 7, finding: "ER Reels sehat dan save tinggi (tanda konten dianggap berguna); konten promo hampir tanpa interaksi.", evidence: "ER Reels tutorial (210+14+96+41)/8.400 = 4,3%; POV (180+22+30)/5.100 = 4,5%; carousel promo (31+2+3)/900 = 4,0% tapi reach kecil; foto produk 3,4-3,6%.", fix: "Balas semua komentar dalam 1 jam pertama dengan pertanyaan balik; repost story pembeli minimal 3x seminggu.", priority: "sedang" },
      { key: "funnel", name: "CTA & funnel penjualan", score: 4, finding: "Hanya ada 1 jalur (Shopee) dan konten Reels terbaik tidak memberi CTA beli.", evidence: "Bio: 'Order via Shopee'; tidak ada highlight cara order; Reels tutorial 96 saves tanpa ajakan order (asumsi dari data caption yang tidak disebut).", fix: "Tambahkan CTA kata kunci 'Ketik HEMAT di DM' di Reels edukasi, highlight 'Cara order', dan pinned post testimoni + harga per gelas.", priority: "tinggi" },
      { key: "cadence", name: "Frekuensi & waktu posting", score: 4, finding: "2-3 posting per minggu tidak tentu; algoritma dan audiens tidak punya ritme.", evidence: "Frekuensi dari user: '2-3x seminggu, tidak tentu'.", fix: "Kunci 4 posting/minggu (Sen, Rab, Jum Reels 19.00; Sab carousel 11.00) + story harian 2-3 frame.", priority: "sedang" },
    ],
    bio_options: [
      { text: "Kopi susu gula aren literan ☕\n1 liter = 6 gelas, cuma Rp7.500/gelas\nStok kopi kantor seminggu 👇", angle: "Hitungan hemat" },
      { text: "Ngopi tiap hari tanpa bikin boros ☕\nKopi susu literan buat kantor & rumah\nOrder Shopee / WA 👇", angle: "Masalah → solusi" },
      { text: "Kopi susu literan dari Bekasi ☕\nDiseduh tiap pagi, dikirim hari itu\nCek promo minggu ini 👇", angle: "Kesegaran & proses" },
    ],
    platform: "instagram",
    highlights: [
      { type: "highlight", name: "Mulai sini", content: "Siapa Kopi Senja, hitungan hemat per gelas, cara simpan di kulkas 5 hari." },
      { type: "highlight", name: "Menu", content: "Varian & harga literan dan 250 ml, dengan foto seragam." },
      { type: "highlight", name: "Testimoni", content: "Screenshot chat & repost story pembeli asli (minta izin)." },
      { type: "highlight", name: "Cara order", content: "Langkah order Shopee, TikTok Shop & WA, ongkir, jam kirim." },
      { type: "highlight", name: "Promo", content: "Promo aktif minggu ini saja; hapus yang sudah lewat." },
      { type: "pinned", name: "Reels tutorial 6 gelas", content: "Konten dengan reach & save tertinggi — jadi pintu masuk follower baru." },
      { type: "pinned", name: "Testimoni pembeli", content: "Carousel chat pembeli + harga per gelas untuk meyakinkan yang ragu." },
      { type: "pinned", name: "Cara order", content: "Carousel 4 slide: pilih varian → order → kirim → simpan." },
    ],
    keep: [
      { item: "Reels tutorial/hitungan hemat", reason: "Reach 8.400 dan 96 saves — format paling efektif menarik non-follower." },
      { item: "Reels POV situasi kantor", reason: "22 komentar, tertinggi dari semua konten; memicu identifikasi diri." },
    ],
    stop: [
      { item: "Foto produk polos tanpa hook", reason: "Reach 580-640, 9x lebih rendah dari Reels; memakan slot posting." },
      { item: "Carousel promo diskon tanpa konteks", reason: "Promo 9.9 hanya 900 reach dan 3 saves; diskon tanpa cerita tidak dibagikan." },
    ],
    start: [
      { item: "Reels testimoni pembeli (unboxing di kantor)", reason: "Carousel testimoni sudah 1.700 reach; versi video berpotensi lebih luas." },
      { item: "CTA kata kunci DM di setiap Reels edukasi", reason: "Mengubah saves menjadi chat yang bisa ditutup jadi order." },
      { item: "Story harian dengan polling & link sticker", reason: "Menjaga follower lama tetap melihat produk tanpa menambah beban feed." },
    ],
    plan: [
      { week: 1, focus: "Benahi fondasi profil", actions: ["Ganti bio & kolom Nama, tambahkan tombol WA", "Buat 5 highlight dengan cover seragam", "Pin 3 konten (tutorial, testimoni, cara order)", "Buat template cover Reels & carousel"], output: "Profil siap mengonversi pengunjung" },
      { week: 2, focus: "Produksi pilar hemat & kantor", actions: ["Syuting batch 4 Reels (2 hemat, 2 POV kantor) di hari Senin", "Uji 2 hook berbeda untuk Reels hemat", "Story harian 2-3 frame dengan polling"], output: "4 Reels + 7 hari story" },
      { week: 3, focus: "Bukti & jalur order", actions: ["Kumpulkan 5 testimoni pembeli via WA (minta izin repost)", "Posting Reels testimoni + carousel cara order", "Aktifkan CTA kata kunci 'HEMAT' di DM"], output: "Funnel DM aktif, 2 konten bukti" },
      { week: 4, focus: "Evaluasi & gandakan", actions: ["Bandingkan reach, saves & DM per pilar", "Buat 2 versi baru dari Reels terbaik", "Audit ulang profil & update KPI bulan berikutnya"], output: "Laporan 30 hari & kalender bulan depan" },
    ],
    kpis: [
      { metric: "Rata-rata views Reels", baseline: "±6.750", target: "10.000", how: "Rata-rata views Reels yang tayang 30 hari terakhir (Insight)" },
      { metric: "Saves per Reels", baseline: "±63", target: "120", how: "Rata-rata saves per Reels" },
      { metric: "DM/chat order", baseline: "belum ada data", target: "60 chat", how: "Hitung DM berisi kata kunci + chat WA dari link bio" },
      { metric: "Klik link di bio", baseline: "belum ada data", target: "300 klik", how: "Insight → Aktivitas profil → Ketukan link" },
    ],
    assumptions: [
      "Identitas visual dinilai dari jenis konten yang disebut; upload screenshot grid untuk penilaian akurat.",
      "Jumlah klik link & DM belum tersedia, jadi baseline funnel belum bisa dihitung.",
    ],
  },
};

export default fixture;
