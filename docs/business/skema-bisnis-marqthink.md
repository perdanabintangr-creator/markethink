# Skema Bisnis Marqthink — sebelum launching berbayar

Disusun 21 Nov 2026 dari kode (`src/`), database production (Supabase), dan harga publik terbaru. **Analisis saja**: tidak ada kode, database, atau deploy yang diubah.
Semua angka dalam Rupiah dengan kurs **Rp18.270/USD** (penutupan 20 Nov 2026). Angka bisa diubah di `unit-economics.xlsx` → sheet *Asumsi*.
Label: **[DATA ASLI]** = dari log `usage_logs` / tabel database · **[HARGA RESMI]** = harga publik vendor · **[ESTIMASI]** = hitungan/asumsi saya.

---

## Ringkasan eksekutif (1 halaman)

**Kondisi hari ini.** Produknya sudah lengkap untuk dijual: Chat 4 otak, 25 Smart Tools, Marqthink Agent, Autopilot Konten (riset brand → Brand DNA → ide → tulis → periksa → visual AI → terbit otomatis ke Instagram), pembayaran Midtrans live, halaman harga, S&K, Privasi (UU PDP), Refund. Pengguna: 8 akun (6 Free, 1 Starter, 1 Promax milik founder). Baru 1 pembayaran sukses (uji QRIS Rp2.000).

**Tiga masalah yang harus diberesin sebelum jualan:**
1. **Paket tidak pernah kedaluwarsa.** Setelah masa bayar habis, user tetap di paket berbayar (ada 1 user Starter yang masa aktifnya habis 18 Nov dan masih Starter). Padahal halaman Refund menjanjikan "paket kembali ke versi gratis". Ini kebocoran pendapatan sekaligus masalah hukum.
2. **Paket Pro dan Promax RUGI untuk pemakai berat.** Autopilot dan Brand DNA **tidak memotong kredit**, jadi modalnya di luar jatah:
   - Pro (Rp200rb): rugi **Rp47.625/bln (−23,8%)** bila kredit dan kuota Autopilot habis dipakai.
   - Promax (Rp300rb): rugi **Rp181.832/bln (−60,6%)**.
   - Di pemakaian rata-rata masih untung (Pro 43,6%, Promax hanya 23,4% = tipis).
3. **Kurs di kode sudah usang:** Rp16.500, padahal kurs riil Rp18.270. Setiap 1 kredit memakan modal **10,7% lebih besar** dari yang dihitung aplikasi.

**Rekomendasi harga:**

| Paket | Harga | Isi utama |
|---|---|---|
| Starter | **Rp79rb** | — |
| Pro | **Rp299rb** | Autopilot 20 post/bln, 2 visual isi per carousel |
| Promax | **Rp549rb** | Autopilot 45 post/bln, 4 visual |
| Agency (baru) | **Rp999rb** | 3 brand |

- Tambahan: top-up kredit, paket post dan gambar, jasa Setup Brand DNA Rp499rb, langganan tahunan.
- Hasilnya:
  - Margin rata-rata: Pro 70%, Promax 67%.
  - Skenario berat: Pro tetap untung **34%**, Promax **29%** (masih tipis, jadi perlu batas *fair use*).
- Posisi harga: Pro Rp299rb masih di bawah ChatGPT Plus (Rp349rb) dan setara Bleam (Rp250rb, hanya autopilot IG untuk 1 akun).

**Titik impas.** Biaya tetap setelah upgrade wajib (Vercel Pro + Supabase Pro + domain + email) ±**Rp853rb/bln**.

| Basis | Kontribusi/customer | Impas | Laba di 100 customer | Bila semua pemakai berat |
|---|---|---|---|---|
| Harga sekarang | Rp70rb | 13 customer | Rp6,2 jt/bln | rugi di semua skala |
| Harga rekomendasi | Rp218rb | 4 customer | Rp20,9 jt/bln | masih untung |

Ini **belum termasuk gaji founder dan biaya marketing**. Kalau target penghasilan founder Rp15 jt/bln, butuh **±73 customer** (harga rekomendasi) atau **±226 customer** (harga sekarang).

**Jalan ke 100 customer dalam 90 hari:**
- Mulai dari **owner UMKM/brand lokal yang aktif di Instagram** dan **freelancer/agency kecil** dari komunitas Brand Circle / Ngopi-Ngopi Bareng Brand dan klien agency Bro.
- Penawaran: **Founding Member** (Pro Rp199rb dikunci 12 bulan untuk 50 orang pertama, bonus Setup Brand DNA).
- Bukti: studi kasus Photobebaz.
- Dogfooding: akun @marqthink.ai dijalankan Autopilot sendiri.
- Analytics (PostHog) **belum aktif sama sekali**. Wajib dipasang sebelum launching supaya funnel bisa diukur.

---

## 1. Peta produk lengkap (dari kode & database)

### 1a. Menu & sub-menu yang ada

