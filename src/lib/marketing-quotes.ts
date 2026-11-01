/**
 * 100 kalimat "bener juga ya" untuk pop-up kecil di landing (pojok kanan bawah, berganti terus).
 * Tujuannya membuat pengunjung merasa butuh Marqthink. Aturan: JUJUR — hanya klaim yang benar
 * tentang produk (harga paket, fitur yang ada). Tanpa angka pengguna/testimoni karangan.
 * Jaga tiap kalimat ≤ 120 karakter agar muat di pop-up kecil.
 */
export interface MarketingQuote {
  text: string;
}

export const MARKETING_QUOTES: MarketingQuote[] = [
  // Biaya & nilai
  { text: "Konsultan marketing dibayar jutaan per proyek. Marqthink Pro cuma Rp200 ribu sebulan." },
  { text: "Rp60 ribu sebulan itu lebih murah dari sekali ngopi seminggu. Brand kamu dapat otak marketing." },
  { text: "Satu ide promo yang tepat bisa balik modal langganan setahun." },
  { text: "Salah strategi iklan sehari bisa lebih mahal dari langganan Marqthink sebulan." },
  { text: "Hire satu staf marketing itu gaji bulanan. Marqthink kerja 24 jam tanpa lembur." },
  { text: "Bayar desainer, copywriter, dan analis terpisah? Di sini semuanya satu langganan." },
  { text: "Budget iklan terbuang karena target salah. Hitung dulu bareng AI sebelum bakar uang." },
  { text: "Mulai gratis dulu. Upgrade hanya kalau kamu sudah merasakan manfaatnya." },
  { text: "Harga satu kali meeting dengan agency bisa untuk berbulan-bulan Marqthink." },
  { text: "Investasi terkecil untuk keputusan marketing yang paling sering kamu ambil." },
  { text: "Kalau satu caption bagus bisa menambah satu order, berapa order dari 30 caption sebulan?" },
  { text: "Biaya trial-and-error marketing itu mahal. Biaya bertanya dulu ke AI itu murah." },
  { text: "Tidak perlu kontrak agency. Pilih paket bulanan sesuai kebutuhan." },
  { text: "Promax Rp300 ribu sebulan untuk riset, strategi, konten, dan desain. Hitung sendiri hematnya." },
  { text: "Uang yang kamu hemat dari salah strategi bisa dipakai untuk stok barang." },

  // Waktu
  { text: "Kamu bisa begadang bikin konten sendiri, atau selesai dalam hitungan menit." },
  { text: "Waktu kamu lebih berharga untuk melayani pelanggan daripada memikirkan caption." },
  { text: "Kalender konten sebulan: dulu seharian, sekarang beberapa menit." },
  { text: "Deck pitching besok pagi? Riset, strategi, dan slide bisa disiapkan malam ini." },
  { text: "Owner sibuk tetap bisa konsisten posting. Rencananya sudah disiapkan AI." },
  { text: "Riset kompetitor yang biasanya berhari-hari, kini dengan sumber dalam sekali tanya." },
  { text: "Setiap jam yang kamu habiskan bingung mau posting apa, kompetitor sudah posting." },
  { text: "Biar AI yang mikir draf pertamanya. Kamu tinggal pilih dan poles." },
  { text: "Jam 2 pagi butuh ide promo? Marqthink tidak pernah tidur." },
  { text: "Tidak perlu menunggu jadwal meeting konsultan. Tanya sekarang, jawab sekarang." },
  { text: "Satu tujuan, Agent jalankan beberapa tools sekaligus. Kamu tinggal cek hasilnya." },
  { text: "Lebih cepat mencoba ide berarti lebih cepat menemukan yang laku." },
  { text: "Waktu adalah modal yang tidak bisa dibeli lagi. Pakai untuk hal yang penting." },
  { text: "Bikin 5 variasi copy iklan dalam sekali klik, lalu uji mana yang paling laku." },
  { text: "Kerjaan marketing seminggu bisa beres sebelum makan siang." },

  // Tanpa harus jago
  { text: "Tidak paham istilah ROAS, funnel, atau CPM? Tanya saja pakai bahasa sehari-hari." },
  { text: "Tidak perlu jago menulis prompt. Pilih Smart Tool, isi form singkat, langsung jadi." },
  { text: "Bukan orang marketing? Justru Marqthink dibuat untuk kamu." },
  { text: "Cukup cerita masalahmu. AI yang menyusun strateginya." },
  { text: "Tidak bisa desain? Carousel dan poster bisa dibuat, lalu lanjut edit di Canva." },
  { text: "Malas mengetik? Ngobrol pakai suara, AI menjawab dengan suara." },
  { text: "Belajar marketing sambil praktik: setiap jawaban menjelaskan alasannya." },
  { text: "Foto produk dari HP bisa diubah jadi foto katalog yang lebih profesional." },
  { text: "Tim kecil, hasil seperti punya divisi marketing lengkap." },
  { text: "Mahasiswa, freelancer, sampai owner UMKM: semua bisa langsung pakai." },

  // Kualitas & bukti
  { text: "Jawaban AI biasa sering tanpa sumber. Riset Marqthink menyertakan link yang bisa dicek." },
  { text: "Strategi yang disertai angka lebih mudah meyakinkan atasan, klien, atau investor." },
  { text: "Hasilnya bukan cuma teks: ada PPT dan Excel yang siap dipresentasikan." },
  { text: "24 Smart Tools: dari marketing plan sampai audit Instagram, dalam satu tempat." },
  { text: "Keputusan berdasarkan data selalu lebih tenang daripada keputusan berdasarkan feeling." },
  { text: "Riset web terbaru, bukan pengetahuan lama yang sudah basi." },
  { text: "Dibuat untuk pasar Indonesia: bahasa, kebiasaan, dan platform yang dipakai orang sini." },
  { text: "Copy iklan, skrip video, caption, sampai brief kampanye: semua satu otak." },
  { text: "Kualitas setara deliverable konsultan, harga setara langganan aplikasi." },
  { text: "Hitung budget iklan dengan kalkulator, bukan dengan tebak-tebakan." },

  // Kenal brand
  { text: "Bosan menjelaskan brand kamu berulang kali ke AI? Isi Brand Kit sekali saja." },
  { text: "Semakin sering dipakai, semakin AI kenal produk dan pelangganmu." },
  { text: "Gaya bahasa brand kamu tetap konsisten di setiap caption." },
  { text: "Kelola beberapa brand? Setiap project punya Brand Kit sendiri." },
  { text: "Jawaban yang paham konteks brand kamu jauh lebih berguna daripada jawaban umum." },
  { text: "Logo, warna, gaya bahasa, produk: AI mengingat semuanya untuk setiap jawaban." },
  { text: "AI umum menjawab untuk semua orang. Marqthink menjawab untuk brand kamu." },
  { text: "Brand yang konsisten lebih mudah diingat. Konsistensi itu yang dijaga AI." },
  { text: "Pelangganmu unik. Strategimu juga harus unik, bukan template." },
  { text: "Satu tempat untuk semua ide, hasil, dan kalender brand kamu." },

  // Persaingan & momentum
  { text: "Kompetitor kamu mungkin sudah pakai AI untuk marketing. Kamu kapan?" },
  { text: "Yang menang bukan yang paling besar, tapi yang paling cepat beradaptasi." },
  { text: "Tren datang dan pergi dalam hitungan hari. Riset cepat bikin kamu tidak ketinggalan." },
  { text: "Kompetitor pasang diskon? Cari tahu cara melawannya tanpa perang harga." },
  { text: "Pasar tidak menunggu kamu siap. Marqthink membantu kamu siap lebih cepat." },
  { text: "Brand yang posting konsisten terlihat lebih dipercaya. Rencanakan dengan kalender konten." },
  { text: "Momen besar seperti 12.12 atau Ramadan butuh persiapan. Mulai rencanakan sekarang." },
  { text: "Ide bagus yang telat dieksekusi kalah dengan ide biasa yang tepat waktu." },
  { text: "Pantau kompetitor dan tren tanpa harus scroll medsos berjam-jam." },
  { text: "Marketing yang ditunda hari ini adalah penjualan yang hilang bulan depan." },

  // Risiko kecil, mulai sekarang
  { text: "Paket gratis tersedia. Tidak ada ruginya mencoba hari ini." },
  { text: "Daftar gratis, tanpa kartu kredit. Rasakan dulu, putuskan kemudian." },
  { text: "Bayar mudah lewat QRIS, e-wallet, atau virtual account." },
  { text: "Paket aktif otomatis begitu pembayaran berhasil. Langsung bisa dipakai." },
  { text: "Mulai dari Starter Rp60 ribu, naik ke Pro saat brand kamu tumbuh." },
  { text: "Coba satu pertanyaan saja. Kalau jawabannya membantu, kamu tahu harus apa." },
  { text: "Lima menit mencoba bisa menghemat lima jam bingung." },
  { text: "Setiap hari tanpa strategi adalah hari menebak-nebak." },
  { text: "Langkah pertama paling sulit. Di sini langkah pertamanya cuma bertanya." },
  { text: "Butuh lebih banyak? Pro & Promax membuka seluruh Smart Tools." },

  // Hasil & penjualan
  { text: "Penjualan turun bukan selalu karena produk. Seringnya karena pesan yang kurang tepat." },
  { text: "Caption yang tepat bisa mengubah orang yang cuma lihat jadi orang yang beli." },
  { text: "Iklan yang ditulis ulang dengan hook lebih kuat bisa menurunkan biaya per order." },
  { text: "Pelanggan lama adalah aset. Minta AI susun pesan broadcast yang bikin mereka balik lagi." },
  { text: "Listing marketplace yang jelas lebih mudah ditemukan pembeli." },
  { text: "Persona yang jelas membuat setiap rupiah iklan lebih tepat sasaran." },
  { text: "Promo tanpa strategi cuma memotong margin. Promo dengan strategi menambah pelanggan." },
  { text: "Satu insight tajam tentang pelangganmu bisa mengubah seluruh cara kamu berjualan." },
  { text: "Konten yang terencana menghasilkan penjualan yang lebih bisa diprediksi." },
  { text: "Brand yang tahu kenapa orang membeli, tahu cara menjual lebih banyak." },

  // Rasa "kok aku belum pakai?"
  { text: "Bayangkan punya konsultan marketing yang selalu bisa ditanya kapan saja." },
  { text: "Pernah merasa ide promo habis? Itu tandanya kamu butuh partner berpikir." },
  { text: "Kamu ahli di produkmu. Biar Marqthink bantu di marketingnya." },
  { text: "Marketing bukan soal kerja lebih keras, tapi kerja lebih cerdas." },
  { text: "Kalau kamu masih mengerjakan semuanya sendiri, sekarang waktunya dibantu." },
  { text: "Pertanyaan yang sama ke konsultan bisa ditagih per jam. Di sini, tanya sepuasnya sesuai paket." },
  { text: "Bisnis kamu layak punya strategi, bukan cuma semangat." },
  { text: "Hari ini satu pertanyaan, besok satu strategi, bulan depan brand yang lebih kuat." },
  { text: "Brand besar punya tim marketing. Sekarang brand kamu juga bisa punya." },
  { text: "Setiap brand butuh otak yang berpikir untuknya. Sudah punya?" },
];
