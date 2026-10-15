/** Contoh hasil AI untuk tool "calendar" (dipakai tes file & pratinjau tampilan). */
const posts = Array.from({ length: 20 }, (_, i) => {
  const day = String(1 + Math.floor(i * 1.5)).padStart(2, "0");
  const pillars = ["Edukasi kopi", "Cerita pelanggan", "Di balik dapur", "Promo & produk"];
  return {
    date: `2026-11-${day}`,
    time: ["07.00", "12.00", "19.00", "20.00"][i % 4],
    platform: i % 2 ? "TikTok" : "Instagram",
    format: i % 2 ? "Video TikTok" : ["Reels", "Carousel"][i % 4 === 0 ? 0 : 1],
    pillar: pillars[i % 4],
    title: `Ide konten ${i + 1}: kenapa kopi literan lebih hemat`,
    hook: "Ngopi tiap hari habis Rp600rb sebulan? Coba hitung ini.",
    caption: "Ngopi tiap hari habis Rp600rb sebulan? 😅\n\nSatu liter Kopi Senja = 6 gelas. Hitungannya cuma Rp7.500 per gelas.\n\nSimpan postingan ini buat bahan ngitung budget bulan depan.",
    cta: "Cek link di bio",
    hashtags: ["kopisusu", "kopiliteran", "ngopidirumah"],
    visual: "Close-up tuang kopi ke gelas es, teks harga per gelas muncul di layar.",
  };
});

const fixture = {
  tool: "calendar",
  input: { brand: "Kopi Senja", month: "2026-11", business: "Kopi susu literan gula aren Rp45rb untuk pekerja kantoran", platforms: ["instagram", "tiktok"], goal: "sales", per_week: 5 },
  kinds: ["pptx", "xlsx"],
  output: {
    summary: "November difokuskan untuk mengubah penonton jadi pembeli rutin lewat hitungan hemat per gelas dan bukti dari pelanggan.",
    strategy: { objective: "120 order dari sosmed dan 1.500 followers baru", insight: "Pekerja kantoran merasa boros beli kopi harian tapi tidak mau berhenti ngopi.", angle: "Ngopi enak tanpa merasa boros" },
    pillars: [
      { name: "Edukasi kopi", purpose: "Membangun kepercayaan soal bahan & rasa", share_pct: 30, formats: ["Carousel", "Reels"] },
      { name: "Cerita pelanggan", purpose: "Bukti sosial dari pembeli nyata", share_pct: 25, formats: ["Reels"] },
      { name: "Di balik dapur", purpose: "Transparansi proses produksi", share_pct: 20, formats: ["Video TikTok"] },
      { name: "Promo & produk", purpose: "Mendorong pembelian", share_pct: 25, formats: ["Carousel", "Story"] },
    ],
    key_dates: [
      { date: "2026-11-11", moment: "Promo 11.11", idea: "Bundling 2 liter + voucher ongkir" },
      { date: "2026-11-25", moment: "Payday", idea: "Stok kopi sebulan untuk kantor" },
    ],
    posts,
    kpis: [
      { metric: "Order dari sosmed", target: "120" },
      { metric: "Followers baru", target: "+1.500" },
      { metric: "Engagement rate", target: "≥ 4%" },
    ],
    workflow: ["Syuting batch tiap Senin untuk 5 konten seminggu.", "Approval caption H-2 lewat WhatsApp.", "Potong 1 Reels jadi 2 video TikTok."],
  },
};

export default fixture;