| Menu (sidebar) | Route | Isi / sub-fitur |
|---|---|---|
| **Chat baru / Chat** | `/chat`, `/chat/[id]` | 4 otak (Junior, Senior, Head, Director), Riset Web ber-sitasi, lampiran, gambar AI, PPT/deck, canvas dokumen, berbagi chat, pin, riwayat (panel kanan), mode Instagram (`instagram_post`, `check_caption`), voice-to-text (opsional, belum aktif) |
| **Beranda** | `/dashboard` | ringkasan, kartu promo |
| **Smart Tools** | `/tools`, `/tools/[tool]`, `/tools/addons` | 25 tool dalam 8 kelompok, lihat 1b. Pilihan otak Senior / Head / Director (Director = 2 kuota), revisi s.d. 5×, "Bahas di Chat" |
| **Marqthink Agent** | `/agents`, `/tools/agent` | agen multi-langkah (Opus/Sonnet) |
| **Hasil saya** | `/hasil` | arsip semua hasil tool, unduh/export |
| **Kalender konten** | `/kalender` | jadwal dari hasil tool Kalender, tandai selesai |
| **Autopilot Konten** (Pro/Promax) | `/autopilot`, `/autopilot/onboarding` | **Brand Onboarding** (data wajib, logo, 3–10 foto asli, screenshot), **Riset brand otomatis**, **Brand DNA** (4 peran AI, versi + ACC), tujuan & campuran pilar, gaya desain (pustaka 10 industri × 3 gaya, upload referensi → Style DNA), katalog produk/SKU, strategist → tinjau ide → copywriter → tim senior → **Visual Director** (gambar baru per slide), **carousel / single image / naskah reel**, edit post, regenerate gambar (maks 3), unduh, **hubungkan Instagram + terbit otomatis**, panel performa IG |
| **Project** | `/workspaces`, `/workspaces/[id]` | Brand Kit per brand (warna, logo, suara brand, kata terlarang), file project |
| Lainnya | `/pricing`, `/harga`, `/settings`, `/onboarding`, `/invoice/[orderId]`, `/terms`, `/privacy`, `/refund`, `/kontak`, `/data-deletion`, `/share` | Paket & pembayaran (Midtrans aktif; Duitku & Mayar siap sebagai cadangan), kuitansi, legal, kontak WhatsApp/email |
| Back office | `office.marqthink.com` | customer, penjualan, laba-rugi per akun (`bo_account_pnl`), harga & kuota paket, promo, add-on |

### 1b. Smart Tools (25 tool, `src/lib/addons/catalog.ts`)

| Kelompok | Tool |
|---|---|
| Strategi & Brand | Marketing Plan · Brand Guideline · Campaign Brief · Rencana Peluncuran Produk |
| Market Research Pro | Ukuran & Tren Pasar · Segmentasi & Persona · Riset Kompetitor · Kelayakan & Strategi Masuk Pasar · Desain Survei |
| Konten & Sosmed | Kalender Konten Bulanan · Naskah Video Pendek · Audit Akun Sosmed |
| Iklan & Performance | Pembuat Variasi Iklan · Analis Laporan Iklan · Kalkulator Bisnis (tanpa AI) |
| Jualan Online | Optimasi Listing Marketplace · Skrip Live Selling · Kalender Promo Marketplace |
| CRM & Retensi | Template WhatsApp · Alur Follow-up · Program Pelanggan Setia |
| KOL & PR | Brief KOL/Affiliate · Laporan Performa KOL · Siaran Pers |
| Laporan | Laporan Marketing Bulanan |

Catatan: tabel `addons` dan bundel (UMKM Rp99rb, Agency Rp189rb) masih ada tapi **nonaktif**. Semua tool sudah masuk paket berbayar dan memotong kredit.

### 1c. Biaya modal per aksi & potensi sales

Rp = USD × Rp18.270. "n" = jumlah sampel di log 60 hari (masih kecil, mayoritas uji founder).

