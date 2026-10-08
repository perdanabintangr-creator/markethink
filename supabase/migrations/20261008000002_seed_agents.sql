-- Seed Marketing Agents. Admin bisa menambah/mengubah dari /admin/agents tanpa deploy.

insert into public.agents (slug, name, description, icon, category, default_tier, output_canvas, sort_order, instructions, input_schema) values

('brainstorm-campaign', 'Brainstorm Ide Campaign', 'Kumpulan ide campaign kreatif lengkap dengan big idea, mekanik, dan channel.', 'lightbulb', 'strategi', 'senior', false, 1,
$$Kamu sedang menjalankan agent "Brainstorm Ide Campaign".
Hasilkan 5–7 ide campaign yang berbeda arah (emosional, rasional, UGC/komunitas, kolaborasi, promo, PR stunt, edukasi).
Untuk tiap ide tulis: Nama campaign, Big idea (1 kalimat), Insight konsumen yang mendasari, Mekanik eksekusi, Channel utama, Estimasi effort (rendah/sedang/tinggi), dan Contoh headline.
Tutup dengan tabel perbandingan (ide × dampak × biaya × kecepatan eksekusi) dan rekomendasi 1 ide terbaik beserta alasannya.$$,
'[{"name":"brand","label":"Brand / produk","type":"text","required":true,"placeholder":"mis. Kopi Senja – kopi susu literan"},
  {"name":"objective","label":"Tujuan campaign","type":"select","required":true,"options":["Awareness","Engagement","Leads","Penjualan","Retensi / loyalitas","Launching produk baru"]},
  {"name":"audience","label":"Target audiens","type":"textarea","placeholder":"Usia, lokasi, kebiasaan, pain point"},
  {"name":"budget","label":"Range budget","type":"text","placeholder":"mis. Rp5–10 juta"},
  {"name":"context","label":"Konteks tambahan","type":"textarea","placeholder":"Momen (Ramadan, 12.12), kompetitor, batasan"}]'::jsonb),

('brand-positioning', 'Brand Positioning & USP', 'Rumuskan positioning statement, USP, dan pilar pesan brand.', 'target', 'strategi', 'associate', true, 2,
$$Kamu sedang menjalankan agent "Brand Positioning & USP".
Susun: 1) Analisis kategori & kompetitor singkat, 2) Target audiens prioritas & insight, 3) Positioning statement (format: Untuk [target] yang [kebutuhan], [brand] adalah [kategori] yang [manfaat utama] karena [reason to believe]), 4) 3 alternatif USP dan rekomendasi, 5) Brand pillars (3–4) dengan proof point, 6) Messaging house (key message → supporting messages → bukti), 7) Tagline options (5), 8) Do & Don't komunikasi.$$,
'[{"name":"brand","label":"Nama brand","type":"text","required":true},
  {"name":"product","label":"Produk / jasa","type":"textarea","required":true},
  {"name":"audience","label":"Target audiens","type":"textarea"},
  {"name":"competitors","label":"Kompetitor utama","type":"textarea","placeholder":"Sebutkan 2–5 kompetitor"},
  {"name":"strengths","label":"Kelebihan yang kamu yakini","type":"textarea"}]'::jsonb),

('buyer-persona', 'Buyer Persona', 'Bangun 2–3 buyer persona lengkap dengan pain point & customer journey.', 'users', 'riset', 'senior', true, 3,
$$Kamu sedang menjalankan agent "Buyer Persona".
Buat 2–3 persona. Untuk tiap persona: nama & foto-deskripsi singkat, demografi, psikografi, tujuan, pain point, trigger membeli, keberatan (objection), channel & konten yang dikonsumsi, influencer/sumber kepercayaan, kutipan khas, dan pesan yang paling mengena.
Lanjutkan dengan tabel customer journey (Awareness → Consideration → Purchase → Retention → Advocacy) per persona: touchpoint, pertanyaan di benak, konten yang dibutuhkan, KPI.$$,
'[{"name":"business","label":"Bisnis / produk","type":"textarea","required":true},
  {"name":"market","label":"Pasar & lokasi","type":"text","placeholder":"mis. Jabodetabek, B2C"},
  {"name":"known","label":"Data pelanggan yang sudah diketahui","type":"textarea"}]'::jsonb),

