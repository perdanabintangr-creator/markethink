/** Contoh hasil AI untuk tool "plan" (Marketing Plan). */
const fixture = {
  tool: "plan",
  input: {
    brand: "Kopi Senja",
    period: "6",
    business:
      "Kopi susu literan gula aren Rp45rb (1 liter) & Rp85rb (2 liter). Jual di Shopee, TikTok Shop, dan 2 outlet takeaway di Bekasi. Omzet ±Rp70 jt/bulan, ±1.500 order, 35% pembeli repeat. Margin kotor ±55%.",
    goal: "Omzet Rp150 jt/bulan di akhir periode, buka reseller di 3 kota, repeat order naik ke 45%",
    budget: "Rp15 jt/bulan",
    team: "1 admin sosmed, 1 desainer freelance, owner pegang iklan",
    channels: ["instagram", "tiktok", "marketplace", "whatsapp"],
    challenges: "ROAS iklan Shopee turun dari 6x ke 3,8x sejak Juli; konten masih dibuat dadakan.",
  },
  kinds: ["pptx", "xlsx"],
  output: {
    headline: "Omzet Rp70 jt → Rp150 jt/bulan dalam 6 bulan lewat repeat order, reseller 3 kota, dan iklan TikTok Shop yang lebih efisien.",
    summary:
      "Kopi Senja punya fondasi kuat: 35% pembeli kembali membeli dan margin 55% memberi ruang promosi. Gap Rp80 jt/bulan ditutup dari tiga sumber: repeat order via WhatsApp (+Rp25 jt), reseller di Bekasi, Depok, dan Bogor (+Rp30 jt), serta akuisisi baru di TikTok Shop (+Rp25 jt). Budget Rp15 jt/bulan cukup bila 70% difokuskan ke kanal yang terbukti; target Rp150 jt adalah stretch — Rp125 jt adalah target realistis bila reseller baru jalan di bulan ke-3.",
    assumptions: ["AOV saat ini ±Rp47rb (Rp70 jt / 1.500 order)", "Kapasitas produksi bisa naik 2x tanpa tambah outlet", "Reseller mendapat diskon 25% dari harga jual"],
    situation: {
      strengths: ["35% pembeli repeat — di atas rata-rata F&B online (±20-25%)", "Margin kotor 55% memberi ruang voucher & komisi reseller", "Produk literan cocok untuk stok di kulkas kantor & rumah"],
      weaknesses: ["Konten dibuat dadakan tanpa kalender", "Belum ada database pelanggan yang rapi di WhatsApp", "Iklan dipegang owner tanpa uji kreatif terstruktur"],
      opportunities: ["Ramadan 2027 (mulai ±8 Feb) — permintaan kopi untuk buka puasa & hampers naik", "Pekerja kantor di Jabodetabek mencari kopi hemat dibanding beli per cup Rp25rb", "Reseller rumahan di grup WhatsApp perumahan"],
      threats: ["Brand kopi literan baru banting harga di Shopee (Rp35rb/liter)", "Kenaikan harga susu & gula aren", "Biaya iklan naik menjelang 11.11 & 12.12"],
      insights: [
        { insight: "1 pelanggan repeat rata-rata membeli 2,3x dalam 60 hari", implication: "Program langganan & pengingat WA hari ke-10 lebih murah dari akuisisi baru" },
        { insight: "ROAS Shopee turun karena kreatif yang sama dipakai 4 bulan", implication: "Rotasi 6 kreatif baru per bulan dan pindahkan 30% budget ke TikTok Shop" },
        { insight: "Pembeli 2 liter mayoritas untuk dibagi di kantor", implication: "Paket 'Kopi Kantor' (3 × 2 liter) jadi produk B2B kecil & pintu masuk reseller" },
      ],
    },
    objectives: [
      { objective: "Naikkan omzet bulanan", metric: "Omzet per bulan", baseline: "Rp70 jt", target: "Rp150 jt", deadline: "April 2027", level: "bisnis" },
      { objective: "Bangun jaringan reseller aktif", metric: "Reseller aktif (order ≥2x/bulan)", baseline: "0", target: "30 reseller di 3 kota", deadline: "Maret 2027", level: "bisnis" },
      { objective: "Tingkatkan pembelian ulang", metric: "Repeat order rate 60 hari", baseline: "35%", target: "45%", deadline: "April 2027", level: "marketing" },
      { objective: "Pulihkan efisiensi iklan", metric: "ROAS gabungan", baseline: "3,8x", target: "≥5x", deadline: "Januari 2027", level: "marketing" },
      { objective: "Bangun database pelanggan", metric: "Kontak WA ber-opt-in", baseline: "belum diukur", target: "4.000 kontak", deadline: "Februari 2027", level: "marketing" },
    ],
    segment: {
      primary: "Pekerja kantoran 23-35 th di Bekasi & Jakarta Timur yang ngopi tiap hari dan mulai menghitung pengeluaran",
      need: "Kopi susu enak setiap hari tanpa keluar Rp25rb per cup dan tanpa antre di kedai",
      secondary: "Ibu rumah tangga yang mencari usaha sampingan sebagai reseller di grup WA perumahan",
      positioning:
        "Untuk pekerja kantoran yang ngopi tiap hari tapi ingin hemat, Kopi Senja adalah kopi susu gula aren literan yang rasanya setara kedai dengan harga ±Rp6rb per gelas, karena diseduh dari arabika-robusta Temanggung dan dikirim dingin di hari yang sama.",
    },
    pillars: [
      { name: "Repeat & langganan", goal: "Repeat order 35% → 45%", why: "Pelanggan lama sudah percaya rasa; biaya menjual lagi jauh lebih murah", initiatives: ["Pengingat WA hari ke-10 setelah beli", "Paket langganan 4 minggu hemat 10%", "Kartu stempel digital: beli 5 gratis 1 liter"] },
      { name: "Reseller 3 kota", goal: "30 reseller aktif, kontribusi Rp30 jt/bulan", why: "Produk literan mudah dijual ulang di grup WA perumahan & kantor", initiatives: ["Paket starter reseller 10 liter", "Grup WA reseller + materi promosi mingguan", "Komisi bertingkat 20-25%"] },
      { name: "Akuisisi TikTok Shop", goal: "Order baru TikTok Shop 300 → 900/bulan", why: "Biaya per order di TikTok Shop masih lebih murah dibanding Shopee Ads", initiatives: ["Affiliate 40 kreator nano kuliner", "Live jualan 3x seminggu jam 19.00", "Rotasi 6 kreatif iklan per bulan"] },
    ],
    channels: [
      { channel: "TikTok Shop", funnel: "conversion", role: "Mesin akuisisi pelanggan baru", tactics: ["Live 3x/minggu 19.00-21.00 dengan voucher live", "Affiliate komisi 12% untuk 40 kreator nano", "GMV Max Rp4 jt/bulan"], budget_pct: 35, kpi: "Order baru", target: "900 order/bulan" },
      { channel: "Shopee", funnel: "conversion", role: "Menangkap pencarian 'kopi susu literan'", tactics: ["Iklan kata kunci dengan 6 kreatif baru/bulan", "Voucher toko payday tgl 25", "Bundling 2 liter + 1 liter"], budget_pct: 25, kpi: "ROAS", target: "≥5x" },
      { channel: "WhatsApp / CRM", funnel: "retention", role: "Repeat order & langganan", tactics: ["Broadcast segmentasi 2x/bulan", "Pengingat hari ke-10", "Promo ulang tahun pelanggan"], budget_pct: 10, kpi: "Repeat rate 60 hari", target: "45%" },
      { channel: "Instagram", funnel: "consideration", role: "Bukti rasa & cerita brand", tactics: ["4 Reels/minggu: cara saji, review kantor, behind the scene", "Repost UGC pelanggan"], budget_pct: 10, kpi: "Klik link & DM", target: "600 klik/bulan" },
      { channel: "Reseller", funnel: "awareness", role: "Jangkauan offline di 3 kota", tactics: ["Rekrut lewat grup WA perumahan & Facebook", "Starter kit + materi konten mingguan"], budget_pct: 20, kpi: "Reseller aktif", target: "30 reseller" },
    ],
    roadmap: [
      { period: "November 2026", theme: "Rapikan fondasi", activities: ["Kumpulkan & rapikan database WA pelanggan", "Rotasi 6 kreatif iklan Shopee", "Kampanye 11.11 bundling"], milestone: "3.000 kontak WA tersegmentasi, ROAS Shopee ≥4,5x" },
      { period: "Desember 2026", theme: "Momen akhir tahun", activities: ["Kampanye 12.12 & paket 'Kopi Kantor' untuk acara akhir tahun", "Mulai affiliate TikTok 20 kreator"], milestone: "Omzet Rp90 jt" },
      { period: "Januari 2027", theme: "Pilot reseller", activities: ["Rekrut 10 reseller Bekasi", "Luncurkan langganan 4 minggu", "Live TikTok 3x/minggu"], milestone: "10 reseller aktif, 150 pelanggan langganan" },
      { period: "Februari 2027", theme: "Ramadan", activities: ["Paket buka puasa & hampers kopi", "Ekspansi reseller ke Depok", "Iklan jam 15.00-18.00"], milestone: "Omzet Rp120 jt" },
      { period: "Maret 2027", theme: "Lebaran & ekspansi", activities: ["Hampers Lebaran B2B", "Reseller Bogor", "Program loyalitas pasca-Lebaran"], milestone: "30 reseller aktif di 3 kota" },
      { period: "April 2027", theme: "Skala yang terbukti", activities: ["Naikkan budget kanal dengan ROAS ≥5x", "Evaluasi 6 bulan & rencana semester berikut"], milestone: "Omzet Rp150 jt, repeat 45%" },
    ],
    budget: {
      monthly: 15000000,
      basis: "user",
      items: [
        { item: "TikTok Shop (GMV Max + live)", pct: 35, amount: 5250000, note: "Kanal akuisisi utama, biaya per order terendah" },
        { item: "Shopee Ads", pct: 25, amount: 3750000, note: "Pertahankan pencarian, fokus pemulihan ROAS" },
        { item: "Insentif reseller", pct: 20, amount: 3000000, note: "Starter kit & bonus target bulanan" },
        { item: "Produksi konten", pct: 10, amount: 1500000, note: "Desainer freelance + 1 sesi foto/bulan" },
        { item: "Cadangan eksperimen", pct: 10, amount: 1500000, note: "Uji KOL mikro & kanal baru" },
      ],
      note: "Pola 70-20-10: 70% kanal terbukti, 20% reseller, 10% eksperimen. Naikkan budget kanal yang ROAS ≥5x selama 2 minggu berturut-turut.",
    },
    measurement: [
      { kpi: "Omzet & order per kanal", tool: "Shopee & TikTok Seller Center + Google Sheet", frequency: "Mingguan", owner: "Owner" },
      { kpi: "ROAS & biaya per order", tool: "Shopee Ads, TikTok Ads Manager", frequency: "2x seminggu", owner: "Owner" },
      { kpi: "Repeat order rate", tool: "Sheet CRM WhatsApp", frequency: "Bulanan", owner: "Admin sosmed" },
      { kpi: "Reseller aktif", tool: "Rekap order reseller", frequency: "Mingguan", owner: "Admin sosmed" },
    ],
    risks: [
      { risk: "Kapasitas produksi tidak kuat saat Ramadan", likelihood: "sedang", impact: "tinggi", mitigation: "Pre-order H-7 dan stok bahan 2 minggu sebelum Ramadan" },
      { risk: "Reseller banting harga di marketplace", likelihood: "tinggi", impact: "sedang", mitigation: "Aturan harga minimum tertulis, reseller hanya jual offline/WA" },
      { risk: "Harga susu naik >10%", likelihood: "sedang", impact: "sedang", mitigation: "Kontrak 3 bulan dengan supplier, siapkan kenaikan harga Rp2rb" },
    ],
    quick_wins: [
      { action: "Ekspor semua nomor pembeli 3 bulan terakhir ke sheet CRM", owner: "Admin sosmed", due: "Hari 1-7", impact: "Basis 2.000+ kontak untuk broadcast repeat" },
      { action: "Ganti 6 kreatif iklan Shopee yang sudah 4 bulan", owner: "Desainer", due: "Hari 1-10", impact: "ROAS kembali ke ≥4,5x" },
      { action: "Broadcast promo pelanggan lama: beli 2 liter gratis ongkir", owner: "Admin sosmed", due: "Hari 8-14", impact: "+150 order repeat" },
      { action: "Rekrut 5 affiliate TikTok pertama", owner: "Owner", due: "Hari 15-30", impact: "Uji biaya per order affiliate" },
    ],
  },
};

export default fixture;