| Fitur | 1 aksi = | API / model | Modal / aksi | Sumber | Potensi sales |
|---|---|---|---|---|---|
| Chat Junior | 1 pesan | Haiku 5.5 | **Rp68** | DATA ASLI (n=40) | Rendah. Ada ChatGPT/Gemini gratis; jadi pintu masuk paket Free |
| Chat Senior | 1 pesan (±3 web search) | Sonnet 5.5 | **Rp1.235** | DATA ASLI (n=45) | Sedang. Konteks Indonesia + Brand Kit |
| Chat Head | 1 jawaban panjang | Opus 5.5 | **Rp5.726** | DATA ASLI (n=15) | Sedang |
| Chat Director | 1 jawaban sangat panjang | Fable 5.1 | **Rp13.566** | DATA ASLI (n=9) | Sedang. Pembeda Promax, paling boros |
| Riset Web di chat | ±5 pencarian | Serper + Claude search | Rp639 | ESTIMASI | Sedang |
| Gambar AI di chat | 1 gambar | Gemini 3.1 Flash Lite Image | **Rp617** | DATA ASLI (n=17) | Sedang |
| PPT / deck | 1 gambar slide (deck ±6) | Flash Lite Image; render PPTX Rp0 | Rp617/gambar (±Rp3.700/deck) | DATA ASLI (n=51) | Sedang |
| Smart Tool (Senior) | 1 dokumen hasil | Sonnet 5.5 + riset | **Rp5.656** | DATA ASLI (n=14) | **Tinggi**. Menggantikan jasa konsultan/agency |
| Smart Tool (Head) | 1 dokumen | Opus 5.5 | **Rp14.287** | DATA ASLI (n=7) | Tinggi |
| Smart Tool (Director) | 1 dokumen (2 kuota) | Fable 5.1 | **Rp52.197** | DATA ASLI (n=2) | Sedang. Sangat mahal |
| Revisi tool | 1 revisi | sama | Rp3.394 | ESTIMASI (60% tool) | Sedang |
| Marqthink Agent | 1 langkah | Opus / Sonnet | Rp1.383 | DATA ASLI (n=13) | Sedang |
| Hasil saya, Kalender, Kalkulator, Brand Kit/Project | lihat / simpan | tanpa AI | Rp0 | DATA ASLI | Retensi |
| Autopilot teks | 1 post (4 tahap AI) | Sonnet 5.5 | **Rp1.169** | ESTIMASI dari log | **Tinggi**. Alasan utama orang bayar |
| Autopilot gambar baru | 1 gambar | Flash Lite Image | **Rp616** | DATA ASLI (n=13) | Tinggi |
| Autopilot gambar + foto acuan | 1 gambar | Flash Image | **Rp1.246** | DATA ASLI (n=4) | Tinggi |
| **1 carousel Pro** (cover + 3 visual) | 1 post | gabungan | **Rp4.262** | ESTIMASI | Tinggi |
| **1 carousel Promax** (cover + 5 visual) | 1 post | gabungan | **Rp5.809** | ESTIMASI | Tinggi |
| Carousel uji Photobebaz (7 slide, 5 gambar) | 1 post | gabungan | **Rp5.952** | DATA ASLI (21 Nov) | Tinggi |
| Naskah reel | 1 post | Sonnet | Rp1.169 | ESTIMASI | Sedang. User tetap harus merekam |
| Riset brand otomatis | 1 riset | Serper + Sonnet vision | **Rp995** | DATA ASLI (n=4) | Tinggi. Momen "wow" saat onboarding |
| **Brand DNA** | 1 versi | Sonnet × 5 | **Rp2.704** | DATA ASLI (n=2) | **Tinggi**. Pembeda utama, bisa dijual sebagai jasa |
| Analisis referensi desain | 1 analisis | Sonnet vision | Rp493 | ESTIMASI | Sedang |
| Terbit otomatis Instagram | 1 post | Meta Graph API | Rp0 | — | Tinggi. Kunci "benar-benar autopilot" |
| Voice-to-text (belum aktif) | 1 menit | Groq Whisper | Rp12 | ESTIMASI | Rendah |

**Yang paling membuat orang mau bayar** (urut):
1. Autopilot + Brand DNA + terbit otomatis IG.
2. Smart Tools (dokumen siap pakai).
3. Chat Senior/Head dengan Brand Kit.

Chat Junior dan gambar biasa adalah komoditas, cukup dipakai sebagai umpan paket Free.

---

## 2. Biaya tetap & variabel

### 2a. Biaya tetap bulanan (setelah upgrade wajib untuk berjualan)

| Item | Biaya | Status | Sumber |
|---|---|---|---|
| Vercel Pro | $20 = **Rp365.400** | **Wajib**: Hobby hanya untuk non-komersial | HARGA RESMI vercel.com/pricing |
| Supabase Pro | $25 = **Rp456.750** (sudah termasuk $10 kredit compute Micro, 8 GB DB, 100 GB file) | **Wajib**: free tier bisa di-pause, storage 1 GB (sudah terpakai 176 MB) | HARGA RESMI supabase.com/pricing |
| Domain marqthink.com | Rp209.900/th = **Rp17.492/bln** | sudah | Hostinger (belum PPN) |
| Email bisnis Hostinger | 2 × Rp6.900 = **Rp13.800/bln** | belum dibeli | Hostinger (belum PPN) |
| Resend (email aplikasi) | Rp0 s.d. 3.000 email/bln; $20 bila lewat | aktif | resend.com |
| PostHog (analytics) | Rp0 s.d. 1 jt event | **belum aktif** (kunci belum dipasang) | posthog.com |
| Midtrans | Rp0 biaya tetap | aktif (production) | — |
| Meta Developer, Canva Connect | Rp0 | — | — |
| **Total dasar** | **±Rp853.442/bln** | | sheet *Asumsi* |
| Upgrade compute Supabase (Small) | +$15 ≈ Rp274rb bila ≥300 customer | ESTIMASI | — |
| Tools founder (Claude, desain, dll.) | **? (perlu diisi)** | | pertanyaan |

### 2b. Biaya variabel

- **API AI**: lihat 1c. Satu kredit di aplikasi dihitung Rp100 pada kurs Rp16.500. Pada kurs riil Rp18.270 modalnya **Rp110,73/kredit**, jadi kurs di kode perlu diperbarui.
- **Storage gambar**: ±2,5 MB per post Autopilot [ESTIMASI]. 100 GB pertama sudah termasuk Supabase Pro, setelahnya $0,021/GB. Ini dapat diabaikan sampai ±40.000 post.
- **Payment gateway (Midtrans)**:

  | Metode | Biaya |
  |---|---|
  | QRIS | 0,7% |
  | Virtual Account | Rp4.000 flat |
  | GoPay / e-wallet | 2% |
  | Kartu | 2,9% + Rp2.000 |

  Angka ini dari sumber pihak ketiga; status PPN atas fee belum jelas, jadi cek di dashboard Midtrans. Dengan asumsi campuran 60% QRIS, 20% VA, 10% e-wallet, 10% kartu, fee per transaksi Pro Rp200rb ≈ **Rp2.820 (1,4%)**.
  Untuk harga kecil (Starter), VA Rp4.000 itu berat (6,7% dari Rp60rb). Arahkan pembayaran ke QRIS.