('competitor-swot', 'Analisis Kompetitor & SWOT', 'Bandingkan kompetitor dan susun SWOT + strategi TOWS.', 'swords', 'riset', 'associate', true, 4,
$$Kamu sedang menjalankan agent "Analisis Kompetitor & SWOT".
Susun: 1) Tabel kompetitor (positioning, harga, produk unggulan, channel, kekuatan, kelemahan, tone komunikasi), 2) Peta posisi (jelaskan sumbu & letak tiap brand), 3) SWOT brand user, 4) Matriks TOWS (SO, WO, ST, WT) dengan strategi konkret, 5) 5 quick wins yang bisa dieksekusi 30 hari.
Jika data kompetitor tidak pasti, beri label "perlu verifikasi" dan sarankan mengaktifkan Riset Web.$$,
'[{"name":"brand","label":"Brand kamu","type":"text","required":true},
  {"name":"competitors","label":"Kompetitor","type":"textarea","required":true,"placeholder":"Satu per baris"},
  {"name":"category","label":"Kategori / industri","type":"text"},
  {"name":"notes","label":"Catatan","type":"textarea"}]'::jsonb),

('campaign-plan', 'Campaign Plan End-to-End', 'Rencana campaign dari objective sampai KPI, siap dipresentasikan.', 'map', 'strategi', 'associate', true, 5,
$$Kamu sedang menjalankan agent "Campaign Plan End-to-End".
Struktur wajib: 1) Ringkasan eksekutif, 2) Objective (SMART), 3) Target audiens & insight, 4) Big idea & key message, 5) Strategi channel (tabel: channel, peran di funnel, format konten, frekuensi, porsi budget), 6) Timeline per fase (teaser, launch, sustain, closing) dalam tabel mingguan, 7) Alokasi budget (tabel dengan nominal & persentase), 8) KPI per funnel + target angka + tool pengukuran, 9) Risiko & mitigasi, 10) Next steps 7 hari pertama.$$,
'[{"name":"brand","label":"Brand / produk","type":"text","required":true},
  {"name":"objective","label":"Objective","type":"textarea","required":true},
  {"name":"audience","label":"Target audiens","type":"textarea"},
  {"name":"budget","label":"Total budget","type":"text"},
  {"name":"duration","label":"Durasi campaign","type":"text","placeholder":"mis. 6 minggu"},
  {"name":"channels","label":"Channel yang tersedia","type":"text","placeholder":"IG, TikTok, Meta Ads, KOL, offline"}]'::jsonb),

('content-calendar', 'Content Calendar', 'Kalender konten dalam tabel, siap export CSV.', 'calendar', 'konten', 'senior', true, 6,
$$Kamu sedang menjalankan agent "Content Calendar".
Output utama berupa SATU tabel markdown dengan kolom persis: Tanggal | Hari | Platform | Pilar Konten | Format | Topik/Judul | Hook | Caption Singkat | CTA | Status.
Isi untuk seluruh periode yang diminta dengan frekuensi sesuai input. Sebelum tabel, tulis singkat pilar konten (3–5) dan proporsinya. Setelah tabel, beri tips produksi batch dan metrik yang dipantau.$$,
'[{"name":"brand","label":"Brand","type":"text","required":true},
  {"name":"period","label":"Periode","type":"text","required":true,"placeholder":"mis. 1–30 November 2026"},
  {"name":"platforms","label":"Platform","type":"text","placeholder":"Instagram, TikTok"},
  {"name":"frequency","label":"Frekuensi posting","type":"text","placeholder":"mis. 4x seminggu"},
  {"name":"themes","label":"Tema / momen penting","type":"textarea"}]'::jsonb),

('social-caption', 'Caption IG/TikTok/LinkedIn', 'Caption + hook + hashtag sesuai karakter platform.', 'message-square', 'konten', 'junior', false, 7,
$$Kamu sedang menjalankan agent "Caption Sosial Media".
Buat 3 variasi caption untuk platform yang diminta. Tiap variasi: Hook (baris pertama yang menghentikan scroll), Body, CTA, dan 8–15 hashtag (campuran besar, niche, branded). Sesuaikan panjang & gaya dengan platform (LinkedIn lebih profesional, TikTok singkat & playful). Beri label angle tiap variasi.$$,
'[{"name":"platform","label":"Platform","type":"select","required":true,"options":["Instagram","TikTok","LinkedIn","X/Twitter","Facebook"]},
  {"name":"topic","label":"Topik / produk","type":"textarea","required":true},
  {"name":"tone","label":"Tone","type":"select","options":["Santai","Profesional","Lucu","Inspiratif","Hard selling"]},
  {"name":"cta","label":"CTA yang diinginkan","type":"text"}]'::jsonb),

('short-video-script', 'Script Video Pendek', 'Script TikTok/Reels dengan hook 3 detik, scene, dan teks layar.', 'clapperboard', 'konten', 'senior', true, 8,
$$Kamu sedang menjalankan agent "Script Video Pendek".
Buat 3 konsep script. Tiap script dalam tabel: Detik | Visual/Shot | Voice over/Dialog | Teks di layar | Audio/SFX. Wajib: hook di 0–3 detik, retention trick di tengah, CTA di akhir. Sertakan judul, durasi, format (talking head, POV, skit, tutorial, before-after), dan saran audio tren yang relevan (umum, tanpa klaim spesifik).$$,
'[{"name":"product","label":"Produk / topik","type":"textarea","required":true},
  {"name":"duration","label":"Durasi","type":"select","options":["15 detik","30 detik","60 detik"]},
  {"name":"goal","label":"Tujuan video","type":"select","options":["Awareness","Edukasi","Jualan","Engagement"]},
  {"name":"talent","label":"Talent / resource yang tersedia","type":"text"}]'::jsonb),

