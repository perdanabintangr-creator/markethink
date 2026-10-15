/** Contoh hasil AI untuk tool "flow" (dipakai tes file & pratinjau tampilan). */
const fixture = {
  tool: "flow",
  input: {
    business:
      "Dimsum Laras — dimsum frozen isi 20 Rp65.000, paket hemat 3 pack Rp180.000. Order lewat WA admin & website, kirim instan Jabodetabek, ekspedisi frozen ke Jawa. Pembeli kebanyakan ibu rumah tangga 28-40 th.",
    channel: "both",
    stages: ["lead", "no_order", "post_purchase", "repeat", "winback"],
    tool: "Qontak",
    cycle: 21,
    tone: "hangat kayak teman, panggil Kak",
  },
  kinds: ["pptx", "xlsx"],
  output: {
    summary:
      "Uang tercepat datang dari 'chat tanpa order' — orangnya sudah tertarik, tinggal dibantu memutuskan dalam 24 jam pertama. Repeat order dikunci di hari ke-17 (stok di freezer mulai menipis) dengan paket hemat 3 pack. Win-back hanya untuk yang pasif > 42 hari dan berhenti setelah 3 pesan agar nomor tetap aman.",
    stages: [
      {
        stage: "Lead baru",
        trigger: "Chat pertama masuk (dari iklan klik-ke-WhatsApp, bio Instagram, atau website) dan belum punya label Pelanggan",
        goal: "Mengubah pertanyaan pertama jadi order dalam 3 hari",
        exit: "Order masuk (label Pelanggan), membalas STOP, atau 3 pesan tanpa balasan",
        messages: [
          {
            delay: "H+0, 5 menit", channel: "WhatsApp", subject: "",
            text: "Halo Kak {nama}, makasih udah chat Dimsum Laras 😊\nBiar aku rekomendasiin yang pas: buat stok sarapan anak atau buat acara/arisan, Kak? Terus dikirim ke kecamatan mana?",
            cta: "Jawab kebutuhan & lokasi", note: "Dalam jendela 24 jam → pesan bebas. Admin balas manual bila sudah online.",
          },
          {
            delay: "H+1, 10.00", channel: "WhatsApp", subject: "",
            text: "Kak {nama}, buat stok sarapan biasanya yang paling cocok *Paket Hemat 3 pack* (60 pcs) Rp180.000 — jatuhnya Rp3.000/pcs, tahan 3 bulan di freezer.\nMau aku bantu buatkan pesanannya? 👉 {link}",
            cta: "Klik link order", note: "Template utility/marketing harus disetujui bila sudah lewat 24 jam.",
          },
          {
            delay: "H+3, 16.00", channel: "WhatsApp", subject: "",
            text: "Kak {nama}, pengiriman instan hari ini masih bisa sampai sebelum makan malam kalau order sebelum jam 17.00 ya. Kalau belum sekarang juga gapapa, chat aku aja kapan pun 🙏\n\nBalas STOP kalau tidak mau dapat info lagi.",
            cta: "Order sebelum 17.00", note: "Pesan terakhir; setelah ini masuk segmen Lead dingin.",
          },
        ],
        reply_rate: 45, conversion_rate: 18, metric_note: "Order berlabel Lead ÷ jumlah lead baru minggu itu (laporan kontak Qontak).",
      },
      {
        stage: "Chat tanpa order",
        trigger: "Sudah tanya harga/ongkir tapi 2 jam tidak ada order (label Belum Order dipasang admin atau otomatis)",
        goal: "Menjawab hambatan terakhir sebelum beli",
        exit: "Order masuk, membalas STOP, atau 3 pesan selesai",
        messages: [
          {
            delay: "H+0, 2 jam", channel: "WhatsApp", subject: "",
            text: "Kak {nama}, tadi sempat tanya ongkir ya 😊 Untuk {kecamatan} pakai kurir instan sekitar Rp{ongkir}, dimsum dikirim pakai ice gel + box styrofoam jadi aman sampai 6 jam.\nMau dikirim hari ini?",
            cta: "Konfirmasi kirim hari ini", note: "Isi {ongkir} dari hasil cek ongkir; kalau tidak tahu, admin isi manual.",
          },
          {
            delay: "H+1, 11.00", channel: "WhatsApp", subject: "",
            text: "Kak {nama}, ini kata salah satu pelanggan kami minggu lalu:\n\"{testimoni}\"\nKalau mau coba dulu, ada pilihan 1 pack Rp65.000 kok, Kak. 👉 {link}",
            cta: "Coba 1 pack", note: "{testimoni} WAJIB dari pelanggan nyata (screenshot/ulasan); jangan dikarang.",
          },
          {
            delay: "H+3, 10.00", channel: "Email", subject: "5 menu sarapan 10 menit dari 1 pack dimsum",
            text: "Halo {nama},\n\nKami kumpulkan 5 ide sarapan cepat dari dimsum frozen: kukus 8 menit, goreng air fryer, sampai sup dimsum untuk anak. Semua bisa disiapkan sebelum jam berangkat sekolah.\n\nKhusus minggu ini, order pertama lewat website dapat gratis ongkir instan dengan kode {kode_voucher} (berlaku sampai {tanggal}).",
            cta: "Lihat resep & order", note: "Hanya untuk kontak yang memberikan email. A/B test subject vs '{nama}, ongkir kamu kami tanggung'.",
          },
        ],
        reply_rate: 30, conversion_rate: 12, metric_note: "Order dari kontak berlabel Belum Order ÷ total kontak yang masuk tahap ini.",
      },
      {
        stage: "Setelah beli",
        trigger: "Pesanan dibayar (status Paid di website atau admin tandai Lunas)",
        goal: "Pesanan sampai aman, pelanggan puas, data kepuasan terkumpul",
        exit: "Selesai 3 pesan; skor 1-3 dialihkan ke CS",
        messages: [
          {
            delay: "H+0, 5 menit", channel: "WhatsApp", subject: "",
            text: "Pesanan Kak {nama} sudah kami terima ✅\n{produk} dikirim {tanggal} lewat {kurir}. Resi: {resi}\nBegitu sampai, langsung masuk freezer ya Kak.",
            cta: "Simpan nomor ini", note: "Template kategori utility (lebih murah dari marketing).",
          },
          {
            delay: "H+1, saat barang sampai", channel: "WhatsApp", subject: "",
            text: "Kak {nama}, dimsumnya sudah sampai? Tips biar kulitnya tetap lembut: kukus langsung dari beku 8-10 menit, jangan dicairkan dulu 😊",
            cta: "Balas kalau sudah sampai", note: "Kirim setelah status kurir 'terkirim'.",
          },
          {
            delay: "H+3, 19.00", channel: "WhatsApp", subject: "",
            text: "Kak {nama}, dari 1 sampai 5, seberapa suka keluarga sama dimsumnya? Balas angkanya aja ya, buat masukan dapur kami 🙏",
            cta: "Balas angka 1-5", note: "Skor 4-5 → kirim link ulasan Google; skor 1-3 → CS telepon/chat dalam 1 jam kerja.",
          },
        ],
        reply_rate: 40, conversion_rate: null, metric_note: "Jumlah skor yang masuk ÷ pesanan terkirim; rata-rata skor per minggu.",
      },
      {
        stage: "Repeat order",
        trigger: "17 hari sejak pesanan terakhir dan belum ada pesanan baru",
        goal: "Pelanggan pertama jadi pembeli rutin tiap 3 minggu",
        exit: "Order masuk atau 3 pesan selesai (pindah ke Win-back bila 42 hari tanpa order)",
        messages: [
          {
            delay: "H+17, 10.00", channel: "WhatsApp", subject: "",
            text: "Kak {nama}, stok {produk} di freezer biasanya mulai tipis minggu ini 😄 Mau aku siapkan kiriman berikutnya? Paket hemat 3 pack Rp180.000 👉 {link}",
            cta: "Repeat order", note: "Personalisasi {produk} dari pesanan terakhir.",
          },
          {
            delay: "H+21, 16.00", channel: "Email", subject: "{nama}, stok dimsum aman sampai bulan depan?",
            text: "Halo {nama},\n\nSudah 3 minggu sejak pesanan terakhir. Banyak pelanggan sekarang ambil paket 3 pack supaya tidak bolak-balik order: 60 pcs, Rp3.000/pcs, tahan 3 bulan di freezer.\n\nPesan hari ini, kami kirim besok pagi.",
            cta: "Pesan paket hemat", note: "Hanya kontak dengan email.",
          },
          {
            delay: "H+28, 10.00", channel: "WhatsApp", subject: "",
            text: "Kak {nama}, minggu ini ada varian baru *Dimsum Mentai* 🍣 Order paket hemat sebelum Minggu, aku selipkan 5 pcs varian baru buat dicoba ya.\n\nBalas STOP kalau tidak mau dapat info lagi.",
            cta: "Order sebelum Minggu", note: "Bonus kecil, bukan diskon harga, supaya harga tetap terjaga.",
          },
        ],
        reply_rate: 25, conversion_rate: 28, metric_note: "Pelanggan yang order lagi ≤ 28 hari ÷ pelanggan yang menerima pengingat.",
      },
      {
        stage: "Win-back pelanggan pasif",
        trigger: "Lebih dari 42 hari (2× siklus) tanpa pesanan",
        goal: "Mengaktifkan kembali pelanggan lama sebelum hilang",
        exit: "Order masuk, membalas STOP, atau 3 pesan selesai (label Tidur)",
        messages: [
          {
            delay: "H+0, 10.00", channel: "WhatsApp", subject: "",
            text: "Kak {nama}, lama nggak ngobrol 😊 Sekarang Dimsum Laras sudah kirim instan sampai Bekasi & Depok, plus ada varian Mentai. Kangen dimsum ayamnya nggak, Kak?",
            cta: "Balas untuk cek menu", note: "Template marketing; pastikan kontak pernah order.",
          },
          {
            delay: "H+5, 16.00", channel: "WhatsApp", subject: "",
            text: "Kak {nama}, khusus pelanggan lama: gratis ongkir instan pakai kode {kode_voucher} sampai {tanggal}. Cukup balas 'MAU' nanti aku buatkan pesanannya.",
            cta: "Balas MAU", note: "Kode unik per pelanggan agar bisa dilacak.",
          },
          {
            delay: "H+12, 10.00", channel: "WhatsApp", subject: "",
            text: "Kak {nama}, ini pesan terakhir dari aku soal promo ya 🙏 Kalau masih mau dapat info menu baru, balas 'LANJUT'. Kalau tidak, balas STOP dan kami tidak akan kirim lagi.",
            cta: "Balas LANJUT / STOP", note: "Yang tidak membalas → label Tidur, keluar dari semua alur promosi.",
          },
        ],
        reply_rate: 15, conversion_rate: 7, metric_note: "Order dari label Pasif ÷ kontak pasif yang dikirimi pesan pertama.",
      },
    ],
    segments: [
      { name: "Lead-Iklan", rule: "Chat pertama dari iklan klik-ke-WhatsApp (atribut sumber = iklan)", treatment: "Balas ≤5 menit di jam kerja; rekomendasi 1 pack untuk coba." },
      { name: "Belum Order", rule: "Tanya harga/ongkir, 2 jam tanpa order", treatment: "Masuk alur Chat tanpa order; tanpa diskon, cukup gratis ongkir terbatas." },
      { name: "Pelanggan Baru", rule: "1 kali order", treatment: "Alur Setelah beli + Repeat order; dorong ke paket hemat." },
      { name: "Pelanggan Setia", rule: "≥ 3 kali order dalam 90 hari", treatment: "Tidak dikirimi promo umum; dapat info varian baru lebih dulu." },
      { name: "Pasif", rule: "> 42 hari tanpa order", treatment: "Alur Win-back maks 3 pesan, lalu label Tidur." },
    ],
    setup: [
      { title: "Buat atribut & label kontak", detail: "Di Qontak: atribut 'sumber', 'tanggal order terakhir', 'jumlah order'; label Lead-Iklan, Belum Order, Pelanggan Baru, Pelanggan Setia, Pasif, Tidur." },
      { title: "Ajukan template ke Meta", detail: "Ajukan 9 template (3 utility, 6 marketing) dengan variabel {{1}} {{2}}; persetujuan biasanya 1-2 hari kerja." },
      { title: "Sambungkan website", detail: "Hubungkan webhook status pesanan (Paid, Dikirim) ke Qontak agar alur Setelah beli berjalan otomatis." },
      { title: "Bangun automation per tahap", detail: "Satu flow per tahap dengan kondisi keluar 'order masuk' & 'balas STOP'; aktifkan pembatas jam kirim 08.00-20.00." },
      { title: "Uji ke nomor internal", detail: "Jalankan tiap flow ke 3 nomor tim selama 2 hari, cek variabel terisi benar dan jeda sesuai." },
      { title: "Laporan mingguan", detail: "Tiap Senin: balasan, konversi, jumlah STOP & blokir per tahap. Ganti pesan dengan konversi terendah." },
    ],
    compliance: [
      { rule: "Hanya kontak yang pernah chat/order", detail: "Jangan unggah daftar nomor beli/hasil scraping. Opt-in dicatat di atribut kontak." },
      { rule: "Jam kirim 08.00-20.00 WIB", detail: "Pesan otomatis di luar jam ini ditahan ke pagi berikutnya; hindari Jumat 11.30-13.00." },
      { rule: "Maks 2 pesan promosi/minggu", detail: "Berlaku lintas alur. Pesan transaksi (konfirmasi, resi) tidak dihitung." },
      { rule: "Opt-out di setiap promosi", detail: "Kalimat 'Balas STOP kalau tidak mau dapat info lagi'; kontak STOP otomatis keluar dari semua alur." },
      { rule: "Template resmi di luar 24 jam", detail: "Lewat dari 24 jam sejak pesan terakhir pelanggan hanya boleh template yang disetujui Meta; pantau quality rating nomor." },
    ],
    kpis: [
      { metric: "Konversi chat → order", target: "≥ 15%" },
      { metric: "Repeat order ≤ 28 hari", target: "≥ 25% pelanggan baru" },
      { metric: "Tingkat STOP/blokir", target: "< 2% per pengiriman" },
      { metric: "Quality rating nomor WA", target: "Tetap hijau" },
    ],
  },
};

export default fixture;