- **Pajak** (⚠️ **konfirmasi konsultan pajak**):
  - **PPh Final UMKM 0,5% dari omzet**: PP 20/2026 berlaku tanpa batas waktu untuk *orang pribadi & perseroan perorangan* beromzet ≤ Rp4,8 M/th. Untuk PT biasa/CV aturannya diperketat, cek Pasal 57.
  - **PPN**: tarif 12% × DPP 11/12 = efektif 11%. Wajib PKP umumnya bila omzet > Rp4,8 M/th.
  - Di spreadsheet ada saklar `PKP? 1/0`. Bila 1, harga dianggap sudah termasuk PPN, sehingga pendapatan bersih = harga ÷ 1,11.
- **Kurs**: satu sel di *Asumsi* (B6). Sensitivitas: setiap naik Rp1.000/USD, modal AI naik ±5,5%.

---

## 3. Unit economics per paket

### 3a. Paket sekarang

Sumber: [DATA ASLI] tabel `plans` & `src/lib/autopilot/quota.ts`.

| Paket | Harga | Kredit/bln (setara) | Batas harian / mingguan | Autopilot | Otak |
|---|---|---|---|---|---|
| Free | Rp0 | 52 | 8 / 12 | – | Junior (+riset 5/hari, gambar 2/hari, PPT 1/hari) |
| Starter | Rp60.000 | 260 | 25 / 60 | – | Junior, Senior, riset, gambar, PPT |
| Pro | Rp200.000 | 910 | 80 / 210 | 30 post/bln (7/minggu), 3 visual isi | + Head, semua Smart Tools, Agent |
| Promax | Rp300.000 | 1.365 | 120 / 315 | 60 post/bln (14/minggu), 5 visual isi | + Director |

### 3b. Margin kotor per customer per bulan — paket SEKARANG

Skenario (bisa diubah di *Asumsi*):

| Skenario | Kredit terpakai | Kuota Autopilot terpakai | Regenerate gambar/post | Brand DNA/bln |
|---|---|---|---|---|
| Ringan | 15% | 20% | 0 | 0 |
| Rata-rata | 45% | 60% | 0,3 | 1 |
| Berat | 100% | 100% | 1,5 | 5 |

Margin = harga − (modal AI + Autopilot + Brand DNA + storage + fee + PPh 0,5%).

| Paket | Ringan | Rata-rata | **Berat** |
|---|---|---|---|
| Free (subsidi) | −Rp864 | −Rp2.591 | −Rp5.758 |
| Starter Rp60rb | Rp53.836 (89,7%) | Rp45.199 (75,3%) | Rp29.365 (48,9%) |
| Pro Rp200rb | Rp162.120 (81,1%) | Rp87.122 (43,6%) | **−Rp47.625 (−23,8%) RUGI** |
| Promax Rp300rb | Rp223.630 (74,5%) | Rp70.294 (23,4%) TIPIS | **−Rp181.832 (−60,6%) RUGI** |

Rincian modal pemakai berat Promax: kredit Rp151.143 + **Autopilot Rp311.883** + Brand DNA Rp13.520 + fee Rp3.730 + PPh Rp1.500 = **Rp481.832**.

**Penyebab rugi:**
1. Autopilot (60 post × ±4 gambar + regenerate) tidak memotong kredit.
2. Brand DNA bisa dibuat ulang tanpa batas, hanya dibatasi rate limit.
3. Kurs di kode terlalu rendah.

**Solusi** (bisa dipakai bersamaan):
1. **Kurangi beban gambar per paket.** Pro 20 post dengan 2 visual isi; Promax 45 post dengan 4 visual isi.
2. **Fair use Brand DNA.** Gratis 2×/bulan per brand; lebih dari itu memotong ±30 kredit.
3. **Regenerate gambar memotong kredit** (±6 kredit/gambar), bukan gratis 3×.
4. **Top-up dan add-on** untuk yang butuh lebih (lihat 3e).
5. **Perbarui `IDR_PER_USD` ke ±18.300** dan tinjau tiap bulan.
6. **Alarm biaya**: notifikasi ke founder bila modal satu akun > 70% harga paketnya bulan itu. Data sudah ada di `bo_account_pnl`, alarmnya yang belum.

### 3c. Rekomendasi harga final

| Paket | Harga | Isi | Margin rata-rata | Margin berat |
|---|---|---|---|---|
| Free | Rp0 | sama (Junior, 52 kredit) | subsidi Rp2.591 | subsidi Rp5.758 |
| Starter | **Rp79.000** | Junior + Senior, Smart Tools Senior, 260 kredit | 80,9% | 60,9% |
| Pro | **Rp299.000** | + Head, 910 kredit, Autopilot **20 post/bln**, 2 visual isi, 1 brand | **70,4%** | **34,1%** |
| Promax | **Rp549.000** | + Director, 1.365 kredit, Autopilot **45 post/bln**, 4 visual isi, 2 brand | 66,7% | 29,4% (tipis → fair use) |
| Agency (baru) | **Rp999.000** | 3 brand, Autopilot 3 × 20 post, laporan klien | ±73% (rata-rata) | — |
| Tahunan | bayar 10 bulan, pakai 12 | semua paket | Pro tahunan ±65% | — |

