/**
 * 100 kata-kata marketing untuk pop-up kecil di landing (pojok kanan bawah, berganti terus).
 * Gaya: kata mutiara marketing yang singkat, tapi dipilih agar pembaca merasa "bener juga, brand-ku
 * butuh strategi/otak marketing" → mendorong berlangganan secara halus (tanpa jualan keras).
 * `by` = tokoh (kutipan terkenal, diterjemahkan). Tanpa `by` = kata-kata tim Marqthink.
 * Jaga tiap kalimat ≤ 100 karakter agar muat di pop-up HP.
 */
export interface MarketingQuote {
  text: string;
  by?: string;
}

export const MARKETING_QUOTES: MarketingQuote[] = [
  // Tokoh dunia
  { text: "Brand kamu adalah apa yang orang katakan saat kamu tidak ada di ruangan.", by: "Jeff Bezos" },
  { text: "Orang tidak membeli apa yang kamu lakukan, tapi alasan kamu melakukannya.", by: "Simon Sinek" },
  { text: "Marketing bukan soal barang yang kamu buat, tapi cerita yang kamu sampaikan.", by: "Seth Godin" },
  { text: "Marketing terbaik tidak terasa seperti marketing.", by: "Tom Fishburne" },
  { text: "Kalau tidak menjual, itu bukan kreatif.", by: "David Ogilvy" },
  { text: "Separuh uang iklan saya terbuang. Masalahnya, saya tidak tahu yang mana.", by: "John Wanamaker" },
  { text: "Kalau kamu bukan brand, kamu cuma komoditas.", by: "Philip Kotler" },
  { text: "Jangan cari pelanggan untuk produkmu. Cari produk untuk pelangganmu.", by: "Seth Godin" },
  { text: "Bos itu cuma satu: pelanggan.", by: "Sam Walton" },
  { text: "Harga adalah yang kamu bayar. Nilai adalah yang kamu dapat.", by: "Warren Buffett" },
  { text: "Konten adalah raja.", by: "Bill Gates" },
  { text: "Marketing terlalu penting untuk diserahkan hanya ke divisi marketing.", by: "David Packard" },
  { text: "Berhenti jualan. Mulai membantu.", by: "Zig Ziglar" },
  { text: "Kualitas akan diingat lama setelah harganya dilupakan.", by: "Aldo Gucci" },
  { text: "Orang membeli hubungan, cerita, dan keajaiban.", by: "Seth Godin" },

  // Strategi & berpikir
  { text: "Strategi tanpa riset itu tebak-tebakan yang mahal." },
  { text: "Brand yang tidak dipikirkan akan cepat dilupakan." },
  { text: "Kerja keras itu penting. Kerja dengan strategi jauh lebih penting." },
  { text: "Pertanyaan yang tepat lebih berharga daripada seribu jawaban cepat." },
  { text: "Marketing tanpa data itu cuma opini yang mahal." },
  { text: "Yang menang bukan yang paling besar, tapi yang paling cepat belajar." },
  { text: "Rencana yang dijalankan selalu mengalahkan rencana sempurna di kepala." },
  { text: "Kalau kamu tidak punya strategi, kamu jadi bagian dari strategi orang lain." },
  { text: "Feeling bagus untuk memulai. Data bagus untuk menang." },
  { text: "Satu insight tajam bisa mengalahkan sepuluh ide biasa." },
  { text: "Bisnis kamu layak punya strategi, bukan cuma semangat." },
  { text: "Tanpa arah, budget sebesar apa pun akan habis sia-sia." },
  { text: "Marketing yang ditunda hari ini adalah penjualan yang hilang besok." },
  { text: "Brand kuat dibangun dari keputusan kecil yang benar setiap hari." },
  { text: "Jangan tebak apa yang pelanggan mau. Cari tahu." },

  // Brand
  { text: "Setiap brand butuh otak yang berpikir untuknya." },
  { text: "Think like a brand. Tanya dulu, baru jualan." },
  { text: "Brand yang ingin disukai semua orang biasanya tidak diingat siapa pun." },
  { text: "Logo membuat orang mengenali. Pengalaman membuat orang kembali." },
  { text: "Konsisten itu membosankan buatmu, tapi menenangkan buat pelanggan." },
  { text: "Jangan bersaing di harga kalau kamu bisa bersaing di makna." },
  { text: "Brand itu janji. Marketing cara menyampaikannya. Produk cara menepatinya." },
  { text: "Brand besar dulunya juga brand kecil yang berpikir besar." },
  { text: "Positioning itu soal berani memilih siapa yang kamu layani." },
  { text: "Kalau bedamu tidak bisa dijelaskan satu kalimat, brand-mu belum selesai." },
  { text: "Produk bagus yang tidak dikenal kalah oleh produk biasa yang dikenal." },
  { text: "Brand tidak dibangun dalam sehari, tapi bisa mulai dibangun hari ini." },
  { text: "Orang lupa iklanmu, tapi ingat perasaan yang kamu berikan." },
  { text: "Brand yang punya cerita selalu lebih mahal dari brand yang punya diskon." },
  { text: "Identitas yang jelas membuat setiap konten punya rumah." },

  // Konten
  { text: "Tiga detik pertama menentukan nasib tiga puluh detik sisanya." },
  { text: "Hook membuat orang berhenti scroll. Isi membuat orang membeli." },
  { text: "Konten viral itu bonus. Konten konsisten itu pondasi." },
  { text: "Satu konten, satu pesan. Kalau semua dibilang, tidak ada yang diingat." },
  { text: "Edukasi membangun kepercayaan. Kepercayaan membuka dompet." },
  { text: "Jual manfaatnya, bukan fiturnya. Orang beli lubang, bukan bor." },
  { text: "Tulis seperti ngobrol dengan satu orang, bukan pidato ke seribu orang." },
  { text: "Caption terbaik menjawab satu hal: kenapa aku harus peduli?" },
  { text: "Judul yang membosankan membunuh isi yang luar biasa." },
  { text: "Ide habis bukan karena kamu tidak kreatif, tapi karena kamu sendirian." },
  { text: "Kalender konten membuat kamu konsisten, bahkan di hari tanpa ide." },
  { text: "Bicara dengan bahasa pelanggan, bukan bahasa brosur." },
  { text: "Konten yang terencana menjual lebih banyak dari konten dadakan." },
  { text: "Storytelling membuat fakta terasa dekat." },
  { text: "Brand yang diam di media sosial perlahan dilupakan." },

  // Iklan & angka
  { text: "Iklan tidak menyelamatkan pesan yang salah." },
  { text: "Uji kecil dulu, lalu besarkan yang terbukti berhasil." },
  { text: "Kalau tidak diukur, kamu sedang menebak, bukan marketing." },
  { text: "Klik itu murah. Kepercayaan itu mahal." },
  { text: "Budget kecil dengan strategi tepat mengalahkan budget besar tanpa arah." },
  { text: "Target terlalu luas membuat iklan mahal dan pesan jadi hambar." },
  { text: "Data memberi tahu apa yang terjadi. Pelanggan memberi tahu kenapa." },
  { text: "Iklan bagus ke orang yang salah tetap uang terbuang." },
  { text: "Setiap rupiah iklan harus punya alasan." },
  { text: "Hitung dulu sebelum bakar uang." },

  // Pelanggan
  { text: "Pelanggan membeli perasaan, lalu membenarkannya dengan logika." },
  { text: "Mempertahankan pelanggan lebih murah daripada mencari yang baru." },
  { text: "Pelanggan tidak peduli seberapa banyak kamu tahu, sampai mereka tahu kamu peduli." },
  { text: "Kenali pelangganmu lebih baik dari kompetitormu mengenalnya." },
  { text: "Komplain adalah konsultasi gratis dari pelanggan." },
  { text: "Repeat order adalah tanda kamu sudah dipercaya." },
  { text: "Jual solusi untuk masalahnya, bukan daftar produkmu." },
  { text: "Pelanggan yang paham nilaimu tidak akan menawar harga." },
  { text: "Orang tidak menolak dijual. Mereka menolak dijual dengan cara yang salah." },
  { text: "Persona yang jelas membuat setiap pesan punya alamat." },

  // Persaingan & waktu
  { text: "Kompetitormu tidak menunggu kamu siap." },
  { text: "Pasar berubah setiap minggu. Strategimu juga harus ikut berpikir." },
  { text: "Yang lambat beradaptasi akan disalip yang lebih kecil tapi lebih cepat." },
  { text: "Tren datang dan pergi. Brand yang siap selalu menangkapnya duluan." },
  { text: "Ide bagus yang telat kalah dengan ide biasa yang tepat waktu." },
  { text: "Waktu terbaik membangun brand adalah kemarin. Waktu terbaik kedua: sekarang." },
  { text: "Bukan yang paling sibuk yang menang, tapi yang paling terarah." },
  { text: "Hari ini dipakai bingung, besok dipakai mengejar ketinggalan." },
  { text: "Kompetitor kamu mungkin sudah memakai AI. Kamu kapan?" },
  { text: "Dunia sudah berubah. Cara berpikir marketing juga harus berubah." },

  // Dorongan memulai
  { text: "Kamu ahli di produkmu. Biarkan otak marketing membantu sisanya." },
  { text: "Marketing bukan biaya. Marketing adalah investasi yang bisa diukur." },
  { text: "Langkah pertama paling sulit. Mulailah dengan satu pertanyaan." },
  { text: "Brand kecil butuh strategi besar, bukan budget besar." },
  { text: "Bayangkan punya konsultan marketing yang bisa ditanya kapan saja." },
  { text: "Jangan kerjakan semuanya sendiri. Brand hebat dibangun bersama." },
  { text: "Satu keputusan marketing yang tepat bisa mengubah satu tahun penjualan." },
  { text: "Lebih baik bertanya hari ini daripada menyesal di akhir bulan." },
  { text: "Brand besar punya tim yang berpikir. Brand kamu juga layak punya." },
  { text: "Hari ini satu pertanyaan. Besok satu strategi. Tahun depan satu brand kuat." },
];
