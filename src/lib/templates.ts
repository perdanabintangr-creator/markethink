/** Template siap pakai per peran: kerangka perintah, bagian [..] diisi user. */
export interface Template {
  title: string;
  desc: string;
  prompt: string;
  research?: boolean;
  /** Versi bahasa Inggris (UI "en"). */
  en?: { title: string; desc: string; prompt: string };
}

export const TEMPLATE_GROUPS: { id: string; label: string; labelEn: string; roles: string[]; items: Template[] }[] = [
  {
    id: "umkm",
    label: "UMKM",
    labelEn: "Small business",
    roles: ["umkm_owner"],
    items: [
      { title: "Caption promo produk", desc: "5 caption IG/TikTok + hashtag", prompt: "Buatkan 5 caption Instagram/TikTok untuk promo [nama produk] (harga [harga], promo [isi promo]). Target pembeli [target]. Gaya santai, ada ajakan beli, plus hashtag lokal.", en: { title: "Product promo captions", desc: "5 IG/TikTok captions + hashtags", prompt: "Write 5 Instagram/TikTok captions to promote [product name] (price [price], offer [offer details]). Target buyers: [target]. Casual tone, with a call to buy, plus local hashtags." } },
      { title: "Pesan WA blast", desc: "Pesan promo ke pelanggan", prompt: "Buatkan 3 versi pesan WhatsApp blast untuk pelanggan lama tentang [promo/produk baru]. Singkat, ramah, tidak terkesan spam, ada tombol ajakan (balas/klik link [link]).", en: { title: "WhatsApp broadcast", desc: "Promo message for customers", prompt: "Write 3 versions of a WhatsApp broadcast message for existing customers about [promo/new product]. Short, friendly, not spammy, with a clear call to action (reply/click link [link])." } },
      { title: "Deskripsi produk marketplace", desc: "Shopee/Tokopedia, ramah SEO", prompt: "Buatkan judul & deskripsi produk Shopee/Tokopedia untuk [nama produk]: bahan [bahan], ukuran [ukuran], keunggulan [keunggulan]. Pakai kata kunci yang sering dicari, poin-poin jelas, dan FAQ singkat.", en: { title: "Marketplace product description", desc: "Shopee/Tokopedia, SEO-friendly", prompt: "Write a Shopee/Tokopedia product title & description for [product name]: material [material], size [size], key benefits [benefits]. Use commonly searched keywords, clear bullet points, and a short FAQ." } },
      { title: "Foto Produk Studio", desc: "Foto HP jadi foto katalog", prompt: "Ubah foto produk yang saya lampirkan jadi foto katalog [studio putih/lifestyle/flatlay] untuk [marketplace/iklan], 2 variasi.", en: { title: "Product Photo Studio", desc: "Turn phone photos into catalog shots", prompt: "Turn the product photo I attached into a [white studio/lifestyle/flat lay] catalog photo for [marketplace/ads], 2 variations." } },
      { title: "Poster promo", desc: "Poster feed/story siap posting", prompt: "Buatkan poster promo [isi promo, mis. Beli 2 Gratis 1] untuk [nama usaha], berlaku [tanggal], format [4:5 feed / 9:16 story], gaya [ceria/elegan].", en: { title: "Promo poster", desc: "Feed/story poster ready to post", prompt: "Make a promo poster for [offer, e.g. Buy 2 Get 1 Free] for [business name], valid [dates], [4:5 feed / 9:16 story] format, [playful/elegant] style." } },
      { title: "Balas komplain pelanggan", desc: "Jawaban sopan yang menenangkan", prompt: "Bantu saya membalas komplain pelanggan ini dengan sopan dan solutif: \"[tempel komplain]\". Tawarkan solusi [refund/tukar/diskon].", en: { title: "Reply to a customer complaint", desc: "A polite, reassuring reply", prompt: "Help me reply to this customer complaint politely and constructively: \"[paste complaint]\". Offer a solution: [refund/exchange/discount]." } },
    ],
  },
  {
    id: "officer",
    label: "Marketing Officer",
    labelEn: "Marketing Officer",
    roles: ["marketing_pro", "student", "other"],
    items: [
      { title: "Laporan bulanan (PPT)", desc: "Dari data Excel/CSV terlampir", prompt: "Buatkan PPT laporan kinerja marketing bulan [bulan] dari data terlampir: ringkasan eksekutif, KPI vs target, grafik tren, insight, dan rencana bulan depan. Audiens: [atasan/direksi].", en: { title: "Monthly report (PPT)", desc: "From attached Excel/CSV data", prompt: "Make a PowerPoint marketing performance report for [month] from the attached data: executive summary, KPIs vs targets, trend charts, insights, and next month's plan. Audience: [manager/board]." } },
      { title: "Kalender konten 1 bulan", desc: "Ide posting per hari", prompt: "Buatkan kalender konten [Instagram/TikTok] 1 bulan untuk [brand] dengan pilar konten [edukasi/promo/engagement], lengkap hook, format, dan CTA tiap posting.", en: { title: "1-month content calendar", desc: "Daily post ideas", prompt: "Create a 1-month [Instagram/TikTok] content calendar for [brand] with content pillars [education/promo/engagement], including the hook, format, and CTA for each post." } },
      { title: "Carousel edukasi", desc: "Carousel IG 6-8 slide", prompt: "Buatkan carousel Instagram 7 slide tentang [topik] untuk [brand], target [audiens]. Hook kuat di slide 1, tips praktis, dan CTA simpan & follow.", en: { title: "Educational carousel", desc: "6-8 slide IG carousel", prompt: "Make a 7-slide Instagram carousel about [topic] for [brand], targeting [audience]. Strong hook on slide 1, practical tips, and a save & follow CTA." } },
      { title: "Copy iklan (A/B)", desc: "Meta/TikTok Ads 3 versi", prompt: "Buatkan 3 versi copy iklan [Meta/TikTok] Ads untuk [produk] dengan angle berbeda (masalah, manfaat, bukti sosial). Sertakan headline, primary text, dan CTA.", en: { title: "Ad copy (A/B)", desc: "3 Meta/TikTok Ads versions", prompt: "Write 3 versions of [Meta/TikTok] Ads copy for [product] with different angles (problem, benefit, social proof). Include the headline, primary text, and CTA." } },
      { title: "Analisis kompetitor", desc: "Dengan riset web & sumber", prompt: "Riset dan bandingkan [brand kami] dengan kompetitor [kompetitor 1, 2, 3]: harga, positioning, channel, konten yang berhasil, dan peluang yang bisa kami ambil.", research: true, en: { title: "Competitor analysis", desc: "With web research & sources", prompt: "Research and compare [our brand] with competitors [competitor 1, 2, 3]: pricing, positioning, channels, content that works, and opportunities we can take." } },
      { title: "Brief untuk desainer/agency", desc: "Brief kampanye yang jelas", prompt: "Buatkan creative brief untuk kampanye [nama kampanye]: tujuan, target audiens, pesan utama, mandatories, deliverables [daftar], timeline [tanggal], dan budget [nominal].", en: { title: "Brief for a designer/agency", desc: "A clear campaign brief", prompt: "Write a creative brief for the [campaign name] campaign: objective, target audience, key message, mandatories, deliverables [list], timeline [dates], and budget [amount]." } },
    ],
  },
  {
    id: "agency",
    label: "Agency",
    labelEn: "Agency",
    roles: [],
    items: [
      { title: "Pitch deck klien baru", desc: "Deck agency untuk pitching", prompt: "Buatkan pitch deck untuk calon klien [nama klien, industri]: pemahaman masalah, insight, big idea, strategi channel, contoh eksekusi, timeline, dan investasi [range budget].", en: { title: "New client pitch deck", desc: "Agency pitching deck", prompt: "Make a pitch deck for prospective client [client name, industry]: problem understanding, insight, big idea, channel strategy, execution examples, timeline, and investment [budget range]." } },
      { title: "Proposal kampanye", desc: "Strategi + estimasi budget", prompt: "Susun proposal kampanye [tujuan kampanye] untuk [klien] selama [durasi]: strategi, rencana konten, media plan, KPI, dan rincian estimasi biaya total [budget].", en: { title: "Campaign proposal", desc: "Strategy + budget estimate", prompt: "Put together a campaign proposal for [campaign objective] for [client] over [duration]: strategy, content plan, media plan, KPIs, and a breakdown of the total estimated cost [budget]." } },
      { title: "Laporan bulanan klien", desc: "PPT hasil kampanye", prompt: "Buatkan PPT laporan bulanan untuk klien [nama klien] dari data terlampir: highlight, performa per channel, konten terbaik, pembelajaran, dan rekomendasi bulan depan.", en: { title: "Client monthly report", desc: "Campaign results deck", prompt: "Make a monthly report deck for client [client name] from the attached data: highlights, performance by channel, top content, learnings, and recommendations for next month." } },
      { title: "3 big idea kreatif", desc: "Alternatif konsep kampanye", prompt: "Berikan 3 alternatif big idea kampanye untuk [brand/produk] dengan tujuan [tujuan]. Tiap ide: nama konsep, insight, tagline, contoh eksekusi di [channel], dan kenapa akan berhasil.", en: { title: "3 creative big ideas", desc: "Alternative campaign concepts", prompt: "Give 3 alternative campaign big ideas for [brand/product] with the objective [objective]. For each idea: concept name, insight, tagline, an execution example on [channel], and why it will work." } },
      { title: "Moodboard visual", desc: "Arah visual dalam carousel", prompt: "Buatkan moodboard visual untuk kampanye [nama kampanye] brand [brand]: arah warna, gaya foto, tipografi, dan contoh visual, dalam bentuk carousel 6 slide format 4:5.", en: { title: "Visual moodboard", desc: "Visual direction as a carousel", prompt: "Make a visual moodboard for the [campaign name] campaign for [brand]: color direction, photo style, typography, and sample visuals, as a 6-slide carousel in 4:5 format." } },
      { title: "Media plan & KPI", desc: "Alokasi budget per channel", prompt: "Susun media plan [durasi] untuk [klien] dengan budget [nominal]: alokasi per channel, estimasi reach/CPM/CPA, KPI, dan jadwal, dalam bentuk tabel.", en: { title: "Media plan & KPIs", desc: "Budget split by channel", prompt: "Put together a [duration] media plan for [client] with a budget of [amount]: allocation per channel, estimated reach/CPM/CPA, KPIs, and schedule, as a table." } },
    ],
  },
  {
    id: "freelancer",
    label: "Freelancer",
    labelEn: "Freelancer",
    roles: ["freelancer"],
    items: [
      { title: "Proposal penawaran jasa", desc: "Proposal singkat yang meyakinkan", prompt: "Buatkan proposal penawaran jasa [jenis jasa] untuk [calon klien]: pemahaman kebutuhan, ruang lingkup, timeline, harga [harga/paket], dan langkah selanjutnya.", en: { title: "Service proposal", desc: "A short, persuasive proposal", prompt: "Write a proposal offering [service type] to [prospective client]: understanding of their needs, scope of work, timeline, pricing [price/package], and next steps." } },
      { title: "Brief klien jadi checklist", desc: "Rapikan brief yang berantakan", prompt: "Rapikan brief klien berikut jadi checklist kerja yang jelas (deliverables, deadline, pertanyaan yang perlu dikonfirmasi): \"[tempel brief]\".", en: { title: "Client brief to checklist", desc: "Tidy up a messy brief", prompt: "Turn this client brief into a clear work checklist (deliverables, deadlines, questions to confirm): \"[paste brief]\"." } },
      { title: "Case study portofolio", desc: "Carousel studi kasus", prompt: "Buatkan carousel case study 6 slide untuk portofolio saya: proyek [nama proyek] untuk [klien], masalah, solusi, hasil [angka hasil], dan CTA hubungi saya.", en: { title: "Portfolio case study", desc: "Case study carousel", prompt: "Make a 6-slide case study carousel for my portfolio: project [project name] for [client], the problem, solution, results [result numbers], and a contact-me CTA." } },
      { title: "Hitung harga jasa", desc: "Rate card yang masuk akal", prompt: "Bantu saya menyusun rate card jasa [jenis jasa] untuk pasar [lokasi/segmen]: paket dasar sampai premium, apa saja yang termasuk, dan alasan harganya.", en: { title: "Price your services", desc: "A sensible rate card", prompt: "Help me build a rate card for [service type] for the [location/segment] market: basic to premium packages, what each includes, and the reasoning behind the prices." } },
      { title: "Email follow-up klien", desc: "Tagih jawaban / pembayaran dengan sopan", prompt: "Buatkan email follow-up yang sopan tapi tegas ke klien [nama] tentang [penawaran/invoice yang belum dibalas] sejak [tanggal].", en: { title: "Client follow-up email", desc: "Chase a reply / payment politely", prompt: "Write a polite but firm follow-up email to client [name] about [unanswered proposal/invoice] since [date]." } },
      { title: "Personal branding LinkedIn", desc: "5 ide posting + 1 draft", prompt: "Berikan 5 ide posting LinkedIn untuk personal branding saya sebagai [profesi] dan tuliskan 1 draft posting lengkap tentang [topik].", en: { title: "LinkedIn personal branding", desc: "5 post ideas + 1 draft", prompt: "Give me 5 LinkedIn post ideas for my personal branding as a [profession] and write 1 full draft post about [topic]." } },
    ],
  },
];

/** Grup bawaan sesuai peran user (onboarding). */
export function groupForRole(role: string | null | undefined) {
  return TEMPLATE_GROUPS.find((g) => role && g.roles.includes(role))?.id ?? "umkm";
}

/** Template sesuai bahasa UI (judul, deskripsi & kerangka perintah). */
export function localizeTemplate(t: Template, lang: "id" | "en"): Template {
  return lang === "en" && t.en ? { ...t, ...t.en } : t;
}
