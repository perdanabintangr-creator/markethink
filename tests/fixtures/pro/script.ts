/** Contoh hasil AI untuk tool "script" (dipakai tes file & pratinjau tampilan). */
const fixture = {
  tool: "script",
  input: {
    brand: "Sejuk Skin",
    platform: "tiktok",
    topic:
      "Serum niacinamide 5% + centella Rp89rb (30 ml), dijual di TikTok Shop. Pesan: membantu menyamarkan bekas jerawat dalam 4 minggu pemakaian rutin, ringan untuk kulit berminyak. Target cewek 18-28 th yang tiap hari pakai concealer tebal buat nutup bekas jerawat.",
    duration: "30",
    objective: "jualan",
    styles: ["pov", "talking_head", "review_ugc"],
    count: 3,
    talent: "owner cewek 25 th, HP + ring light, tanpa mic",
    tone: "santai kayak curhat ke bestie",
  },
  kinds: ["xlsx"],
  output: {
    summary:
      "Penontonnya cewek kuliahan dan first jobber yang capek nutup bekas jerawat tiap pagi. Tiga naskah ini menyerang dari tiga pintu: rasa relate (POV concealer), rasa penasaran (kesalahan pemakaian), dan bukti (diary 28 hari) — semuanya berujung ke keranjang kuning dengan harga Rp89rb disebut jelas.",
    scripts: [
      {
        title: "POV: concealer kamu makin tipis tiap minggu",
        angle: "Rutinitas pagi yang makan waktu karena bekas jerawat. Janji: makin sedikit concealer yang dibutuhkan setelah pemakaian rutin.",
        style: "POV",
        hooks: [
          { text: "POV: kamu sadar concealer-mu awet banget bulan ini", visual: "Close-up tangan memegang tube concealer yang masih penuh, dibandingkan tube kosong bulan lalu." },
          { text: "Dulu 3 lapis, sekarang cukup tap tipis", visual: "Split screen: kiri spons penuh concealer, kanan jari tap sedikit di pipi." },
          { text: "Bekas jerawat ini dulu yang bikin aku telat ngantor", visual: "Jam dinding 07.45 lalu cut ke wajah tanpa makeup di depan cermin." },
        ],
        scenes: [
          { start: 0, end: 3, time: "0-3 dtk", shot: "Close-up dua tube concealer: satu kosong, satu masih penuh. Tangan menaruhnya di meja rias.", on_screen: "POV: concealer-mu awet banget bulan ini", voice_over: "", audio: "Sound tren santai, volume naik di detik 1" },
          { start: 3, end: 8, time: "3-8 dtk", shot: "Medium shot talent di depan cermin, menunjuk pipi yang dulu penuh bekas jerawat (foto lama di HP ditunjukkan ke kamera).", on_screen: "Dulu: 3 lapis tiap pagi", voice_over: "Dulu tiap pagi aku numpuk concealer tiga lapis, itu pun masih kelihatan.", audio: "SFX swipe saat foto lama muncul" },
          { start: 8, end: 15, time: "8-15 dtk", shot: "Close-up meneteskan 2 tetes serum ke telapak tangan, tekstur cair bening, lalu ditepuk ke pipi.", on_screen: "2 tetes, pagi & malam", voice_over: "Sebulan ini aku pakai serum niacinamide-nya Sejuk Skin, dua tetes pagi dan malam. Teksturnya cair, gak lengket di kulit berminyak.", audio: "Beat tetap, SFX tetes air halus" },
          { start: 15, end: 22, time: "15-22 dtk", shot: "Close-up pipi di cahaya jendela yang sama dengan foto lama, lalu tap concealer tipis satu kali.", on_screen: "Sekarang: tap tipis aja", voice_over: "Sekarang bekasnya udah jauh lebih samar. Concealer cukup tap tipis, berangkat lebih cepet.", audio: "SFX ding kecil saat concealer selesai" },
          { start: 22, end: 27, time: "22-27 dtk", shot: "Medium shot talent memegang botol serum ke kamera, label terlihat jelas.", on_screen: "Rp89rb · 30 ml", voice_over: "Harganya delapan puluh sembilan ribu, satu botol cukup buat sebulan lebih.", audio: "Beat drop ringan" },
          { start: 27, end: 30, time: "27-30 dtk", shot: "Talent menunjuk ke kiri bawah layar sambil senyum.", on_screen: "Cek keranjang kuning", voice_over: "Klik keranjang kuning, ya.", audio: "Musik fade out" },
        ],
        cta: "\"Klik keranjang kuning, ya\" + teks layar \"Cek keranjang kuning\" sambil menunjuk kiri bawah.",
        caption: "Concealer awet sebulan itu ternyata nyata 🥲\n\nDua tetes niacinamide pagi & malam, bekas jerawat makin samar dalam 4 minggu.\n\nCek keranjang kuning, lagi ada harga Rp89rb.",
        hashtags: ["bekasjerawat", "niacinamide", "skincarekulitberminyak", "racuntiktok", "sejukskin"],
        props: "Meja rias dekat jendela (cahaya pagi), 2 tube concealer (1 kosong), botol serum, foto lama di HP. Wardrobe kaus polos warna terang.",
        editing: "Cut tiap 3-5 detik, zoom-in 110% di close-up kulit. Subtitle burn-in kuning tebal di tengah layar. Foto lama tampil dengan efek swipe. Cover: dua tube concealer + teks \"concealer awet sebulan\".",
        why: "Membuka dengan objek (tube kosong vs penuh) yang langsung dipahami tanpa suara, memicu identifikasi diri. Bukti visual di cahaya yang sama membuat klaim terasa jujur; harga disebut sebelum CTA sehingga klik yang masuk sudah siap beli.",
      },
      {
        title: "3 kesalahan pakai niacinamide",
        angle: "Mitos vs fakta: banyak yang merasa niacinamide gak mempan padahal cara pakainya keliru. Janji: penonton tahu cara yang benar.",
        style: "Talking head",
        hooks: [
          { text: "Niacinamide kamu gak mempan? Bisa jadi karena 3 hal ini", visual: "Talent memegang botol serum, mengangkat 3 jari ke kamera." },
          { text: "Stop campur niacinamide sama ini kalau kulitmu gampang merah", visual: "Talent menyilangkan dua botol skincare lalu menggeleng." },
          { text: "Aku hampir nyerah pakai niacinamide, ternyata salahnya di sini", visual: "Talent menghela napas, menaruh botol di meja dengan kesal (akting ringan)." },
        ],
        scenes: [
          { start: 0, end: 3, time: "0-3 dtk", shot: "Medium close-up talent mengangkat 3 jari, botol serum di tangan lain.", on_screen: "Niacinamide gak mempan? Cek 3 hal ini", voice_over: "Niacinamide kamu gak mempan? Bisa jadi karena tiga hal ini.", audio: "Beat cepat, SFX pop di tiap jari" },
          { start: 3, end: 10, time: "3-10 dtk", shot: "Talent bicara ke kamera; b-roll kalender dengan coretan 1 minggu.", on_screen: "1. Baru seminggu udah berhenti", voice_over: "Satu, baru seminggu udah berhenti. Bekas jerawat butuh waktu, minimal empat minggu rutin.", audio: "SFX pop" },
          { start: 10, end: 17, time: "10-17 dtk", shot: "Close-up tangan menuang serum terlalu banyak sampai menetes, lalu cut ke 2 tetes.", on_screen: "2. Kebanyakan ≠ lebih cepat", voice_over: "Dua, makin banyak bukan makin cepet. Cukup dua tetes, kebanyakan malah bikin lengket.", audio: "SFX pop" },
          { start: 17, end: 24, time: "17-24 dtk", shot: "Close-up botol sunscreen diletakkan di samping serum.", on_screen: "3. Skip sunscreen", voice_over: "Tiga, skip sunscreen. Bekas jerawat makin gelap kena matahari, jadi pagi wajib sunscreen.", audio: "SFX pop" },
          { start: 24, end: 30, time: "24-30 dtk", shot: "Talent menunjukkan botol Sejuk Skin, lalu menunjuk kiri bawah.", on_screen: "Rp89rb di keranjang kuning", voice_over: "Aku pakai yang lima persen dari Sejuk Skin, delapan puluh sembilan ribu. Ada di keranjang kuning.", audio: "Beat drop, fade out" },
        ],
        cta: "\"Ada di keranjang kuning\" + teks layar harga.",
        caption: "Yang nomor 3 paling sering di-skip 👀\n\nSimpan biar gak salah lagi. Serumnya ada di keranjang kuning ya.",
        hashtags: ["niacinamide", "tipsskincare", "bekasjerawat", "skincareroutine"],
        props: "Background polos rapi, botol serum, sunscreen, kalender kertas, tisu untuk tetesan.",
        editing: "Nomor besar (1, 2, 3) muncul tiap poin dengan SFX pop. Jump cut untuk buang jeda napas. Subtitle burn-in di tengah. Cover: talent + teks \"3 kesalahan niacinamide\".",
        why: "Format daftar bernomor menahan retensi karena penonton menunggu poin terakhir. Kesalahan yang relatable memancing komentar \"aku banget\" dan save, lalu produk hadir sebagai solusi wajar.",
      },
      {
        title: "Diary 28 hari pakai serum",
        angle: "Bukti bertahap: perubahan hari ke-1, 7, 14, 28 dengan cahaya yang sama. Janji: penonton melihat sendiri progresnya.",
        style: "Review / UGC",
        hooks: [
          { text: "Hari ke-1 vs hari ke-28, cahaya sama, tanpa filter", visual: "Split screen pipi hari ke-1 dan hari ke-28." },
          { text: "Aku foto pipiku tiap minggu selama sebulan", visual: "Montase cepat 4 foto close-up pipi dengan tanggal di pojok." },
          { text: "Ini bukan endorse, ini diary bekas jerawatku", visual: "Talent memegang HP menunjukkan galeri foto pipi." },
        ],
        scenes: [
          { start: 0, end: 3, time: "0-3 dtk", shot: "Split screen close-up pipi hari ke-1 vs hari ke-28.", on_screen: "Hari 1 vs hari 28 · tanpa filter", voice_over: "Hari pertama versus hari ke dua puluh delapan.", audio: "Sound tren emosional pelan" },
          { start: 3, end: 9, time: "3-9 dtk", shot: "Talent di depan jendela memegang HP, menunjukkan galeri foto.", on_screen: "Cahaya & angle sama tiap foto", voice_over: "Aku foto di jendela yang sama tiap minggu biar adil.", audio: "Musik lanjut" },
          { start: 9, end: 16, time: "9-16 dtk", shot: "Montase foto hari 7 dan 14 dengan tanggal di pojok.", on_screen: "Hari 7 → hari 14", voice_over: "Minggu pertama belum kelihatan. Minggu kedua warna merahnya mulai turun.", audio: "SFX klik kamera tiap foto" },
          { start: 16, end: 24, time: "16-24 dtk", shot: "Close-up pipi hari ke-28 secara langsung, talent menyentuh pipi.", on_screen: "Hari 28", voice_over: "Hari ke dua puluh delapan, bekasnya udah jauh lebih samar. Aku pakai dua tetes pagi dan malam.", audio: "Musik naik" },
          { start: 24, end: 30, time: "24-30 dtk", shot: "Talent memegang botol ke kamera lalu menunjuk keranjang.", on_screen: "Sejuk Skin Niacinamide · Rp89rb", voice_over: "Serumnya Sejuk Skin, delapan puluh sembilan ribu, cek keranjang kuning.", audio: "Fade out" },
        ],
        cta: "\"Cek keranjang kuning\" sambil menunjuk kiri bawah.",
        caption: "Diary 28 hari, cahaya sama, tanpa filter.\n\nHasil tiap kulit bisa beda ya, tapi buatku ini worth it. Serum ada di keranjang kuning.",
        hashtags: ["diaryskincare", "bekasjerawat", "niacinamide", "beforeafter"],
        props: "Foto pipi mingguan (ambil sejak hari 1), jendela dengan cahaya pagi, botol serum, HP kedua untuk merekam layar galeri.",
        editing: "Split screen di 3 detik pertama, tanggal di pojok tiap foto. Transisi klik kamera. Subtitle putih dengan outline hitam. Cover: split hari 1 vs 28.",
        why: "Result-first di detik pertama memancing rasa penasaran dan rewatch. Konsistensi cahaya & pengakuan \"hasil tiap kulit bisa beda\" menaikkan kepercayaan dan mengurangi komentar skeptis.",
      },
    ],
    tips: [
      { title: "Uji 3 hook", detail: "Posting body yang sama dengan hook berbeda selang 2 hari. Pertahankan hook dengan retensi detik ke-3 tertinggi, sisanya jadi bahan iklan Spark Ads." },
      { title: "Jam tayang", detail: "Coba 11.30-12.30 (jam istirahat) dan 19.00-21.00. Evaluasi 48 jam setelah posting, bukan 2 jam." },
      { title: "Pantau retensi", detail: "Bila penonton banyak keluar sebelum detik ke-5, perbaiki hook atau re-hook; bila keluar di tengah, potong adegan yang tidak menambah bukti." },
      { title: "Balas komentar dengan video", detail: "Komentar \"beneran ngaruh?\" dijawab dengan video reply diary hari 28 — konten baru tanpa ide baru." },
      { title: "Repurpose", detail: "Upload versi tanpa watermark ke Reels dengan cover 4:5; ganti CTA jadi \"link di bio\"." },
    ],
  },
};

export default fixture;
