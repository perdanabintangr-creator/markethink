# Marqthink (dulu Markethink) — panduan kerja CTO (Claude)

Founder: Bro Dana (non-teknis). Bahasa komunikasi: Indonesia, ringkas, tanpa jargon.

## Aturan kerja yang disepakati
- Kerjakan semua hal teknis secara otomatis: kode → `npm run check` → `npm run build` → commit → push ke branch `claude/markethink-platform-setup-756xcy` (= branch production; Vercel auto-deploy ±2–3 menit).
- Setiap selesai perbaikan/fitur, tutup laporan dengan format standar:
  **"✅ Sudah saya perbaiki & deploy. Tunggu ±3 menit, lalu refresh halaman (Ctrl + Shift + R)."**
  Hanya minta founder melakukan langkah manual bila memang tidak bisa diotomatiskan (akun, pembayaran, secret key) — dan sebutkan dengan jelas.
- Semua hal berbayar: laporkan dulu (apa, berapa, kenapa), tunggu ACC founder. Founder yang membayar di akunnya sendiri.
- Jangan pernah meminta/menampilkan secret key di chat. Jangan commit secret.

## Infrastruktur
- Production: https://marqthink.com (domain Hostinger, DNS A → Vercel). Alamat lama https://markethink-pi.vercel.app otomatis dialihkan (env `CANONICAL_HOST`), kecuali /api. Vercel tim `markethink`, project `markethink`, Hobby.
- Supabase project `cqrstytnbfspbwgyvpzi` (Singapore, free) — dikelola via connector Supabase; migrasi di `supabase/migrations` + `npm run db:bundle`.
- Diagnosa error chat: tabel `usage_logs` (kolom `status`, `error`) dan `credit_ledger`.
- Connector Vercel: akses tim `markethink` sudah di-approve founder (31 Okt); bila 403 lagi, minta link `authorize_team_access`.

Nama brand: `src/lib/brand.ts`; rebranding & langkah manual: `BRANDING.md`.

Lihat juga `PROGRESS.md` dan `DECISIONS.md`.