('ads-copy', 'Ads Copy (Meta, Google, TikTok)', 'Copy iklan per format platform dengan variasi A/B.', 'megaphone', 'iklan', 'senior', false, 9,
$$Kamu sedang menjalankan agent "Ads Copy".
Ikuti batas karakter platform: Google Search (headline ≤30, description ≤90, buat 10 headline + 4 description), Meta (primary text, headline ≤40, description), TikTok (ad text ≤100 + ide visual). Buat variasi A/B dengan angle berbeda (pain, benefit, social proof, urgency, offer). Akhiri dengan tabel rencana A/B test: variabel yang diuji, hipotesis, metrik keberhasilan.$$,
'[{"name":"platform","label":"Platform","type":"select","required":true,"options":["Meta Ads","Google Ads","TikTok Ads","Semua"]},
  {"name":"product","label":"Produk & offer","type":"textarea","required":true},
  {"name":"audience","label":"Target","type":"textarea"},
  {"name":"objective","label":"Objective iklan","type":"select","options":["Traffic","Konversi","Leads","Install app","Awareness"]}]'::jsonb),

('marketplace-copy', 'Copy Marketplace', 'Judul & deskripsi produk Shopee/Tokopedia/TikTok Shop yang SEO-friendly.', 'shopping-bag', 'umkm', 'junior', false, 10,
$$Kamu sedang menjalankan agent "Copy Marketplace".
Hasilkan: 3 opsi judul produk (≤100 karakter, kata kunci utama di depan), deskripsi produk terstruktur (hook, manfaat dengan emoji bullet, spesifikasi, isi paket, cara pakai, garansi/FAQ), 10 kata kunci pencarian, dan saran 5 teks untuk foto/thumbnail produk. Sesuaikan aturan umum marketplace (hindari klaim berlebihan & kata terlarang).$$,
'[{"name":"marketplace","label":"Marketplace","type":"select","required":true,"options":["Shopee","Tokopedia","TikTok Shop","Lazada","Semua"]},
  {"name":"product","label":"Nama & detail produk","type":"textarea","required":true},
  {"name":"price","label":"Harga & promo","type":"text"},
  {"name":"usp","label":"Keunggulan","type":"textarea"}]'::jsonb),

('whatsapp-script', 'WhatsApp Broadcast & Follow-up', 'Script broadcast, follow-up, dan balasan keberatan pelanggan.', 'message-circle', 'umkm', 'junior', false, 11,
$$Kamu sedang menjalankan agent "WhatsApp Broadcast & Follow-up".
Buat: 1) 3 variasi pesan broadcast (singkat, personal, dengan CTA jelas), 2) Sequence follow-up (H+1, H+3, H+7) untuk yang belum membalas, 3) Template balasan untuk 5 keberatan umum (mahal, nanti dulu, ragu kualitas, bandingkan toko lain, ongkir), 4) Tips agar tidak dianggap spam & patuh kebijakan WhatsApp Business. Gunakan variabel seperti {nama}.$$,
'[{"name":"business","label":"Bisnis / produk","type":"textarea","required":true},
  {"name":"goal","label":"Tujuan pesan","type":"select","options":["Promo","Reminder pembayaran","Re-engagement pelanggan lama","Launching produk","Follow-up leads"]},
  {"name":"offer","label":"Offer / promo","type":"text"},
  {"name":"tone","label":"Tone","type":"select","options":["Ramah santai","Sopan formal","Akrab ala teman"]}]'::jsonb),

('seo-article', 'Artikel SEO', 'Artikel blog SEO lengkap dengan outline, meta, dan FAQ.', 'file-text', 'konten', 'senior', true, 12,
$$Kamu sedang menjalankan agent "Artikel SEO".
Output: meta title (≤60 karakter), meta description (≤155), slug, keyword utama & turunan, outline H2/H3, lalu artikel lengkap sesuai panjang yang diminta dengan keyword natural, paragraf pendek, subjudul jelas, bullet, internal link suggestion [dalam kurung siku], FAQ (4–5 pertanyaan, cocok untuk schema), dan CTA penutup.$$,
'[{"name":"keyword","label":"Keyword utama","type":"text","required":true},
  {"name":"audience","label":"Pembaca sasaran","type":"text"},
  {"name":"length","label":"Panjang","type":"select","options":["±800 kata","±1200 kata","±2000 kata"]},
  {"name":"brand","label":"Brand / produk yang disisipkan","type":"text"}]'::jsonb),

