# DECISIONS

Catatan keputusan teknis (tanggal — keputusan — alasan).

- 2026-10-08 — Deploy via Vercel Git integration (auto-deploy on push), bukan Vercel CLI token. — Paling sederhana, tidak perlu menyimpan token Vercel di environment agent, preview URL otomatis per branch.
- 2026-10-08 — Migrasi DB disimpan di `supabase/migrations` dan dijalankan via Supabase CLI memakai `SUPABASE_ACCESS_TOKEN`. — Schema ter-versi di Git, reproducible.