**Alasan:**
- **Pro Rp299rb.** Di bawah ChatGPT Plus (Rp349rb) tapi isinya chat + 25 tool + Autopilot IG yang terbit sendiri. Bleam mematok Rp250rb hanya untuk autopilot satu akun IG.
- **Promax Rp549rb.** Untuk marketer/agency kecil yang butuh Director dan ±10 post/minggu. Masih jauh di bawah biaya freelancer konten (Rp2–5 jt/bln). Untuk harga ini, perlu konfirmasi Bro soal persepsi pasar.
- **Starter Rp79rb.** Fee VA Rp4.000 terlalu berat di Rp60rb. Rp79rb setara Canva Pro (Rp95rb) dan ChatGPT Go (Rp75rb).

### 3d. Pembanding harga (dicek Nov 2026)

| Produk | Harga/bln | Catatan |
|---|---|---|
| Bleam (ID) Pro | Rp250.000 | per akun IG, carousel + auto-publish IG/TikTok/Threads |
| InstaDeck PRO (ID) | Rp49.000 / Rp149.000 | 100 / 300 kredit, multi akun |
| ChatGPT Go / Plus (ID) | Rp75.000 / Rp349.000 | termasuk PPN |
| Canva Pro (ID) | Rp95.000 | per orang |
| Predis.ai Core | $19–32 (Rp347rb–585rb) | sumber berbeda |
| Jasper Pro | $69 (Rp1,26 jt) | $59 bila tahunan |

### 3e. Sumber pendapatan tambahan (margin dihitung di sheet *Paket & Margin* bagian C)

| Produk | Harga | Modal | Margin |
|---|---|---|---|
| Top-up 300 kredit (30 hari) | Rp59.000 | Rp33.218 | Rp23.950 (40,6%) |
| +10 post Autopilot | Rp69.000 | Rp29.478 | Rp37.549 (54,4%) |
| +30 gambar AI | Rp39.000 | Rp18.471 | Rp18.979 (48,7%) |
| **Jasa Setup Brand DNA** (done-for-you) | Rp499.000 | Rp308.112 (termasuk 2 jam kerja × Rp150rb) | Rp182.852 (36,6%). Tanpa jam kerja ±98% |
| **Paket Agency 3 brand** | Rp999.000 | Rp250.262 | Rp733.652 (73,4%) |
| **Pro tahunan** | Rp2.990.000 | Rp1.001.182 | Rp1.945.659 (65,1%) + uang masuk di depan |

---

## 4. Titik impas & target

Mix asumsi **10% Starter / 70% Pro / 20% Promax**, 4 user Free per customer berbayar, churn 8%/bln. Semua bisa diubah di *Asumsi*.

### 4a. Proyeksi per bulan — HARGA REKOMENDASI (ARPU Rp327.000)

| Customer berbayar | 10 | 50 | 100 | 500 |
|---|---|---|---|---|
| Pendapatan | Rp3,27 jt | Rp16,35 jt | Rp32,7 jt | Rp163,5 jt |
| Modal variabel (rata-rata) | Rp1,0 jt | Rp5,0 jt | Rp10,0 jt | Rp50,1 jt |
| Subsidi user Free | Rp92rb | Rp461rb | Rp921rb | Rp4,6 jt |
| Biaya tetap | Rp853rb | Rp853rb | Rp853rb | Rp1,13 jt |
| **Laba operasional** | **Rp1,32 jt (40,5%)** | **Rp10,0 jt (61,3%)** | **Rp20,9 jt (64,0%)** | **Rp107,7 jt (65,9%)** |
| Bila semua pemakai berat | Rp139rb | Rp4,1 jt | Rp9,1 jt | Rp48,5 jt |

### 4b. Proyeksi per bulan — HARGA SEKARANG (ARPU Rp206.000)

| Customer berbayar | 10 | 50 | 100 | 500 |
|---|---|---|---|---|
| Pendapatan | Rp2,06 jt | Rp10,3 jt | Rp20,6 jt | Rp103 jt |
| **Laba operasional** | **−Rp150rb (−7,3%)** | Rp2,66 jt (25,9%) | Rp6,18 jt (30,0%) | Rp34,0 jt (33,1%) |
| Bila semua pemakai berat | −Rp1,6 jt | −Rp4,7 jt | −Rp8,5 jt | **−Rp39,1 jt** |

### 4c. Break-even, LTV, CAC

| Metrik | Harga sekarang | Harga rekomendasi |
|---|---|---|
| Kontribusi per customer/bln (rata-rata) | Rp70.351 | Rp217.652 |
| Kontribusi per customer/bln (berat) | −Rp75.980 | Rp99.271 |
| **Break-even (tutup biaya tetap)** | **13 customer** | **4 customer** |
| Break-even + gaji founder Rp15 jt (contoh) | ±226 customer | ±73 customer |
| Umur customer (1/churn) | 12,5 bulan | 12,5 bulan |
| LTV | Rp879.392 | Rp2.720.647 |
| **CAC maksimal aman (LTV ÷ 3)** | **Rp293.131** | **Rp906.882** |
| Payback bila CAC Rp150rb | 2,1 bulan | 0,7 bulan |

