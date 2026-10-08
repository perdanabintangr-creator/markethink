# Markethink — panduan kerja CTO (Claude)

Founder: Bro Dana (non-teknis). Bahasa komunikasi: Indonesia, ringkas, tanpa jargon.

## Aturan kerja yang disepakati
- Kerjakan semua hal teknis secara otomatis: kode → `npm run check` → `npm run build` → commit → push ke branch `claude/markethink-platform-setup-756xcy` (= branch production; Vercel auto-deploy ±2–3 menit).
- Setiap selesai perbaikan/fitur, tutup laporan dengan format standar:
  **"✅ Sudah saya perbaiki & deploy. Tunggu ±3 menit, lalu refresh halaman (Ctrl + Shift + R)."**
  Hanya minta founder melakukan langkah manual bila memang tidak bisa diotomatiskan (akun, pembayaran, secret key) — dan sebutkan dengan jelas.
- Semua hal berbayar: laporkan dulu (apa, berapa, kenapa), tunggu ACC founder. Founder yang membayar di akunnya sendiri.
- Jangan pernah meminta/menampilkan secret key di chat. Jangan commit secret.

## Infrastruktur
- Production: https://markethink-pi.vercel.app (Vercel tim `markethink`, Hobby).
- Supabase project `cqrstytnbfspbwgyvpzi` (Singapore, free) — dikelola via connector Supabase; migrasi di `supabase/migrations` + `npm run db:bundle`.
- Diagnosa error chat: tabel `usage_logs` (kolom `status`, `error`) dan `credit_ledger`.
- Connector Vercel saat ini ditolak (403) untuk scope tim `markethink`; status deploy dicek lewat founder.

Lihat juga `PROGRESS.md` dan `DECISIONS.md`.