('kol-brief', 'KOL / Influencer Brief', 'Brief KOL siap kirim: objective, deliverables, do & don''t, timeline.', 'star', 'iklan', 'senior', true, 13,
$$Kamu sedang menjalankan agent "KOL Brief".
Susun brief profesional: latar belakang brand, objective, target audiens, key message (maks 3), deliverables per KOL (format, jumlah, durasi), mandatory (tag, hashtag, link, disclosure #ad / kerja sama berbayar), do & don't, referensi konten, timeline (draft, revisi, posting), KPI & reporting, plus kriteria pemilihan KOL (tier nano/micro/macro, ER minimum, kecocokan audiens) dan estimasi rate card umum (beri catatan bahwa rate bervariasi).$$,
'[{"name":"brand","label":"Brand / produk","type":"text","required":true},
  {"name":"objective","label":"Objective","type":"textarea","required":true},
  {"name":"kol_tier","label":"Tier KOL","type":"select","options":["Nano (1–10K)","Micro (10–100K)","Macro (100K–1M)","Mega (>1M)","Campuran"]},
  {"name":"budget","label":"Budget","type":"text"},
  {"name":"platform","label":"Platform","type":"text"}]'::jsonb),

('event-activation', 'Event / Activation Plan', 'Rencana event online-to-offline lengkap dengan run-down & budget.', 'party-popper', 'strategi', 'associate', true, 14,
$$Kamu sedang menjalankan agent "Event / Activation Plan".
Susun: konsep & tema, objective + KPI, target pengunjung, mekanik O2O (pre-event online → on-site → post-event online), run-down acara (tabel jam), kebutuhan venue & vendor, rencana promosi, skema data capture (patuh UU PDP), budget breakdown (tabel), checklist H-30 sampai H+7, risiko & mitigasi.$$,
'[{"name":"brand","label":"Brand","type":"text","required":true},
  {"name":"event_type","label":"Jenis event","type":"select","options":["Pop-up store","Launching","Workshop/komunitas","Bazaar","Sampling","Online event/live"]},
  {"name":"location","label":"Lokasi & tanggal","type":"text"},
  {"name":"budget","label":"Budget","type":"text"},
  {"name":"goal","label":"Tujuan","type":"textarea"}]'::jsonb),

('pitch-proposal', 'Pitch Deck & Proposal Klien', 'Outline pitch deck slide-by-slide atau proposal untuk klien.', 'presentation', 'bisnis', 'associate', true, 15,
$$Kamu sedang menjalankan agent "Pitch Deck & Proposal Klien".
Buat outline slide-by-slide (12–15 slide): judul slide, poin isi, visual yang disarankan, dan speaker notes singkat. Struktur umum: masalah/opportunity klien → insight → strategi → big idea → eksekusi → timeline → tim → investasi (opsi paket) → KPI & reporting → kenapa kami → next steps. Jika tipe = proposal, tulis versi dokumen lengkap.$$,
'[{"name":"type","label":"Tipe","type":"select","required":true,"options":["Pitch deck","Proposal dokumen"]},
  {"name":"client","label":"Klien & industrinya","type":"text","required":true},
  {"name":"brief","label":"Brief / kebutuhan klien","type":"textarea","required":true},
  {"name":"offer","label":"Layanan yang ditawarkan","type":"textarea"},
  {"name":"budget","label":"Range investasi","type":"text"}]'::jsonb),

('pricing-promo', 'Pricing & Promo Strategy', 'Strategi harga, bundling, dan kalender promo yang tetap untung.', 'tags', 'bisnis', 'senior', true, 16,
$$Kamu sedang menjalankan agent "Pricing & Promo Strategy".
Analisis: struktur biaya & margin (hitung dari input bila ada), pendekatan pricing (cost-plus, value-based, competitor-based) dan rekomendasinya, price ladder/tiering, ide bundling, mekanik promo (diskon, cashback, B2G1, flash sale, voucher ongkir) beserta simulasi margin dalam tabel, kalender promo 3 bulan (termasuk tanggal kembar & momen musiman Indonesia), dan guardrail agar brand tidak terjebak perang harga.$$,
'[{"name":"product","label":"Produk","type":"textarea","required":true},
  {"name":"cost","label":"HPP / biaya per unit","type":"text"},
  {"name":"current_price","label":"Harga sekarang","type":"text"},
  {"name":"competitor_price","label":"Harga kompetitor","type":"text"},
  {"name":"goal","label":"Tujuan","type":"select","options":["Naikkan volume","Naikkan margin","Habiskan stok","Akuisisi pelanggan baru"]}]'::jsonb);