Catatan: churn 8% dan CAC Rp150rb masih asumsi. Setelah 2–3 bulan berjualan, ganti dengan data asli.

---

## 5. Strategi 90 hari menuju 100 customer berbayar pertama

### 5a. Target pertama yang paling cepat bayar

1. **Owner UMKM/brand lokal yang aktif jualan lewat Instagram** (F&B, fashion, kecantikan, jasa seperti Photobebaz). Alasan:
   - Sakit kepalanya jelas: konten tiap hari, tidak punya tim desain.
   - Autopilot + terbit otomatis langsung menggantikan biaya freelancer Rp1,5–5 jt/bln.
   - Keputusan beli ada di tangan owner sendiri.
2. **Freelancer / agency kecil** (pegang 2–10 akun klien). Alasan:
   - Bisa jual ulang hasilnya ke klien.
   - Cocok untuk paket Promax/Agency dan Setup Brand DNA.
   - Jaringan klien agency Bro adalah pintu masuknya.

Marketer profesional di korporat lambat bayar (butuh approval PO). Mahasiswa sensitif harga. Keduanya cukup diarahkan ke paket Free untuk awareness.

### 5b. Penawaran launching

- **Founding Member (50 kursi):**
  - Pro Rp199rb/bln dikunci 12 bulan (normal Rp299rb), atau Rp1,99 jt/tahun.
  - Bonus Setup Brand DNA gratis (nilai Rp499rb) + grup WhatsApp founding.
  - Batas kursi ditampilkan ("37/50 tersisa").
  - Hitung ulang: Rp199rb di skenario berat dengan kuota rekomendasi = 199.000 − 197.031 ≈ impas. Jadi **pakai kuota Pro rekomendasi (20 post, 2 visual)**, jangan kuota sekarang.
- **Uji coba gratis**: jangan "gratis Pro 30 hari". Pakai **Trial Autopilot 7 hari: 3 post + 1 Brand DNA**. Modal ±Rp15rb/orang. Wajib login Google + verifikasi WhatsApp (gerbang WhatsApp sudah ada) supaya tidak dibobol multi-akun.
- **Konversi beta → bayar**:
  - Email/WA H-3 dan H-0 trial: "3 konten kamu sudah jadi; lanjutkan jadwal minggu depan?"
  - Tombol bayar QRIS satu klik.
  - Diskon founding berlaku 72 jam.

### 5c. Rencana per minggu

| Minggu | Fokus | Aksi konkret | Target akhir minggu |
|---|---|---|---|
| 1 | Siap jual | Beresin checklist kritis (bagian 6): kedaluwarsa paket, kurs, harga baru, PostHog, upgrade Vercel/Supabase, email bisnis | Bisa menerima pembayaran dengan aman |
| 2 | Bukti | Studi kasus Photobebaz (sebelum/sesudah, waktu hemat, contoh carousel); jalankan @marqthink.ai dengan Autopilot | 1 studi kasus + 10 post @marqthink.ai |
| 3 | Komunitas (soft launch) | Demo live di Brand Circle / Ngopi-Ngopi Bareng Brand: setup Brand DNA peserta langsung di panggung; buka 50 kursi founding | 80 daftar, 15 bayar |
| 4 | Jaringan agency | DM/WA personal ke 30 klien & rekan agency; tawarkan Setup Brand DNA + Pro founding | +10 bayar (25 total) |
| 5 | Referral | Program "ajak 1 teman bayar → 1 bulan Pro gratis" (kode referral; perlu dibangun) | 35 total |
| 6 | Konten | 3 post/minggu @marqthink.ai buatan Autopilot sendiri + 1 reel "behind the scene"; kolaborasi 2 brand komunitas | 45 total |
| 7 | Demo mingguan | Live IG/Zoom "Bikin konten seminggu dalam 10 menit" tiap Kamis; rekaman jadi iklan | 55 total |
| 8 | Agency | Luncurkan paket Agency + 3 agency pilot (diskon 30% bulan pertama) | 65 total (3 agency) |
| 9 | Iklan kecil | Uji Meta Ads Rp50rb/hari ke lookalike pendaftar; ukur CAC (batas aman Rp293rb harga sekarang / Rp907rb harga rekomendasi) | CAC terukur |
| 10 | Retensi | Laporan performa bulanan otomatis ke customer; telepon customer yang tidak login 7 hari | Churn < 8% |
| 11 | Tahunan | Kampanye "bayar 10 bulan, pakai 12" ke customer bulan ke-2 | 10% customer pindah ke tahunan |
| 12–13 | Skala | Evaluasi kanal terbaik, gandakan anggaran di kanal ber-CAC terendah; tutup kursi founding | **100 customer berbayar** |

### 5d. Dogfooding @marqthink.ai

- Brand DNA Marqthink dibuat dan di-ACC sendiri.
- Autopilot 5 post/minggu: 2 tips marketing, 1 studi kasus, 1 demo fitur, 1 relatable owner UMKM.
- Setiap post ber-watermark kecil "dibuat oleh Marqthink Autopilot". Itu bukti hidup produknya.
- Skill `marqthink-ig` yang sudah ada bisa dipakai untuk konten @marqthink.ai.

### 5e. Funnel & target (90 hari)

Asumsi konversi; ganti dengan data PostHog setelah aktif.

