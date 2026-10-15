/** Contoh hasil AI untuk tool "promo" (dipakai tes file & pratinjau tampilan). */
import { calcMargin, type PromoMargin } from "../../../src/lib/addons/pro/specs/promo";

const m = (product: string, scenario: string, price: number, discount_pct: number, cogs: number, platform_fee_pct: number, other_cost: number | null, note: string): PromoMargin =>
  calcMargin({ product, scenario, price, discount_pct, promo_price: 0, cogs, platform_fee_pct, other_cost, margin_rp: 0, margin_pct: 0, status: "aman", note });

const fixture = {
  tool: "promo",
  input: {
    store: "Glowria Official Shop",
    platforms: ["shopee", "tiktok_shop"],
    start_month: "2026-11",
    months: "2",
    goal: "omzet",
    products:
      "Serum Niacinamide 10% 30ml — Rp149.000, HPP Rp38.000, ±180 pcs/hari\nMoisturizer Gel 50g — Rp119.000, HPP Rp31.000, ±110 pcs/hari\nSunscreen SPF50 PA++++ — Rp89.000, HPP Rp27.000, ±160 pcs/hari\nPaket Glow (serum + moisturizer) — Rp249.000, HPP Rp69.000",
    budget: "Diskon maks 35%, subsidi voucher ±Rp25 jt/bulan, iklan Shopee Ads + GMV Max TikTok ±Rp90 jt/bulan",
    notes: "Omzet sekarang ±Rp1,8 M/bulan, 60% Shopee. Ada 2 host live tetap. Gudang sendiri di Tangerang.",
  },
  kinds: ["pptx", "xlsx"],
  output: {
    summary:
      "Dua bulan ini omzet ditumpukan ke 11.11 dan 12.12 Harbolnas (±45% target periode), payday 25 menjadi penyangga, dan flash sale Jumat menjaga velocity produk. Serum jadi traffic driver dengan diskon terdalam 30%, margin dijaga lewat Paket Glow dan voucher min. belanja Rp200 rb. Target periode Rp1,66 M dari campaign, di atas omzet hari biasa.",
    strategy: {
      focus: "Serum Niacinamide = traffic driver (paling dicari, margin tebal). Paket Glow = profit driver untuk menaikkan AOV dari ±Rp135 rb ke Rp200 rb+. Sunscreen hanya ikut flash sale dengan kuota.",
      margin_guard: "Diskon produk maks 30% di event besar, 15-20% di payday, flash sale 1 SKU dengan kuota 300. Subsidi ongkir hanya untuk keranjang ≥Rp150 rb. Skenario margin < 10% tidak boleh dipakai sebagai mekanisme utama.",
      traffic: "Live 2 sesi × 3 jam di hari-H, voucher eksklusif live Rp20 rb, GMV Max dinaikkan 2,5× H-1 s/d hari-H, komisi affiliate TikTok naik ke 12% selama event besar, broadcast chat ke follower H-1 jam 19.00.",
    },
    campaigns: [
      {
        start: "2026-11-06", end: "2026-11-06", event: "Flash sale Jumat", scale: "rutin", platforms: "Shopee, TikTok Shop",
        mechanism: "Serum diskon 25% slot 12.00 & 20.00, kuota 300 pcs. Hanya 1 SKU agar harga event besar tetap paling menarik.",
        vouchers: [{ name: "Voucher follower", min_spend: 120000, discount: "Rp10.000", quota: 500 }],
        hero_products: ["Serum Niacinamide 30ml"], target_units: 420, target_revenue: 46900000,
        support: "Live 19.00-21.00 host A, push notifikasi toko 11.45 & 19.45.", prep: "Daftar slot flash sale toko H-3, cek stok serum ≥500 pcs.",
      },
      {
        start: "2026-11-11", end: "2026-11-12", event: "11.11", scale: "besar", platforms: "Shopee, TikTok Shop",
        mechanism: "Pemanasan 4-10 Nov: klaim voucher & ajak add to cart. Hari-H: serum 30%, moisturizer 25%, Paket Glow 35% + gift pouch, flash sale 00.00 sunscreen B1G1. Perpanjangan 12 Nov untuk stok sisa. Subsidi voucher ±Rp9 jt.",
        vouchers: [
          { name: "Voucher toko", min_spend: 200000, discount: "Rp25.000", quota: 250 },
          { name: "Voucher live", min_spend: 150000, discount: "Rp20.000", quota: 120 },
        ],
        hero_products: ["Serum Niacinamide 30ml", "Paket Glow"], target_units: 3100, target_revenue: 312000000,
        support: "Live 00.00-02.00 & 19.00-23.00 (2 host bergantian). Budget iklan Rp9 jt/hari 10-11 Nov, target ROAS ≥6. 15 affiliate mikro posting H-2.",
        prep: "Daftar campaign 11.11 di Seller Centre H-21, banner & thumbnail H-7, stok masuk gudang H-7.",
      },
      {
        start: "2026-11-20", end: "2026-11-20", event: "Flash sale Jumat", scale: "rutin", platforms: "Shopee, TikTok Shop",
        mechanism: "Moisturizer diskon 20% slot 12.00 & 20.00, kuota 250 pcs.", vouchers: [],
        hero_products: ["Moisturizer Gel 50g"], target_units: 300, target_revenue: 28600000,
        support: "Live 19.00-21.00, konten TikTok 'routine pagi' tayang 18.00.", prep: "Cek ulasan moisturizer, balas ulasan bintang ≤3 sebelum flash sale.",
      },
      {
        start: "2026-11-25", end: "2026-11-28", event: "Payday 25 + Black Friday", scale: "sedang", platforms: "Shopee, TikTok Shop",
        mechanism: "Diskon 15-20% semua produk utama, Paket Glow 25%. 27 Nov (Black Friday) gratis travel size untuk pembelian ≥Rp250 rb.",
        vouchers: [{ name: "Voucher toko", min_spend: 180000, discount: "Rp15.000", quota: 400 }],
        hero_products: ["Paket Glow", "Sunscreen SPF50"], target_units: 3400, target_revenue: 382000000,
        support: "Live harian 19.00-22.00, budget iklan naik 1,5× selama 4 hari.", prep: "Setting voucher H-2, siapkan 400 travel size gift H-5.",
      },
      {
        start: "2026-12-04", end: "2026-12-04", event: "Flash sale Jumat", scale: "rutin", platforms: "Shopee, TikTok Shop",
        mechanism: "Sunscreen diskon 30% slot 12.00, kuota 300 pcs (pemanasan menuju 12.12).", vouchers: [],
        hero_products: ["Sunscreen SPF50"], target_units: 360, target_revenue: 22400000,
        support: "Live 19.00-21.00.", prep: "Teaser 12.12 di live & feed.",
      },
      {
        start: "2026-12-12", end: "2026-12-13", event: "12.12 Harbolnas", scale: "besar", platforms: "Shopee, TikTok Shop",
        mechanism: "Pemanasan 5-11 Des dengan countdown & klaim voucher. Hari-H: serum 30%, Paket Glow 35% + gift pouch, flash sale 00.00/12.00/20.00 bergilir. 13 Des perpanjangan. Subsidi voucher ±Rp12 jt.",
        vouchers: [
          { name: "Voucher toko", min_spend: 250000, discount: "Rp35.000", quota: 300 },
          { name: "Voucher follower", min_spend: 150000, discount: "Rp15.000", quota: 300 },
        ],
        hero_products: ["Paket Glow", "Serum Niacinamide 30ml"], target_units: 4300, target_revenue: 468000000,
        support: "Live maraton 00.00-02.00, 10.00-13.00, 19.00-23.59. Iklan Rp12 jt/hari 11-12 Des, ROAS ≥5. Komisi affiliate 12%.",
        prep: "Daftar campaign 12.12 H-21, stok tambahan masuk H-7, tambah 2 packer harian H-1 s/d H+2.",
      },
      {
        start: "2026-12-21", end: "2026-12-22", event: "Hari Ibu", scale: "sedang", platforms: "Shopee, TikTok Shop",
        mechanism: "Paket Glow edisi kado (box + kartu ucapan) harga Rp229 rb, tanpa diskon tambahan.", vouchers: [],
        hero_products: ["Paket Glow"], target_units: 450, target_revenue: 103000000,
        support: "Konten 'kado untuk ibu' 3 video TikTok, live 20.00-22.00.", prep: "Box kado & kartu siap H-10.",
      },
      {
        start: "2026-12-25", end: "2026-12-28", event: "Payday 25 akhir tahun", scale: "sedang", platforms: "Shopee, TikTok Shop",
        mechanism: "Diskon 15% produk utama + voucher min. belanja; bundling 'stok liburan' serum + sunscreen hemat Rp40 rb.",
        vouchers: [{ name: "Voucher toko", min_spend: 200000, discount: "Rp20.000", quota: 350 }],
        hero_products: ["Serum Niacinamide 30ml", "Sunscreen SPF50"], target_units: 2900, target_revenue: 300000000,
        support: "Live 19.00-22.00, iklan 1,3× normal (CPM akhir tahun mahal).", prep: "Informasikan jadwal pengiriman libur Natal di deskripsi toko H-3.",
      },
    ],
    margins: [
      m("Serum Niacinamide 30ml", "12.12 diskon 30%", 149000, 30, 38000, 18, 6000, "Aman sebagai traffic driver; masih ada ruang voucher live."),
      m("Serum Niacinamide 30ml", "Flash sale 25%", 149000, 25, 38000, 18, 3000, "Aman. Jaga kuota 300 agar tidak menggerus 11.11."),
      m("Moisturizer Gel 50g", "11.11 diskon 25%", 119000, 25, 31000, 18, 6000, "Aman."),
      m("Paket Glow + gift pouch", "12.12 diskon 35%", 249000, 35, 81000, 18, 8000, "Profit driver; HPP sudah termasuk gift pouch Rp12 rb."),
      m("Sunscreen SPF50 (B1G1)", "11.11 beli 1 gratis 1", 178000, 50, 54000, 18, 6000, "Tipis-aman; batasi kuota 200 paket."),
      m("Sunscreen SPF50", "Flash sale 50% + gratis ongkir", 89000, 50, 27000, 18, 9000, "Margin tipis; pakai hanya bila target ranking, maks 100 pcs."),
      m("Sunscreen SPF50", "Flash sale Rp39 rb", 89000, 56, 27000, 18, 9000, "Rugi. Jangan dipakai; turunkan diskon ke 30% seperti jadwal 4 Des."),
    ],
    stock: [
      { product: "Serum Niacinamide 30ml", peak_event: "12.12 Harbolnas", units_needed: 13800, ready_by: "H-7 (4 Nov & 5 Des)", note: "180/hari × 61 hari = 11.000 + tambahan event ±2.500, safety stock 20% untuk 12.12." },
      { product: "Paket Glow", peak_event: "12.12 Harbolnas", units_needed: 3600, ready_by: "H-7 (5 Des)", note: "25/hari normal, event besar ±8×. Rakit paket H-10 agar packing cepat." },
      { product: "Sunscreen SPF50", peak_event: "11.11", units_needed: 11500, ready_by: "H-7 (4 Nov)", note: "160/hari × 61 hari + 200 paket B1G1 + flash sale; safety stock 25%." },
      { product: "Moisturizer Gel 50g", peak_event: "Payday 25", units_needed: 7900, ready_by: "H-7 (4 Nov)", note: "110/hari × 61 hari + event ±1.200, safety stock 20%." },
    ],
    checklist: [
      { phase: "H-14", task: "Daftarkan produk ke campaign 11.11/12.12 di Seller Centre Shopee & TikTok Shop", owner: "Admin toko" },
      { phase: "H-14", task: "Kunci harga normal (tidak ada perubahan harga sampai event) dan finalkan tabel margin", owner: "E-commerce manager" },
      { phase: "H-14", task: "Brief 15 affiliate mikro + kirim sampel", owner: "Affiliate officer" },
      { phase: "H-7", task: "Stok event masuk gudang & dihitung ulang (stock opname)", owner: "Gudang" },
      { phase: "H-7", task: "Ganti banner toko, thumbnail produk bertanda harga event", owner: "Desainer" },
      { phase: "H-7", task: "Mulai pemanasan: voucher bisa diklaim, konten countdown harian", owner: "Content" },
      { phase: "H-1", task: "Cek ulang setting voucher (min. belanja, kuota, periode) dan harga flash sale", owner: "Admin toko" },
      { phase: "H-1", task: "Naikkan budget iklan 2,5×, siapkan rundown live 00.00", owner: "Ads specialist" },
      { phase: "Hari-H", task: "Pantau stok per jam; tutup SKU yang tersisa < 30 pcs dari flash sale", owner: "Admin toko" },
      { phase: "Hari-H", task: "Balas chat < 5 menit, siapkan template jawaban stok & pengiriman", owner: "CS" },
      { phase: "H+1", task: "Rekap GMV, ROAS, conversion rate per jam; catat jam paling ramai untuk event berikutnya", owner: "E-commerce manager" },
      { phase: "H+1", task: "Kirim semua pesanan maksimal H+2 agar skor pengiriman tidak turun", owner: "Gudang" },
    ],
    kpis: [
      { metric: "GMV periode (campaign)", target: "Rp1,66 M" },
      { metric: "Conversion rate toko hari-H", target: "≥ 4,5%" },
      { metric: "ROAS iklan event besar", target: "≥ 5x" },
      { metric: "AOV saat event", target: "≥ Rp195 rb" },
      { metric: "Pesanan dikirim ≤ 2 hari", target: "≥ 97%" },
    ],
    risks: [
      "Stok serum habis di 12.12 → reorder ke pabrik paling lambat 10 Nov, pantau sisa stok setiap pagi.",
      "Voucher habis di jam pertama → kuota dibagi 3 gelombang (00.00, 12.00, 20.00).",
      "ROAS turun karena CPM naik di event besar → batasi budget harian, alihkan ke GMV Max produk dengan conversion rate tertinggi.",
      "Penalti harga coret → tidak mengubah harga normal sejak H-14.",
    ],
  },
};

export default fixture;
