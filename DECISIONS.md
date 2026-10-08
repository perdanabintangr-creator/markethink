# DECISIONS

Catatan keputusan teknis (tanggal — keputusan — alasan).

- 2026-10-08 — Deploy via Vercel Git integration (auto-deploy on push), bukan Vercel CLI token. — Paling sederhana; tidak perlu token Vercel di environment agent; preview URL otomatis per branch.
- 2026-10-08 — Migrasi DB di `supabase/migrations` + file gabungan `supabase/setup.sql`. — Schema ter-versi di Git; founder non-teknis bisa setup cukup dengan copy-paste satu file ke SQL Editor.
- 2026-10-08 — Next.js 15.5 (bukan 16) dan Vercel AI SDK v5 (bukan v7). — Versi stabil yang API-nya sudah matang; major terbaru menyusul setelah beta stabil.
- 2026-10-08 — Font sistem, bukan Google Fonts. — Build tidak bergantung jaringan ke Google Fonts; lebih cepat di HP.
- 2026-10-08 — Komponen UI gaya shadcn/ui ditulis langsung (Radix + Tailwind), bukan via CLI shadcn. — Registry shadcn tidak dapat diakses dari environment build; hasilnya identik dan tetap bisa ditambah via CLI nanti.
- 2026-10-08 — Model router = LanguageModel pembungkus yang mencoba kandidat berurutan saat koneksi gagal (429/5xx). Model per tier bisa diganti via env `MODEL_JUNIOR/SENIOR/ASSOCIATE`. — Ganti provider tanpa ubah kode; model free tier sering berubah/kena rate limit.
- 2026-10-08 — Default model: Junior = Groq llama-3.1-8b → Gemini Flash-Lite → OpenRouter free; Senior = Gemini 2.5 Flash → Groq llama-3.3-70b → OpenRouter free; Associate = Gemini 2.5 Pro → OpenRouter DeepSeek R1 free → Groq gpt-oss-120b. Gambar selalu ke Gemini (vision). — Semua punya free tier; Gemini paling kuat untuk Bahasa Indonesia & vision.
- 2026-10-08 — Kredit harian dihitung dari `credit_ledger` per hari kalender WIB lewat fungsi Postgres atomik `consume_credits` (row lock). Kuota per plan di tabel `plans` (bisa diubah admin), override per user. Kredit dikembalikan otomatis bila LLM gagal. — Satu sumber kebenaran yang langsung kompatibel dengan top-up/subscription nanti.
- 2026-10-08 — Biaya kredit: Junior 1, Senior 2, Associate 5, Riset Web +2, tiap lampiran +1, upload knowledge 1. Kuota beta 50/hari. — Default awal; angka ini keputusan bisnis, bisa diubah founder.
- 2026-10-08 — Lampiran disimpan di Storage privat; pesan hanya menyimpan referensi `attachment:<id>`; teks dokumen diekstrak sekali saat upload. — URL tidak kedaluwarsa, hemat token, file tidak pernah publik.
- 2026-10-08 — Validasi upload memakai ekstensi + magic bytes, maks 10 MB, whitelist PDF/DOCX/TXT/MD/CSV/PNG/JPG/WEBP/GIF. — Cegah file berbahaya/menyamar.
- 2026-10-08 — Konten web/file/knowledge dibungkus `<untrusted_data>` + aturan di system prompt. — Guard dasar prompt injection.
- 2026-10-08 — Embedding `gemini-embedding-001` dengan 768 dimensi + index HNSW. — Free tier, ukuran vektor hemat untuk Supabase free (500 MB).
- 2026-10-08 — Memory diekstrak otomatis oleh tier Junior setiap 3 pesan user, berjalan di latar (`after()`), maks 50 item. — Hemat kredit/token; user tetap bisa edit/hapus.
- 2026-10-08 — Export DOCX/CSV/MD dibuat di browser; PDF lewat dialog cetak browser. — Tanpa beban server, tanpa dependency headless browser.
- 2026-10-08 — Kolom sensitif `profiles` (role, plan, banned, override) dikunci dengan column-level GRANT; tulis kredit/usage hanya via service role. — User tidak bisa menaikkan kuota/role sendiri meski memanggil API Supabase langsung (sudah diuji).
- 2026-10-08 — Rate limit: 20 req/menit per user, 60 req/menit per IP (fail-open bila Upstash down). — Cegah abuse tanpa memblokir user saat Redis bermasalah.
- 2026-10-08 — URL & anon key Supabase production + ADMIN_EMAILS punya nilai bawaan di kode (`src/lib/public-config.ts`, `env.ts`); env var tetap diutamakan. — Keduanya memang publik (dilindungi RLS); founder tidak perlu mengisi env publik di Vercel. Hanya 2 secret (service role, Gemini) yang wajib diisi manual. Konsekuensi: dev lokal tanpa .env.local terhubung ke DB production.
