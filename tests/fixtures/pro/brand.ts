/** Contoh hasil AI untuk tool "brand" (Brand Guideline). */
const fixture = {
  tool: "brand",
  input: {
    brand: "Rumah Rempah",
    aspiration: "dapur rempah modern andalan keluarga muda",
    business: "Bumbu masak instan premium dari rempah asli (rendang, opor, soto) Rp28-45rb, dijual di Shopee, TikTok Shop & supermarket di Jawa.",
    audience: "Ibu bekerja & pasangan muda 25-38 th di kota besar, ingin masak rumahan enak tapi tidak punya waktu ulek bumbu.",
    personality: "hangat, otentik, cekatan, sedikit jenaka",
    competitors: "Bamboe, Sasa bumbu, Indofood Racik",
    visual_now: "Logo wordmark serif warna merah bata #B5462B, kemasan krem.",
  },
  kinds: ["pptx", "xlsx"],
  output: {
    essence: "Rasa rumah, tanpa repot",
    essence_story:
      "Rumah Rempah lahir dari resep keluarga yang dulu butuh dua jam ulek bumbu. Kami menjaga rasa itu tetap utuh, tapi memangkas repotnya — supaya masakan rumah tetap jadi pilihan di hari kerja yang padat.",
    purpose: "Membuat masakan rumahan Indonesia tetap hidup di dapur keluarga muda yang waktunya sempit.",
    vision: "Pada 2030, satu dari sepuluh keluarga muda di kota besar Jawa memasak menu nusantara mingguan dengan Rumah Rempah.",
    mission: ["Memakai rempah utuh yang disangrai & digiling sendiri, tanpa MSG tambahan", "Menyajikan resep 20 menit untuk setiap varian", "Membalas pertanyaan resep pelanggan maks 15 menit di jam kerja"],
    archetype: "Caregiver (Pengasuh)",
    archetype_note: "Brand hadir seperti ibu atau kakak yang paham dapur: menenangkan, memberi jalan pintas, tidak menggurui. Terlihat di caption yang menawarkan bantuan, bukan memamerkan.",
    positioning: {
      target: "Ibu bekerja & pasangan muda 25-38 th di kota besar",
      need: "Ingin menyajikan masakan rumahan yang rasanya 'beneran', tapi tidak punya waktu ulek bumbu",
      frame: "bumbu masak instan premium",
      difference: "rasanya paling dekat dengan bumbu ulek rumahan karena rempah utuh disangrai sendiri",
      reason: "Resep keluarga tiga generasi, rempah utuh, dan resep 20 menit di setiap kemasan",
      statement:
        "Untuk keluarga muda di kota besar yang ingin masakan rumahan enak tanpa waktu ulek bumbu, Rumah Rempah adalah bumbu masak instan premium yang rasanya paling dekat dengan bumbu ulek rumahan, karena rempah utuhnya disangrai & digiling sendiri dari resep keluarga tiga generasi.",
    },
    promise: "Setiap bungkus menghasilkan masakan rumahan yang rasanya utuh dalam 20 menit.",
    values: [
      { name: "Jujur rasa", meaning: "Tidak menutupi rasa dengan penguat; rempah yang bicara.", behaviors: ["Komposisi ditulis lengkap di depan kemasan", "Tidak memakai foto masakan hasil edit berlebihan"] },
      { name: "Cekatan", meaning: "Menghargai waktu pelanggan sama seperti menghargai rasa.", behaviors: ["Resep di kemasan maksimal 5 langkah", "Balas chat maks 15 menit di jam kerja"] },
      { name: "Hangat", meaning: "Bicara seperti tetangga yang suka berbagi resep.", behaviors: ["Menyapa dengan nama di balasan DM", "Merayakan masakan pelanggan dengan repost & ucapan"] },
    ],
    personality: [
      { trait: "Hangat", is: "Ramah dan menenangkan, seperti kakak yang jago masak", is_not: "Bukan sok akrab atau lebay memuji" },
      { trait: "Otentik", is: "Bangga pada rempah dan resep nusantara", is_not: "Bukan kuno atau menggurui soal tradisi" },
      { trait: "Jenaka", is: "Sesekali bercanda soal drama dapur sehari-hari", is_not: "Bukan receh atau menyindir orang yang tidak bisa masak" },
    ],
    tone: [
      { left: "Formal", right: "Santai", value: 4, note: "Pakai 'kamu' & 'kita', boleh singkatan wajar (yuk, gak); hindari slang yang cepat basi." },
      { left: "Serius", right: "Jenaka", value: 3, note: "Jenaka di caption & konten, serius saat bicara komposisi & keluhan." },
      { left: "Hormat", right: "Berani", value: 2, note: "Tidak menjatuhkan kompetitor atau cara masak orang lain." },
      { left: "Informatif", right: "Emosional", value: 3, note: "Seimbang: tips praktis + kenangan masakan rumah." },
    ],
    voice_examples: [
      { situation: "Caption promosi", say: "Rendang 20 menit, rasanya kayak masakan Mama pas Lebaran. Coba deh, weekend ini giliran kamu dipuji di meja makan.", avoid: "PROMO!!! Bumbu rendang TERBAIK dan TERENAK se-Indonesia!!!", why: "Menjual rasa & momen, tanpa klaim superlatif yang tidak bisa dibuktikan." },
      { situation: "Balas komplain paket bocor", say: "Aduh, maaf banget ya Kak, bumbunya sampai bocor. Kirim foto paketnya ke sini, kami kirim ganti hari ini juga.", avoid: "Mohon maaf atas ketidaknyamanannya, keluhan Anda akan kami proses sesuai prosedur.", why: "Hangat, cepat, dan memberi solusi konkret." },
      { situation: "Pertanyaan harga lebih mahal", say: "Iya Kak, harganya beda karena rempahnya utuh, kami sangrai & giling sendiri. Satu bungkus cukup untuk 1 kg daging.", avoid: "Harga sesuai kualitas ya Kak.", why: "Menjelaskan alasan nyata, bukan jawaban defensif." },
    ],
    messaging: {
      core: "Masakan rumahan yang rasanya utuh, siap dalam 20 menit.",
      pillars: [
        { message: "Rasa ulek rumahan", proof: ["Rempah utuh disangrai & digiling sendiri", "Resep keluarga tiga generasi"] },
        { message: "Cepat tanpa kompromi", proof: ["Resep 20 menit di setiap kemasan", "Maks 5 langkah memasak"] },
        { message: "Bahan yang jujur", proof: ["Tanpa MSG tambahan", "Komposisi lengkap di depan kemasan"] },
      ],
    },
    taglines: [
      { line: "Rasa rumah, tanpa repot", rationale: "Langsung menyatakan essence; mudah diingat dan cocok di kemasan." },
      { line: "Ulekannya sudah, kamu tinggal masak", rationale: "Jenaka dan menjawab ketegangan utama: tidak sempat ulek bumbu." },
      { line: "Masak 20 menit, dipuji seminggu", rationale: "Menonjolkan kecepatan dan hasil emosional di meja makan." },
    ],
    visual: {
      direction: "Hangat, membumi, dan bersih — evolusi dari merah bata yang sudah dikenal, dipadu krem & hijau daun agar terasa segar dan modern.",
      palette: [
        { name: "Merah Bata", hex: "#B5462B", role: "Primer", usage: "Logo, judul, tombol CTA", share: 30 },
        { name: "Krem Santan", hex: "#F6EBDD", role: "Netral terang", usage: "Latar kemasan & feed", share: 40 },
        { name: "Hijau Salam", hex: "#4E6B3A", role: "Sekunder", usage: "Label varian, ikon bahan", share: 15 },
        { name: "Kunyit", hex: "#E3A72F", role: "Aksen", usage: "Badge promo, highlight harga", share: 5 },
        { name: "Cokelat Cobek", hex: "#3B2A22", role: "Netral gelap", usage: "Teks utama", share: 10 },
      ],
      heading_font: { family: "Fraunces", why: "Serif lembut yang meneruskan wordmark serif lama, terasa hangat & otentik." },
      body_font: { family: "DM Sans", why: "Sans-serif bersih, mudah dibaca di kemasan kecil & layar HP." },
      photography: "Masakan di atas meja kayu rumah dengan cahaya jendela pagi, piring enamel & cobek sebagai props, tangan sedang menyajikan, sudut 45° atau dari atas. Warna natural, tanpa filter dingin.",
      illustration: "Ilustrasi garis tangan rempah (cengkih, kayu manis, sereh) warna hijau salam untuk ikon bahan & pola kemasan.",
      logo_do: ["Beri ruang kosong minimal setinggi huruf 'R' di sekeliling logo", "Pakai versi merah bata di latar krem, versi krem di latar merah bata", "Ukuran minimal 24 px di layar, 15 mm di cetak"],
      logo_dont: ["Jangan meregangkan atau memiringkan logo", "Jangan menaruh logo di atas foto ramai tanpa latar", "Jangan menambah bayangan, gradasi, atau outline"],
    },
    word_bank: {
      use: ["rempah utuh", "masakan rumah", "20 menit", "ulek", "sangrai", "meja makan", "Kak", "kita", "resep keluarga", "utuh"],
      avoid: ["terbaik", "no.1", "instan murahan", "praktis banget!!!", "Anda", "dijamin", "100% alami", "viral"],
    },
    dos: ["Selalu tampilkan waktu masak di konten resep", "Repost masakan pelanggan dengan izin & ucapan terima kasih", "Jelaskan komposisi saat ditanya, dengan bahasa sederhana", "Pakai foto masakan asli tanpa edit berlebihan"],
    donts: ["Membandingkan atau menjelekkan merek lain", "Memakai klaim kesehatan yang tidak bisa dibuktikan", "Membalas keluhan dengan template kaku", "Memakai huruf kapital semua di caption"],
  },
};

export default fixture;
