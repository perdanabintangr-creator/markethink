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