| Tahap | Definisi | Konversi | Target |
|---|---|---|---|
| Pengunjung | sesi unik marqthink.com | — | 12.500 |
| Daftar | akun dibuat | 6% | 750 |
| Aktif | membuat ≥1 output (chat jawaban / Brand DNA / tool) dalam 7 hari | 55% | 410 |
| Trial Autopilot | menyelesaikan onboarding + 3 post | 50% dari aktif | 205 |
| **Bayar** | pembayaran sukses | 50% dari trial | **±100** |

### 5f. Metrik mingguan & event tracking

**Status:** PostHog sudah terpasang di kode (`src/lib/analytics.ts`), tapi **`NEXT_PUBLIC_POSTHOG_KEY` belum diisi di Vercel, jadi tidak ada data sama sekali**.

- **Event yang sudah ada:** `message_sent`, `quota_exceeded`, `daily_limit`, `tier_locked_clicked`, `canvas_opened`, `chat_shared`.
- **Event yang BELUM ada (perlu ditambah):**
  - `signup`
  - `onboarding_completed`
  - `brand_onboarding_progress`
  - `brand_dna_generated` / `brand_dna_approved`
  - `autopilot_week_generated`
  - `post_approved` / `post_rejected`
  - `instagram_connected`
  - `post_published`
  - `tool_run`
  - `pricing_viewed`
  - `checkout_started`
  - `payment_paid` (server-side)
  - `plan_expired`
  - `referral_used`

Metrik mingguan:
- Pendaftar baru.
- % aktif dalam 7 hari.
- % yang menyelesaikan Brand DNA.
- Post Autopilot yang di-ACC per customer.
- % post yang terbit.
- Customer bayar baru.
- MRR.
- Churn.
- **Modal AI per customer vs harga** (back office `bo_account_pnl`).
- CAC per kanal.

### 5g. Risiko terbesar & mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Pemakai berat membuat paket rugi | margin negatif | kuota rekomendasi, regenerate memotong kredit, fair use Brand DNA, alarm biaya per akun |
| Rupiah terus melemah (sudah Rp18.270, rekor) | modal AI naik | kurs di satu tempat, tinjau bulanan; harga dalam Rupiah dengan margin buffer ≥ 30% di skenario berat |
| Kualitas konten AI tidak konsisten / salah fakta | churn, reputasi | Brand DNA + tim senior + ACC wajib sebelum terbit; studi kasus nyata |
| Akses Instagram API (review Meta, token kedaluwarsa) | autopilot berhenti terbit | proses App Review Meta segera; fallback "unduh & posting manual"; notifikasi token |
| Ketergantungan 1 founder (teknis via Claude, sales, support) | lambat respon | template balasan, FAQ, jam support jelas, CS paruh waktu setelah 50 customer |
| Penyalahgunaan Free / multi-akun | biaya bocor | verifikasi WhatsApp, batas harian, trial terbatas |
| Pajak & legal (PSE Kominfo, PPh/PPN, UU PDP) | denda / blokir | konsultan pajak, daftar PSE lingkup privat, DPA dengan vendor |

---

## 6. Checklist siap jual (urut dari paling kritis)

