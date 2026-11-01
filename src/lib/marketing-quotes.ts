/**
 * 100 kata-kata marketing untuk pop-up di landing page (bergantian terus).
 * `by` = tokoh (kutipan terkenal, diterjemahkan); tanpa `by` = tips dari tim Marqthink.
 * Jaga tiap kalimat ≤ 140 karakter agar muat di pop-up HP.
 */
export interface MarketingQuote {
  text: string;
  by?: string;
}

export const MARKETING_QUOTES: MarketingQuote[] = [
  // Tokoh dunia (terjemahan bebas)
  { text: "Brand kamu adalah apa yang orang katakan tentangmu saat kamu tidak ada di ruangan.", by: "Jeff Bezos" },
  { text: "Orang tidak membeli apa yang kamu lakukan, mereka membeli alasan kenapa kamu melakukannya.", by: "Simon Sinek" },
  { text: "Tujuan marketing adalah memahami pelanggan begitu dalam, sampai produkmu terjual dengan sendirinya.", by: "Peter Drucker" },
  { text: "Marketing bukan lagi soal barang yang kamu buat, tapi soal cerita yang kamu sampaikan.", by: "Seth Godin" },
  { text: "Marketing terbaik tidak terasa seperti marketing.", by: "Tom Fishburne" },
  { text: "Konten adalah raja.", by: "Bill Gates" },
  { text: "Jangan cari pelanggan untuk produkmu. Cari produk untuk pelangganmu.", by: "Seth Godin" },
  { text: "Buat sederhana. Buat mudah diingat. Buat enak dilihat. Buat seru dibaca.", by: "Leo Burnett" },
  { text: "Konsumen itu bukan orang bodoh. Dia istrimu.", by: "David Ogilvy" },
  { text: "Kalau tidak menjual, itu bukan kreatif.", by: "David Ogilvy" },
  { text: "Separuh uang iklan saya terbuang. Masalahnya, saya tidak tahu yang separuh mana.", by: "John Wanamaker" },
  { text: "Pelanggan yang paling kecewa adalah sumber belajar terbesarmu.", by: "Bill Gates" },
  { text: "Brand bukan lagi apa yang kita katakan ke konsumen, tapi apa yang konsumen katakan satu sama lain.", by: "Scott Cook" },
  { text: "Konten yang bagus bukan soal pandai bercerita, tapi menceritakan kisah yang benar dengan baik.", by: "Ann Handley" },
  { text: "Orang tidak membeli barang dan jasa. Mereka membeli hubungan, cerita, dan keajaiban.", by: "Seth Godin" },
  { text: "Marketing terlalu penting untuk diserahkan hanya ke divisi marketing.", by: "David Packard" },
  { text: "Kalau kamu bukan brand, kamu cuma komoditas.", by: "Philip Kotler" },
  { text: "Bos itu cuma satu: pelanggan.", by: "Sam Walton" },
  { text: "Berhenti jualan. Mulai membantu.", by: "Zig Ziglar" },
  { text: "Iklan itu bilang kamu bagus. PR itu membuat orang lain yang bilang kamu bagus.", by: "Jean-Louis Gassée" },
  { text: "Kualitas akan diingat lama setelah harganya dilupakan.", by: "Aldo Gucci" },
  { text: "Kerjakan dengan sangat baik sampai orang ingin datang lagi dan membawa teman-temannya.", by: "Walt Disney" },
  { text: "Pelanggan tidak akan mencintai perusahaan sebelum karyawannya mencintainya lebih dulu.", by: "Simon Sinek" },
  { text: "Harga adalah yang kamu bayar. Nilai adalah yang kamu dapat.", by: "Warren Buffett" },
  { text: "Butuh 20 tahun membangun reputasi, dan lima menit untuk menghancurkannya.", by: "Warren Buffett" },
  { text: "Dekati pelangganmu sampai kamu tahu kebutuhan mereka sebelum mereka sendiri menyadarinya.", by: "Steve Jobs" },

  // Tips Marqthink: brand & positioning
  { text: "Brand yang ingin disukai semua orang biasanya tidak diingat siapa pun." },
  { text: "Positioning itu soal berani memilih: siapa yang kamu layani, dan siapa yang tidak." },
  { text: "Kalau pelanggan tidak bisa menjelaskan bedamu dalam satu kalimat, brand-mu belum selesai." },
  { text: "Logo bikin orang mengenali. Pengalaman bikin orang kembali." },
  { text: "Konsisten itu membosankan buat kamu, tapi menenangkan buat pelanggan." },
  { text: "Brand kuat bukan yang paling sering muncul, tapi yang paling cepat diingat." },
  { text: "Jangan bersaing di harga kalau kamu bisa bersaing di makna." },
  { text: "Niche kecil yang setia lebih berharga daripada pasar besar yang cuek." },
  { text: "Warna dan font itu identitas. Gaya bahasa itu kepribadian." },
  { text: "Setiap brand butuh otak yang berpikir untuknya." },
  { text: "Think like a brand: tanya dulu, baru jualan." },
  { text: "Brand itu janji. Marketing itu cara menyampaikan janji. Produk itu cara menepatinya." },

  // Konten & copywriting
  { text: "Tiga detik pertama video menentukan nasib tiga puluh detik sisanya." },
  { text: "Hook yang bagus bikin orang berhenti scroll. Isi yang bagus bikin orang save." },
  { text: "Tulis seperti kamu ngobrol dengan satu orang, bukan berpidato ke seribu orang." },
  { text: "Jual manfaatnya, bukan fiturnya. Orang beli lubang, bukan bor." },
  { text: "Caption terbaik menjawab satu pertanyaan: kenapa aku harus peduli?" },
  { text: "Satu konten, satu pesan. Kalau semua dibilang, tidak ada yang diingat." },
  { text: "Edukasi membangun kepercayaan. Kepercayaan membuka dompet." },
  { text: "Pola konten aman: tiga kali memberi, satu kali meminta." },
  { text: "Konten viral itu bonus. Konten konsisten itu pondasi." },
  { text: "Tunjukkan prosesnya. Orang suka melihat di balik layar." },
  { text: "Testimoni pelanggan selalu lebih meyakinkan daripada pujian dari brand sendiri." },
  { text: "CTA yang jelas mengalahkan desain yang cantik." },
  { text: "Judul yang membosankan membunuh isi yang luar biasa." },
  { text: "Kalau kontenmu bisa ditempel logo kompetitor tanpa terasa aneh, berarti belum khas." },
  { text: "Storytelling bukan dongeng. Ini cara membuat fakta terasa dekat." },
  { text: "Bicara bahasa pelanggan, bukan bahasa brosur." },
  { text: "Kalender konten bikin kamu konsisten, bahkan di hari tanpa ide." },
  { text: "Repurpose: satu ide bisa jadi Reels, carousel, story, dan broadcast WA." },

  // Iklan & angka
  { text: "Iklan tidak menyelamatkan produk yang tidak dicari orang." },
  { text: "Uji kecil dulu, baru naikkan budget di iklan yang terbukti jalan." },
  { text: "ROAS tinggi tanpa repeat order hanya menunda masalah." },
  { text: "Kalau tidak diukur, kamu sedang menebak, bukan marketing." },
  { text: "Biaya per order yang aman dihitung dari margin, bukan dari harapan." },
  { text: "Target yang terlalu luas bikin iklan mahal dan pesan jadi hambar." },
  { text: "Satu iklan, satu audiens, satu pesan. Lalu uji A/B." },
  { text: "Data memberi tahu apa yang terjadi. Pelanggan memberi tahu kenapa." },
  { text: "Jangan matikan iklan terlalu cepat. Beri waktu algoritma belajar." },
  { text: "Klik itu murah. Kepercayaan itu mahal." },
  { text: "Lihat angka mingguan, bukan panik dengan angka harian." },
  { text: "Iklan bagus di landing page jelek tetap jadi uang terbuang." },

  // Pelanggan & penjualan
  { text: "Mempertahankan pelanggan lama jauh lebih murah daripada mencari yang baru." },
  { text: "Pelanggan yang puas bercerita ke beberapa orang. Yang kecewa bercerita ke semua orang." },
  { text: "Balas komentar dan DM secepatnya. Respons cepat adalah marketing gratis." },
  { text: "Pelanggan tidak peduli seberapa banyak yang kamu tahu, sampai mereka tahu kamu peduli." },
  { text: "Repeat order adalah tanda brand-mu sudah dipercaya." },
  { text: "Program loyalitas terbaik adalah pelayanan yang bikin pelanggan kangen." },
  { text: "Tanya pelangganmu. Jawaban terbaik sering datang dari mereka." },
  { text: "Pelanggan membeli perasaan, lalu membenarkannya dengan logika." },
  { text: "Broadcast WA ke pelanggan lama sering lebih ampuh daripada iklan ke orang asing." },
  { text: "Komplain adalah konsultasi gratis dari pelanggan." },
  { text: "Jual solusi untuk masalahnya, bukan daftar produkmu." },
  { text: "Bundling yang tepat menaikkan nilai belanja tanpa perang harga." },

  // Riset & strategi
  { text: "Strategi tanpa riset itu tebak-tebakan yang mahal." },
  { text: "Kenali kompetitormu, tapi jangan sibuk meniru mereka." },
  { text: "Pertanyaan yang tepat lebih berharga daripada jawaban yang cepat." },
  { text: "Persona yang jelas membuat setiap konten punya alamat." },
  { text: "Tren itu datang dan pergi. Kebutuhan pelanggan tetap tinggal." },
  { text: "Rencana sederhana yang dijalankan mengalahkan rencana sempurna di laci." },
  { text: "Mulai dari masalah pelanggan, bukan dari produk yang ingin dijual." },
  { text: "Waktu terbaik untuk riset pasar adalah sebelum produksi, bukan setelah stok menumpuk." },
  { text: "Satu insight yang tajam bisa mengalahkan sepuluh ide yang biasa." },
  { text: "Evaluasi setiap minggu. Marketing itu siklus, bukan sekali jalan." },

  // UMKM & semangat
  { text: "UMKM tidak butuh budget besar. UMKM butuh pesan yang tepat ke orang yang tepat." },
  { text: "Brand besar dulunya juga brand kecil yang konsisten." },
  { text: "Jangan tunggu sempurna untuk mulai posting. Mulai, lalu perbaiki." },
  { text: "Foto produk yang jelas menjual lebih banyak daripada caption yang panjang." },
  { text: "Pasar lokal punya bahasanya sendiri. Pakai, jangan diterjemahkan dari luar." },
  { text: "Toko yang ramai di online dimulai dari pelanggan pertama yang dilayani dengan sepenuh hati." },
  { text: "Konsistensi kecil setiap hari mengalahkan kampanye besar sesekali." },
  { text: "Marketing bukan biaya, tapi investasi yang harus bisa diukur hasilnya." },
  { text: "Kerja keras penting. Kerja dengan data lebih penting." },
  { text: "Hari ini satu postingan, besok satu pelanggan, tahun depan satu brand." },
];
