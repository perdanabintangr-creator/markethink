/** Contoh hasil AI untuk tool "adcopy" platform Google Search (menguji batas 30/90 karakter & format RSA). */
const rsa = (code: string, angle: string, hook: string, keywords: string, headline: string, extra: string[], description: string, extraD: string[], visual: string, reason: string) => ({
  code,
  angle,
  audience: "Pencari dengan niat beli, Jabodetabek",
  format: "search" as const,
  hook,
  primary_text: keywords,
  headline,
  description,
  extra_headlines: extra,
  extra_descriptions: extraD,
  cta_button: "-",
  visual,
  reason,
});

const fixture = {
  tool: "adcopy",
  input: {
    brand: "Kopi Senja",
    platform: "google",
    product: "Kopi susu literan gula aren 1 liter Rp45rb (isi 6 gelas), dikirim instan Jabodetabek.",
    landing: "https://kopisenja.id",
    objective: "penjualan",
    count: 6,
  },
  kinds: ["pptx", "xlsx"],
  output: {
    strategy: {
      summary: "Menangkap pencarian 'kopi literan' dan 'kopi susu kantor' dengan 3 tema ad group: harga per gelas, pengiriman instan, dan kebutuhan kantor.",
      insight: "Pencari kopi literan sudah tahu produknya; yang mereka bandingkan adalah harga per liter dan kecepatan kirim.",
      funnel: "Search → halaman produk kopisenja.id dengan tombol WhatsApp & Shopee.",
    },
    angles: [
      { name: "Harga per gelas", why: "Pencari membandingkan harga; Rp7.500/gelas menonjol di SERP." },
      { name: "Kirim instan", why: "Niat beli hari ini tinggi untuk kata kunci 'terdekat'." },
      { name: "Kopi kantor", why: "Pembelian kolektif untuk kantor menaikkan AOV." },
    ],
    variants: [
      rsa(
        "",
        "Harga per gelas",
        "kopi literan murah",
        '[kopi literan], "kopi susu literan", "kopi literan murah", "kopi gula aren literan"',
        "Kopi Susu Literan Rp45rb!",
        ["Cuma Rp7.500 per Gelas", "Gula Aren Asli Tanpa Pemanis Buatan Sama Sekali", "Pesan Hari Ini, Kirim Instan", "Kopi Senja Official"],
        "1 liter isi 6 gelas kopi susu gula aren. Tahan 5 hari di kulkas. Pesan sekarang lewat WhatsApp.",
        ["Diseduh pagi, dikirim hari itu juga ke seluruh Jabodetabek."],
        "Sitelink: Menu, Cara Order, Ulasan. Callout: Kirim Instan, Gula Aren Asli.",
        "Pencari harga merespons angka per gelas.",
      ),
      rsa(
        "",
        "Kirim instan",
        "kopi literan terdekat",
        '"kopi literan terdekat", "kopi susu antar", [kopi literan jakarta]',
        "Kopi Literan Kirim Instan",
        ["Sampai dalam 2 Jam", "Jabodetabek, Order via WA"],
        "Pesan sebelum jam 14.00, kopi sampai hari ini. Rp45rb per liter, isi 6 gelas.",
        ["Gula aren asli, diseduh tiap pagi."],
        "Sitelink: Area Kirim, Jam Order. Callout: Instan, Same Day.",
        "Niat 'terdekat' butuh janji kecepatan.",
      ),
      rsa(
        "",
        "Kopi kantor",
        "kopi untuk kantor",
        '"kopi untuk kantor", "kopi meeting kantor", "pesan kopi banyak"',
        "Stok Kopi Kantor Seminggu",
        ["Paket 5 Liter untuk Tim", "Rp7.500 per Gelas"],
        "Paket kopi susu literan untuk meeting & pantry kantor. Faktur tersedia, kirim instan.",
        [],
        "Sitelink: Paket Kantor, Hubungi Sales. Callout: Faktur, Kirim Instan.",
        "Pembeli B2B kecil butuh paket & faktur.",
      ),
    ],
    test_plan: {
      structure: "1 campaign Search KS_SEARCH_OKT, 3 ad group per tema, 1 RSA per ad group. Negatif: resep, cara membuat, lowongan.",
      budget_split: [
        { item: "Harga per gelas", share_pct: 40, note: "Volume terbesar" },
        { item: "Kirim instan", share_pct: 35, note: "Niat beli tertinggi" },
        { item: "Kopi kantor", share_pct: 25, note: "AOV tinggi" },
      ],
      duration: "14 hari atau 30 konversi per campaign sebelum mengganti strategi bidding.",
      primary_metric: "Cost per konversi (klik WA/checkout) ≤ Rp25rb.",
      rules: [
        { type: "kill", condition: "Kata kunci dengan 40 klik tanpa konversi", action: "Pause kata kunci atau jadikan negatif." },
        { type: "scale", condition: "Ad group dengan CPA ≤ Rp25rb selama 7 hari", action: "Naikkan budget 20%." },
        { type: "iterate", condition: "CTR < 3% dengan impresi > 1.000", action: "Ganti 3 headline terlemah (lihat laporan aset)." },
      ],
    },
    compliance: [
      { risk: "Tanda seru di headline", guideline: "Kebijakan editorial Google melarang tanda seru di headline.", fix: "Hapus tanda seru; sistem sudah membersihkannya." },
      { risk: "Klaim 'tanpa pemanis buatan'", guideline: "Klaim harus sesuai label produk.", fix: "Pastikan halaman produk memuat komposisi yang sama." },
    ],
  },
};

export default fixture;
