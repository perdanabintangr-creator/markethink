# PROGRESS

## Status: Fase 1–6 selesai di kode — menunggu akun & key untuk deploy

| Fase | Status |
|---|---|
| 1. Fondasi (Next.js, Supabase, auth email+Google, schema+RLS, layout, landing+register) | ✅ kode selesai |
| 2. Chat core (streaming, router 3 tier + fallback, history, stop/regenerate/edit, feedback) | ✅ kode selesai |
| 3. Otak marketing (system.md, onboarding, Brand Workspace, 16 agents dari DB) | ✅ kode selesai |
| 4. Riset & file (Tavily + sitasi, upload + RAG pgvector, analisis gambar) | ✅ kode selesai |
| 5. Canvas & output (editor + versi, export MD/DOCX/PDF/CSV, share, memory) | ✅ kode selesai |
| 6. Beta launch (kredit, rate limit, admin, PostHog, Sentry, ToS/Privacy, mobile) | ✅ kode selesai |
| 7. Monetisasi | ⏸️ menunggu instruksi founder |

## Fitur file, gambar & PPT (2026-10-08)
- ✅ Baca lampiran PDF/Word/Excel/PowerPoint/CSV/JSON/gambar/PDF scan (maks 25 MB).
- ✅ Buat file PowerPoint (.pptx) dari chat — kartu unduh di chat.
- ✅ Buat gambar (Gemini) — saklar `image_gen` AKTIF (ACC founder).

- ✅ Back Office terpisah di /backoffice (pelanggan, langganan, penjualan, MRR, tim) — migrasi 0017 terpasang di production.

## Sudah diverifikasi
- `npm run lint`, `npm run typecheck`, `npm run test` (27 test), `npm run build` — lulus.
- Migrasi diuji di Postgres 16 + pgvector lokal: trigger profil, kredit atomik, RLS antar user, user tidak bisa ubah role/kuota sendiri, fungsi kredit tidak bisa dipanggil user, match_chunks, statistik admin.
- Screenshot landing (desktop/mobile/dark) dan layar chat (desktop/mobile) — tanpa horizontal scroll.

## Belum diverifikasi (butuh key & akses jaringan)
- Chat end-to-end dengan LLM sungguhan, Tavily, embedding Gemini, login Google, email Resend, deploy Vercel.

## Infrastruktur
- ✅ Supabase project `markethink` (ref `cqrstytnbfspbwgyvpzi`, free, Singapore) dibuat via connector; 4 migrasi terpasang; security advisor bersih (sisa: payment_events tanpa policy = disengaja, hanya service role).
- ⏳ Vercel: menunggu founder import repo + tempel env.
- ⏳ Supabase Auth URL Configuration: diisi setelah URL Vercel ada.

## Berikutnya
1. Founder menyiapkan akun & key (SETUP.md), membuka akses jaringan environment, lalu bilang "lanjut".
2. Terapkan migrasi ke Supabase (`npm run db:push` atau `supabase/setup.sql`).
3. Smoke test end-to-end di preview Vercel, perbaiki temuan, lalu laporan final.

## 16 Okt 2026 — Paket all-in-1 kredit bulanan
- ✅ Migrasi 0034 (plan Starter, `monthly_credits`, saldo bulanan, `settle_credits`) & 0035 (bonus kredit) terpasang di production.
- ✅ Chat, Tools Pro, Agent memotong kredit sesuai pemakaian nyata. Meter kredit bulanan, halaman `/pricing`, Tools Pro tanpa add-on.
- ✅ Back office: paket Starter, kredit bulanan per paket & per user.
- ⏳ Sebelum menagih user: Vercel Pro ($20/bln, Hobby non-komersial) & payment gateway.

## 16 Okt 2026 — Laba rugi per akun
- ✅ Migrasi 0040 `bo_account_pnl` terpasang di production; halaman back office `/profit` + pengaman laba per paket.

## 18 Okt 2026 — Harga promo paket
- ✅ Migrasi 0042 (kolom promo di `plans`) terpasang; form promo di back office Harga paket; harga coret di aplikasi.

## 18 Okt 2026 — Add-on dijual lagi + harga coret add-on
- ✅ Migrasi 0043 terpasang; beli add-on dari halaman Tools Pro / tool terkunci → Calon pelanggan; kuota + batas modal 70%.

## 21 Nov 2026 — Brand Onboarding + Brand DNA
- ✅ Migrasi 070 (`brand_assets`, `brand_dna_versions`, `workspaces.onboarding_status/brand_dna_version`, `social_posts.brand_dna_version`) terpasang; RLS select-own, tulis lewat server.
- ✅ Halaman `/autopilot/onboarding`: data wajib, logo + 3–10 foto asli, screenshot feed/kompetitor/referensi, data opsional, progress "Kelengkapan brand", simpan draf.
- ✅ Riset (web + gambar + aset klien) → Designer/Copywriter/Socmed paralel → Creative Director memutuskan → Brand DNA versi draf (biaya dicatat) → tab per peran, bisa diedit, tombol ACC. Edit versi ACC = versi baru.
- ✅ Gate: Autopilot (halaman, generate, tulis ide, cron, chat instagram_post) terkunci sampai data wajib lengkap + DNA di-ACC. Banner "Perbarui Brand DNA" bila Brand Kit/aset berubah.
- ✅ Semua agen membaca DNA aktif (strategist, copywriter, tim senior, Visual Director + foto asli sebagai acuan); tiap post mencatat `brand_dna_version`.

## 22 Nov 2026 — Paket Autopilot Konten terpisah + masa aktif paket
- ✅ Migrasi 071: `content_plans` (Lite Rp149rb 12 konten, Pro Rp249rb 20 konten, Bisnis Rp499rb 40 konten / 30 hari), `content_subscriptions`, `combo_offers` (Bundel Pro + Konten Pro Rp399rb), `content_record_sale`, `expire_paid_plans` + pg_cron tiap jam.
- ✅ Autopilot + Kalender Konten hanya lewat paket konten (bisa dibeli semua paket termasuk Free; admin selalu boleh). Pro/Promax tidak lagi berisi Autopilot.
- ✅ Checkout `content` / `combo` (disimpan sebagai kind addon/bundle dengan id konten_*/combo_*), aktivasi otomatis, kuitansi, halaman Harga (app & publik), penawaran di /autopilot & /kalender, bar paket aktif + perpanjang.
- ✅ Kalender menampilkan konten Autopilot. Brand DNA maks 3× per 30 hari. Kurs kredit 18.300.
- ✅ Paket berbayar yang habis otomatis kembali ke Free (1 akun Starter habis 18 Nov ikut diturunkan).
- ✅ 27 Nov: harga Cara 1 (migrasi 072), Senior campuran Qwen + Claude di chat & Smart Tools kreatif, Director Fable 5.2, gambar 7 kredit,
  jatah ganti gambar Autopilot per 30 hari.