| # | Item | Status | Catatan |
|---|---|---|---|
| 1 | **Paket kedaluwarsa otomatis kembali ke Free** | ❌ BELUM | `subscriptions.current_period_end` lewat tapi `profiles.plan_id` tetap. Contoh nyata: 1 user Starter habis 18 Nov, masih Starter. Bertentangan dengan halaman Refund |
| 2 | **Pengingat perpanjangan** (H-3, H-0) + tombol bayar ulang | ❌ BELUM | langganan sengaja tidak auto-debit, jadi pengingat wajib |
| 3 | **Batas modal per paket untuk Autopilot / Brand DNA / regenerate** | ⚠️ SEBAGIAN | kuota post ada; gambar, regenerate, dan Brand DNA tidak memotong kredit (lihat 3b) |
| 4 | **Kurs `IDR_PER_USD` diperbarui** | ⚠️ | 16.500 vs riil 18.270 |
| 5 | **Upgrade Vercel Pro & Supabase Pro** | ❌ BELUM | Vercel Hobby melarang penggunaan komersial; Supabase free bisa di-pause. Total ±Rp822rb/bln, **perlu ACC Bro** |
| 6 | Payment gateway & webhook | ✅ ADA | Midtrans production aktif, webhook Midtrans/Duitku/Mayar ada, fulfillment otomatis (`bo_record_sale`). Sudah teruji QRIS Rp2.000. Ada 2 order gagal 401 tanggal 10 Nov saat konfigurasi, dan beberapa order Duitku lama masih "pending" |
| 7 | Upgrade / downgrade / cancel | ⚠️ SEBAGIAN | upgrade = beli paket lain (sisa periode dihitung back office); cancel = tidak bayar lagi; downgrade otomatis belum (lihat #1); belum ada prorata self-service |
| 8 | Pembatasan kuota per paket | ✅ ADA | harian / mingguan / porsi Director 50%, kredit sesuai biaya nyata |
| 9 | **Monitoring biaya API per user + alarm** | ⚠️ SEBAGIAN | laba-rugi per akun ada di back office; alarm otomatis belum ada |
| 10 | **Analytics / funnel** | ❌ BELUM AKTIF | kunci PostHog belum dipasang; event bisnis utama belum ada |
| 11 | Halaman pricing | ✅ ADA | `/pricing` (dalam app) & `/harga` (publik). Perlu diperbarui bila harga baru di-ACC |
| 12 | Invoice / kuitansi | ✅ ADA | `/invoice/[orderId]`, `receipt.ts`. Tambahkan NPWP/NIB bila sudah ada |
| 13 | Syarat & Ketentuan | ✅ ADA | `/terms` (perlu review hukum) |
| 14 | Kebijakan Privasi (UU PDP) | ✅ ADA | `/privacy` menyebut UU 27/2022 + halaman hapus data. Pertimbangkan pendaftaran PSE Kominfo |
| 15 | Kebijakan refund | ✅ ADA | refund penuh 3×24 jam bila pemakaian ≤10%. Klausul "kembali ke Free" belum dijalankan kode (#1) |
| 16 | Onboarding | ✅ ADA | onboarding akun + Brand Onboarding + gate Autopilot |
| 17 | Dukungan customer | ⚠️ SEBAGIAN | `/kontak` (email + WhatsApp). Belum ada SLA, FAQ, atau email bisnis @marqthink.com (menunggu Mastercard) |
| 18 | Program referral & kode promo checkout | ❌ BELUM | promo harga per paket ada, kode referral belum |
| 19 | Instagram App Review Meta | ⚠️ PROSES | dibutuhkan supaya customer umum bisa menghubungkan IG |

---

## Pertanyaan untuk Bro (data yang hanya Bro tahu)

Lihat juga daftar di chat. Semua bisa langsung diisi di sheet *Asumsi*.

1. Badan usaha Marqthink apa (perorangan, PT Perorangan, PT, CV)? Sudah punya NPWP/NIB? Ini menentukan PPh 0,5% dan kewajiban PKP.
2. Biaya tetap lain yang Bro bayar tiap bulan (langganan Claude, desain, tools lain)?
3. Target penghasilan founder per bulan dari Marqthink?
4. ACC untuk upgrade Vercel Pro ($20) & Supabase Pro ($25) sebelum mulai menagih?
5. Setuju arah harga baru (Starter Rp79rb, Pro Rp299rb, Promax Rp549rb, Agency Rp999rb)? Atau ada batas harga yang Bro yakini untuk pasar UMKM?
6. Berapa anggota aktif Brand Circle / Ngopi-Ngopi Bareng Brand dan berapa klien agency yang bisa dihubungi langsung?
7. Ada anggaran iklan untuk 90 hari pertama? Berapa?
8. Siapa yang menangani support customer (Bro sendiri / tim)?

---

## Sumber eksternal

- Kurs: [Okezone 20 Nov 2026](https://economy.okezone.com/read/2026/11/20/320/3255179/rupiah-ditutup-melemah-ke-rp18-270-per-dolar-as), [Beritasatu](https://www.beritasatu.com/ekonomi/3042597/rupiah-hari-ini-ditutup-melemah-009-persen-ke-rp-18270-per-dolar-as)
- Vercel: [vercel.com/pricing](https://vercel.com/pricing), [Hobby plan (non-komersial)](https://vercel.com/docs/plans/hobby)
- Supabase: [supabase.com/pricing](https://supabase.com/pricing)
- Midtrans: [docs.midtrans.com/docs/pricing](https://docs.midtrans.com/docs/pricing), [ringkasan tarif pihak ketiga](https://checkoutflow.pages.dev/id-en/best-payment-gateway-ecommerce/midtrans-pricing/)
- Xendit/Mayar (pembanding): [xendit.co/en-id/pricing](https://xendit.co/en-id/pricing/), [docs.mayar.id/mor/fees](https://docs.mayar.id/mor/fees)
- Pajak: [PP 20/2026 — pajak.go.id](https://www.pajak.go.id/id/artikel/pp-202026-tarif-pph-05-bagi-umkm-orang-pribadi-berlaku-selamanya), [DPP nilai lain 11/12](https://www.pajak.go.id/sites/default/files/2025-02/SP-4%20PEMERINTAH%20TERBITKAN%20ATURAN%20DPP%20NILAI%20LAIN%20DAN%20BESARAN%20TERTENTU%20PPN.pdf)
- Harga API Claude: [platform.claude.com pricing](https://platform.claude.com/docs/en/about-claude/pricing), [ringkasan Sonnet 5.5](https://www.eesel.ai/blog/claude-sonnet-5-5-pricing)
- Hostinger: [domain .com](https://www.hostinger.com/id/domain), [email bisnis](https://www.hostinger.com/id/business-email)
- Resend & Serper: [resend.com/pricing](https://resend.com/pricing.md), [Serper pricing](https://coldiq.com/blog/serper-pricing)
- Kompetitor: [Bleam](https://www.bleam.ai/), [InstaDeck PRO](https://pro.instadeck.id/), [ChatGPT Go Indonesia](https://teknologi.bisnis.com/read/20250923/84/1913978/openai-agresif-cari-pengguna-baru-chatgpt-go-dijual-murah-rp75000-di-ri), [ChatGPT harga ID](https://chatgpt.com/id/pricing?country=id&lang=en), [Canva Pro ID](https://www.canva.com/id_id/harga/), [Predis.ai (Capterra)](https://www.capterra.com/p/231932/Predisai/pricing/), [Jasper 2026](https://www.eesel.ai/blog/jasper-ai-pricing)
