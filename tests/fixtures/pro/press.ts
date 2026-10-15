/** Contoh hasil AI untuk tool "press" (dipakai tes file & pratinjau tampilan). */
const fixture = {
  tool: "press",
  input: {
    organization: "PT Kopi Senja Nusantara",
    type: "milestone",
    details:
      "Kopi Senja membuka gerai ke-50 di Bandung (Jl. Braga No. 12) pada 3 November 2026. Sejak berdiri 2019 di Yogyakarta, sudah melayani 2,1 juta transaksi. Gerai ini mempekerjakan 18 warga sekitar dan memakai 100% biji kopi dari 40 petani Pangalengan. Promo pembukaan beli 1 gratis 1 selama 3 hari.",
    spokesperson: "Rina Hartono, CEO Kopi Senja; Asep Sutisna, Ketua Kelompok Tani Pangalengan",
    dateline: "Bandung, 3 November 2026",
    contact: "Dewi Lestari (PR Kopi Senja) · 0812-3456-7890 · pr@kopisenja.id",
    boilerplate: "",
    target_media: ["nasional", "bisnis", "lifestyle", "lokal"],
  },
  kinds: ["xlsx"],
  output: {
    headlines: [
      {
        title: "Kopi Senja Buka Gerai ke-50 di Braga, Seluruh Bijinya dari 40 Petani Pangalengan",
        subtitle: "Gerai Bandung menyerap 18 warga sekitar dan memakai 100 persen biji kopi dari satu kelompok tani di Kabupaten Bandung.",
        angle: "dampak ke petani lokal",
      },
      {
        title: "Tujuh Tahun Sejak Berdiri, Kopi Senja Capai 50 Gerai dan 2,1 Juta Transaksi",
        subtitle: "Gerai ke-50 di Jalan Braga, Bandung, dibuka Selasa (3/11/2026) dengan promo beli satu gratis satu selama tiga hari.",
        angle: "angka pertumbuhan",
      },
      {
        title: "Kopi Senja Hadir di Braga, Rekrut 18 Warga Sekitar untuk Gerai ke-50",
        subtitle: "Pembukaan gerai di kawasan heritage Bandung disertai kemitraan pasokan dengan kelompok tani Pangalengan.",
        angle: "lapangan kerja lokal",
      },
    ],
    dateline: "BANDUNG, 3 November 2026",
    lead:
      "PT Kopi Senja Nusantara membuka gerai ke-50 di Jalan Braga No. 12, Bandung, Selasa (3/11/2026). Gerai ini menjadi yang pertama memakai seluruh biji kopi dari 40 petani di Pangalengan, Kabupaten Bandung.",
    body: [
      "Gerai Braga mempekerjakan 18 warga sekitar sebagai barista, kasir, dan staf dapur. Pembukaan ini menandai tujuh tahun perjalanan Kopi Senja sejak gerai pertamanya di Yogyakarta pada 2019, dengan total 2,1 juta transaksi di seluruh gerai.",
      "Pasokan biji kopi gerai Bandung berasal dari kemitraan dengan Kelompok Tani Pangalengan yang beranggotakan 40 petani. Kopi Senja membeli hasil panen langsung dari kelompok tani tanpa perantara, dengan kontrak pembelian [volume per bulan / durasi kontrak].",
      "Untuk menyambut pembukaan, Kopi Senja memberikan promo beli satu gratis satu untuk seluruh menu kopi susu pada 3-5 November 2026. Gerai buka setiap hari pukul 07.00-22.00 WIB dan melayani pesanan lewat GoFood, GrabFood, dan ShopeeFood.",
      "Setelah Bandung, Kopi Senja berencana [rencana ekspansi berikutnya: kota & jumlah gerai] dan memperluas kemitraan pasokan dengan kelompok tani di daerah gerai baru.",
    ],
    quotes: [
      {
        speaker: "Rina Hartono, CEO Kopi Senja",
        paragraph:
          "“Waktu survei lokasi, kami minum kopi di rumah Pak Asep dan bertanya kenapa kopi seenak ini jarang sampai ke kafe di kota. Jawabannya sederhana: rantainya terlalu panjang. Gerai Braga adalah cara kami memendekkan rantai itu,” ujar Rina Hartono, CEO Kopi Senja.",
        after: 1,
      },
      {
        speaker: "Asep Sutisna, Ketua Kelompok Tani Pangalengan",
        paragraph:
          "“Selama ini kami menjual ke tengkulak dengan harga yang ditentukan mereka. Sekarang kami tahu kopi kami diminum di Braga, dan harganya kami sepakati bersama,” kata Asep Sutisna, Ketua Kelompok Tani Pangalengan.",
        after: 2,
      },
    ],
    boilerplate_title: "Tentang PT Kopi Senja Nusantara",
    boilerplate:
      "Kopi Senja adalah jaringan kedai kopi susu asal Yogyakarta yang berdiri pada 2019. Dengan 50 gerai di [jumlah] kota, Kopi Senja telah melayani 2,1 juta transaksi. Kopi Senja bermitra langsung dengan kelompok tani lokal untuk pasokan biji kopi. Informasi lebih lanjut: [situs web] dan Instagram @kopisenja.id.",
    media_contact: "Dewi Lestari (PR Kopi Senja) · 0812-3456-7890 · pr@kopisenja.id",
    notes_to_editor:
      "Foto suasana gerai Braga, proses panen di Pangalengan, dan potret Rina Hartono tersedia di tautan Google Drive. Rina Hartono dan Asep Sutisna bersedia diwawancarai pada 3-7 November 2026.",
    social: [
      {
        platform: "LinkedIn",
        text:
          "Hari ini Kopi Senja membuka gerai ke-50 di Jalan Braga, Bandung.\n\nGerai ini memakai 100 persen biji kopi dari 40 petani Pangalengan yang kami beli langsung tanpa perantara, dan mempekerjakan 18 warga sekitar.\n\nTujuh tahun lalu kami mulai dari satu gerai di Yogyakarta. 2,1 juta transaksi kemudian, prinsipnya tetap sama: rantai pasok pendek, kopi yang jujur.\n\n#KopiSenja #KopiLokal #Bandung",
      },
      {
        platform: "Instagram / X",
        text: "Gerai ke-50 kami buka di Braga! ☕ Biji kopinya 100% dari petani Pangalengan. Beli 1 gratis 1 semua kopi susu, 3-5 November. Sampai ketemu di Jl. Braga No. 12! #KopiSenja #BragaBandung",
      },
    ],
    pitch: {
      subject: "Gerai ke-50 Kopi Senja di Braga pakai kopi 40 petani Pangalengan",
      body:
        "Halo Mas/Mbak [Nama wartawan],\n\nSaya Dewi dari Kopi Senja. Mengikuti liputan Anda soal UMKM dan rantai pasok kopi, saya kira cerita ini relevan untuk rubrik Anda:\n\n• Kopi Senja membuka gerai ke-50 di Jl. Braga, Bandung, Selasa (3/11).\n• Seluruh biji kopinya dibeli langsung dari 40 petani Pangalengan, tanpa tengkulak.\n• Gerai ini merekrut 18 warga sekitar; total transaksi Kopi Senja sejak 2019 mencapai 2,1 juta.\n\nCEO Kopi Senja Rina Hartono dan Ketua Kelompok Tani Pangalengan Asep Sutisna bisa diwawancarai pekan ini, termasuk kunjungan ke kebun. Siaran pers lengkap saya tempel di bawah, foto resolusi tinggi ada di tautan.\n\nTerima kasih,\nDewi Lestari\nPR Kopi Senja · 0812-3456-7890",
    },
    media_targets: [
      { desk: "Bisnis & ekonomi", outlets: ["Kontan", "Bisnis Indonesia", "CNBC Indonesia", "Katadata", "SWA", "Marketeers"], angle: "Model rantai pasok langsung dari petani dan ekspansi 50 gerai dalam tujuh tahun; tawarkan data pertumbuhan transaksi.", priority: "tinggi" },
      { desk: "Lokal / daerah", outlets: ["Tribun Jabar", "Pikiran Rakyat", "Radar Bandung", "Antara Jabar"], angle: "Lapangan kerja untuk 18 warga sekitar Braga dan harga yang lebih adil bagi petani Pangalengan.", priority: "tinggi" },
      { desk: "Lifestyle", outlets: ["IDN Times", "Kumparan Food", "Detikfood", "Fimela", "Hipwee"], angle: "Kopi susu dari satu kecamatan, suasana gerai di kawasan heritage Braga, dan promo pembukaan.", priority: "sedang" },
      { desk: "Nasional / umum", outlets: ["Kompas.com", "Detikcom", "Kumparan", "Liputan6.com"], angle: "Cerita brand lokal yang tumbuh dari Yogyakarta ke 50 gerai sambil bermitra dengan petani.", priority: "sedang" },
    ],
    qa: [
      { question: "Berapa omzet Kopi Senja tahun ini?", answer: "Untuk angka omzet belum bisa kami buka. Yang bisa kami sampaikan, total transaksi sejak 2019 sudah 2,1 juta dan jumlah gerai naik menjadi 50." },
      { question: "Berapa harga beli kopi dari petani dibanding tengkulak?", answer: "Harga disepakati bersama kelompok tani per musim panen. [Angka selisih harga bila boleh dibuka — konfirmasi ke tim pengadaan]." },
      { question: "Apakah semua gerai akan memakai kopi petani lokal?", answer: "Itu arah kami. Bandung yang pertama 100 persen dari satu kelompok tani; gerai lain bertahap sesuai kesiapan pasokan." },
      { question: "Bagaimana Kopi Senja bersaing dengan jaringan kopi besar di Bandung?", answer: "Kami tidak membandingkan diri dengan merek lain. Pembeda kami ada di asal biji yang jelas dan harga kopi susu yang terjangkau." },
      { question: "Apakah 18 karyawan itu pegawai tetap?", answer: "[Status kepegawaian & skema kontrak — konfirmasi ke HR sebelum menjawab]." },
    ],
    distribution: {
      best_time: "Kirim Selasa (3/11) pukul 08.00-09.00 WIB agar masuk rapat redaksi pagi dan bisa tayang di hari pembukaan; media lokal Bandung dihubungi lebih dulu.",
      embargo: "Tidak perlu embargo bila dikirim pada hari pembukaan. Bila ingin dikirim sehari sebelumnya, Senin (2/11), beri embargo hingga Selasa (3/11) pukul 10.00 WIB.",
      assets: [
        "3 foto landscape ≥1920 px: fasad gerai Braga, barista warga sekitar, panen di Pangalengan (dengan caption & kredit)",
        "Potret Rina Hartono dan Asep Sutisna",
        "Logo Kopi Senja PNG latar transparan",
        "Factsheet 1 halaman: daftar 50 gerai, angka transaksi, profil kemitraan petani",
      ],
      checklist: [
        { task: "Konfirmasi kutipan & data ke Rina Hartono dan Asep Sutisna", when: "H-5" },
        { task: "Lengkapi placeholder (kontrak petani, rencana ekspansi, situs web)", when: "H-4" },
        { task: "Siapkan media list berisi nama wartawan dari database tim", when: "H-3" },
        { task: "Unggah foto & factsheet ke Google Drive, cek akses tautan", when: "H-2" },
        { task: "Kirim email personal ke media lokal Bandung", when: "Hari H 08.00" },
        { task: "Kirim ke media nasional, bisnis & lifestyle", when: "Hari H 08.30" },
        { task: "Follow up sopan sekali via WA ke wartawan prioritas tinggi", when: "H+1" },
        { task: "Pantau pemberitaan, buat kliping, dan kirim terima kasih ke media yang memuat", when: "H+1 s.d. H+3" },
      ],
    },
    to_verify: [
      "Volume pembelian per bulan & durasi kontrak dengan Kelompok Tani Pangalengan",
      "Rencana ekspansi setelah Bandung (kota & jumlah gerai)",
      "Jumlah kota tempat 50 gerai berada dan alamat situs web",
      "Status kepegawaian 18 karyawan baru",
    ],
  },
};

export default fixture;
