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
- 2026-10-08 — ATURAN FOUNDER: semua hal berbayar wajib dilaporkan dulu (apa, berapa, kenapa) dan baru dijalankan setelah founder ACC. Pembayaran dilakukan founder sendiri di akun miliknya; CTO hanya menyiapkan konfigurasi.
- 2026-10-08 — Otak utama = Claude (Anthropic API): Junior = Claude Haiku 5.5, Senior = Claude Sonnet 5.5, Associate = Claude Opus 5.5; Gemini gratis tetap sebagai fallback otomatis. Aktif begitu `ANTHROPIC_API_KEY` diisi (tanpa key, router melewati Claude). — Permintaan founder: kualitas setara Claude Pro/ChatGPT Plus. Parameter sampling dibuang untuk Claude (model terbaru menolaknya); thinking blocks tidak pernah di-replay sehingga aman dari pengecekan preserved-thinking. maxDuration chat dinaikkan ke 300 dtk untuk jawaban panjang Opus.
- 2026-10-08 — Akses beta tertutup: `app_settings.access_mode = invite_only` + `profiles.beta_access`; admin selalu boleh. Diatur dari /admin (User & kuota, Paket & kredit). — Founder minta hanya 1 akun utama selama uji coba.
- 2026-10-08 — Otak per paket: paket Gratis (`beta`) hanya Markethink Junior (Claude Haiku 5.5, fallback Gemini); paket Pro membuka Senior (Claude Sonnet 5.5) & Associate (Claude Opus 5.5). Diatur lewat `feature_flags` (`tier.*`) per plan → bisa diubah admin tanpa deploy; server menolak tier terkunci (403 `tier_locked`). Tiap tier punya `skillPrompt` sendiri di system prompt (Junior ringkas-eksekusi, Senior strategist, Associate setara CMO) + daftar keahlian di model selector. Admin selalu akses semua; user bisa dijadikan Pro manual dari /admin sampai payment gateway (Fase 7) dibuat. — Permintaan founder.
- 2026-10-08 — 3 paket: Free (id `beta`, 50 kredit/hari, Junior), Pro (500 kredit, Junior–Associate), Promax (2000 kredit, + otak baru **Markethink Director** = Claude Fable 5.1, fallback Opus 5.5 → Gemini, 10 kredit/pesan). Akun founder = Promax. Tiap otak punya `effort` Claude sendiri (Junior low, Senior medium, Associate & Director high). Pilihan otak tampil di 3 tempat: header, kartu di layar chat kosong, dan tombol di kotak ketik. — Permintaan founder.
- 2026-10-08 — Bahasa jawaban mengikuti bahasa pesan terakhir user (fallback ke setelan profil). Panduan riset brand ditambahkan ke `prompts/system.md` (cari dulu → rangkum terstruktur → pisahkan fakta vs dugaan → tanya balik bila tidak ketemu). Pencarian web Claude (`web_search_20250305`, ± $0,01/pencarian) dipasang dengan saklar `app_settings.web_search` (default MATI, menunggu ACC founder; bisa dinyalakan di /admin/quota). Maks pencarian per pesan per otak: 1/3/4/6. Tool Anthropic dibuang otomatis saat fallback ke Gemini.
- 2026-10-08 — Pencarian web Claude DIAKTIFKAN (founder: "apapun yang ditanya bisa riset dan tampilkan sumbernya"). Prompt mewajibkan pencarian proaktif untuk fakta di luar pengetahuan model. Sumber dinomori ulang & di-dedupe per URL. Biaya pencarian dicatat di `usage_logs.web_searches` (+$0,01/pencarian ke est_cost). Bila web search ditolak (mis. belum diizinkan di Console), router otomatis menjawab tanpa tool dan mencatat alasannya di `usage_logs.error`.
- 2026-10-08 — Lampiran: upload langsung dari browser ke Supabase Storage via signed upload URL (`/api/upload/sign`), lalu server memvalidasi magic bytes & mengekstrak teks (`/api/upload`). Maks 25 MB. Format: PDF, Word, Excel (per sheet, maks 300 baris/sheet), PowerPoint (teks slide + catatan), CSV, JSON, TXT/MD, gambar. PDF hasil scan (teks < 80 karakter) dikirim utuh ke Claude agar dibaca langsung. — Melewati batas body 4,5 MB Vercel; founder minta AI bisa membaca & memahami file apa pun.
- 2026-10-08 — Tool chat buatan sendiri (AI SDK `tool()` + `stopWhen: stepCountIs(5)`): `create_presentation` (pptxgenjs, 16:9, 3 tema, 6 layout, speaker notes; 3 kredit; semua paket) dan `generate_image` (Gemini image model yang dideteksi otomatis via ListModels / env `IMAGE_MODEL`; bisa edit gambar acuan; 5 kredit; paket Pro & Promax). File hasil disimpan di Storage privat `uploads/<uid>/generated/...` + tabel `attachments`, dibuka via `/api/attachments/<id>` (signed URL 5 menit). Router saat retry hanya membuang tool bawaan provider (web search), tool buatan sendiri tetap. — Permintaan founder: "bisa generate gambar dan membuat PPT seperti NotebookLM".
- 2026-10-08 — Pembuat gambar BERBAYAR (± $0,04 ≈ Rp650/gambar, akun Google AI Studio, perlu billing aktif) → saklar `app_settings.image_gen` default MATI, menunggu ACC founder (aturan biaya). Bisa dinyalakan di /admin/quota.
- 2026-10-08 — Pembuat gambar DIAKTIFKAN (`app_settings.image_gen = true`) atas permintaan founder setelah laporan biaya ± $0,04/gambar. Gagal karena kuota/billing Google tercatat di `usage_logs` (tier `image`, kolom `error`).
- 2026-10-08 — Pembuat gambar lewat **OpenRouter** (utama) dengan Google AI Studio sebagai cadangan. Alasan: Google mewajibkan deposit minimal Rp500.000 untuk akun billing baru; founder memilih modal kecil (top-up OpenRouter ± $5). Model dipilih otomatis dari daftar model OpenRouter yang bisa output gambar (prioritas Gemini Flash Image; override env `OPENROUTER_IMAGE_MODEL`). Biaya nyata per gambar dari OpenRouter dicatat di `usage_logs.est_cost_usd`. Saldo habis (402) → pesan jelas ke user.
- 2026-10-08 — Pembuat gambar via OpenRouter TERVERIFIKASI jalan (model google/gemini-3.1-flash-lite-image, biaya nyata ± $0,034/gambar). Prompt diperketat: memory & Brand Kit hanya dipakai bila relevan, jangan menambah output yang tidak diminta (mis. caption), ekstraksi memory tidak lagi menyimpan permintaan sekali pakai sebagai preferensi. — Keluhan founder: minta gambar kelinci malah dikaitkan ke brand Seruput + diberi caption.
- 2026-10-08 — Hemat biaya tanpa turunkan kualitas: **prompt caching Claude** (system prompt dipisah jadi bagian stabil + penanda cache; riwayat chat di-cache otomatis; knowledge/riset per pesan dipindah ke pesan user agar tidak merusak cache; jendela riwayat 40 pesan bergeser per 10 pesan). Data sebelum: Senior rata-rata 25 ribu token input/pesan (± 73% biaya). Token cache dibaca ± 10% harga input. Biaya per pesan kini menghitung cache (kolom `usage_logs.cache_read_tokens` / `cache_write_tokens`). Model, effort, dan jumlah pencarian web tidak diubah.
- 2026-10-08 — Pencarian web lebih efisien lewat prompt (mulai 1 pencarian, tidak mengulang yang sudah ada di percakapan, tidak mencari konsep umum). Varian web search `20260209` (dynamic filtering, lebih hemat token) belum didukung @ai-sdk/anthropic 2.x — dicek lagi saat upgrade SDK.
- 2026-10-08 — Akses DIBUKA untuk publik (`app_settings.access_mode = public`) atas permintaan founder: semua akun baru langsung bisa memakai paket Free; upgrade Pro/Promax sementara manual oleh admin (payment gateway = Fase 7). Halaman /closed otomatis mengarahkan ke /chat bila akses sudah dibuka.
- 2026-10-08 — Batas harian paket Free (founder): 20 chat, 2 gambar, 1 PPT per hari (WIB), via feature_flags `chat`/`image_gen`/`pptx` value `{"per_day": N}`; dihitung dari usage_logs status ok. Pembuatan gambar kini dibuka untuk Free (maks 2/hari). Pro/Promax hanya dibatasi kredit. Permintaan gambar/PPT juga terhitung 1 chat.
- 2026-10-08 — Paket Free memakai **model gratis dulu** (Gemini free tier: gemini-flash-latest → gemini-3.8-flash, override env `MODEL_FREE`), Claude Haiku sebagai cadangan otomatis bila kuota gratis habis/sibuk. Pencarian web Free: Google Search (gratis) saat Gemini menjawab; pencarian Claude berbayar dibatasi 5/hari. Biaya Gemini dicatat Rp0 (free tier) kecuali env `GOOGLE_BILLING_ENABLED`. Konsekuensi privasi (data free tier Google dapat dipakai melatih & ditinjau manusia) diungkap di Kebijakan Privasi + pemberitahuan di bawah kotak chat user Free. Pro/Promax/admin tetap 100% Claude. Diatur via feature_flags `free_models` & `web_search` per paket.
- 2026-10-08 — Region Vercel Functions dipindah ke **sin1 (Singapura)** lewat `vercel.json`, satu lokasi dengan database Supabase (Singapura) dan dekat user Indonesia. Sebelumnya default iad1 (Washington DC) → tiap query DB ± 200+ ms bolak-balik, login & buka halaman terasa lambat. Login: sinkron role admin tidak lagi ditunggu, tombol tetap "memuat" sampai halaman terbuka.
- 2026-10-08 — Blok teks di jawaban AI → popover "Tanyakan" (kutip ke kotak chat, lalu user menulis pertanyaannya) dan "Jelaskan" (langsung minta penjelasan). Dikirim sebagai blockquote markdown di awal pesan; bubble user menampilkan kutipannya rapi; system prompt diberi aturan fokus ke bagian yang dikutip.
- 2026-10-08 — **Projects** (permintaan founder, ala ChatGPT/Claude Projects): Brand Workspace diganti nama jadi Project dan tampil sebagai folder di sidebar (chat project tampil di dalam folder-nya, riwayat umum hanya chat tanpa project; tombol + buat project). Isolasi: Brand Kit, dokumen (RAG), dan **memory** per project (kolom `memories.workspace_id`; chat di luar project hanya memakai memory umum); system prompt menegaskan fokus ke project aktif; chat yang sudah berisi pesan terkunci di project-nya (UI + API 409). Batas jumlah project per paket dari feature_flags `workspaces.max` (Free 5, Pro 50, Promax 200).
- 2026-10-08 — Semua pop-up bawaan browser (prompt/confirm) diganti jendela di dalam aplikasi: buat project, ganti nama chat, hapus chat (sidebar), hapus project, hapus file knowledge, hapus semua memory (`useConfirm`).
- 2026-10-08 — Fix: lampiran gambar / PDF hasil scan (mis. PDF dari Canva yang teksnya berupa gambar) gagal "Failed to download data:application/pdf…". Router kini menyatakan data URL didukung sehingga AI SDK tidak mencoba mengunduhnya (pengunduh AI SDK butuh `undici` yang tidak ada di bundle). Ekstraksi PDF memakai salinan buffer (pdf.js men-detach buffer → ukuran file tercatat 0).
- 2026-10-08 — **Mesin desain PPT baru** (founder: standar Genspark/Claude/ChatGPT): 12 layout (agenda, section, bullets, cards+ikon, stats, chart native, timeline, comparison, table, quote, image_text, closing), 8 tema + warna brand, 66 ikon lucide (PNG putih pra-render via `scripts/gen-pptx-icons.mjs`), ukuran teks otomatis agar muat, footer & nomor halaman. Foto AI untuk cover + maks 2 slide (paket berbayar/admin; +2 kredit/foto, biaya nyata tercatat `usage_logs.tier = deck_image`; gagal → slide tetap jadi tanpa foto). Deskripsi tool memuat aturan desain (variasi layout, teks ringkas, gambar, notes). Kartu chat menampilkan pratinjau cover sesuai tema.
- 2026-10-08 — PPT kaya visual (founder: "visual hero & visual barangnya ada"): cover hero foto penuh + gradasi gelap (PNG transparan), layout baru **product** (foto produk utuh + keunggulan) dan **gallery** (2-3 foto berkaption), foto juga bisa di cards/stats/closing/section/quote/bullets. Foto milik user (attachment, mis. foto produk asli) dipakai via `image_id`/`cover_image_id` — gratis & untuk semua paket; foto AI maks 6/deck untuk paket berbayar (prioritas cover → product → image_text → section → gallery → closing …), +2 kredit/foto, gagal → slide tetap jadi.
- 2026-10-09 — **Dashboard Internal** di /admin (khusus admin): Ringkasan (user, DAU/WAU/MAU, kelengketan, user per paket, estimasi MRR, biaya AI vs paket & biaya per user aktif, error, tren 30 hari, funnel aktivasi, pemakaian fitur, profil user dari onboarding, feedback 👎), Biaya AI (periode 7/30/90 hari, per hari, per fitur, per paket, per model, user paling boros), User (filter paket, urut aktif, pemakaian & biaya 30 hari, halaman detail tanpa isi chat demi privasi, ekspor CSV), Waitlist (+CSV), Error log. Data dari RPC security definer `admin_*` (migrasi 0016, hanya service_role). Biaya ditampilkan dalam Rupiah dengan kurs env `USD_IDR_RATE` (default 17.000).
- 2026-10-09 — **Revisi founder:** dashboard internal di /admin dikembalikan seperti semula (aplikasi user tidak berubah). Dibuat **Back Office** terpisah di link sendiri **/backoffice** (login sendiri, tanpa sidebar chat) untuk founder & tim bisnis: Ringkasan (total akun, pelanggan berbayar vs Free, pendaftar baru, pendapatan bulan ini vs bulan lalu, MRR, transaksi, berhenti langganan, daftar tindak lanjut, grafik pendapatan & pendaftar per bulan, pelanggan per paket, perjalanan pelanggan), Pelanggan (cari/filter/urut, paket, lama di paket, aktif sampai, pelanggan sejak, total bayar, CSV), detail pelanggan (riwayat bayar & paket, catat pembayaran, ubah paket/berhenti, batalkan penjualan), Penjualan (catat penjualan via email, harga paket, laporan 12 bulan, transaksi per bulan + CSV), Calon pelanggan (waitlist), Biaya AI & margin, Tim (admin memberi/mencabut akses anggota). Selama payment gateway belum ada, pembayaran dicatat manual oleh tim → tabel `subscriptions` (nominal, durasi, metode, jenis baru/perpanjang/upgrade/downgrade; perpanjangan menyambung dari tanggal habis). Riwayat paket otomatis lewat trigger (`plan_changes`, `profiles.plan_started_at`). Akses: admin otomatis + tabel `backoffice_members`. Akun admin & tim tidak dihitung sebagai pelanggan. Migrasi 0017 (RPC `bo_*`, hanya service_role).
- 2026-10-09 — **Back Office: login username + password sendiri** (founder: tidak memakai email/Gmail aplikasi). Tabel `backoffice_users` (username, nama, peran owner/tim, hash password scrypt, aktif/nonaktif, kunci 15 menit setelah 5× salah password) & `backoffice_sessions` (cookie httpOnly 7 hari, DB hanya menyimpan hash token). Akun owner pertama dibuat lewat /backoffice/setup — hanya bisa bila belum ada owner aktif DAN sedang login sebagai admin aplikasi. Owner mengelola akun tim (buat, reset password, nonaktifkan) di menu Tim & akun; semua bisa ganti password sendiri. Pencatat penjualan/perubahan paket kini akun back office (`subscriptions.bo_created_by`, `plan_changes.bo_changed_by`; RPC `bo_set_plan`). `backoffice_members` (0017) tidak dipakai lagi. Tampilan diubah ala Filament: sidebar kiri bergrup (Pelanggan, Penjualan, Keuangan, Pengaturan) dengan sub-menu yang bisa dibuka-tutup, badge jumlah tindak lanjut, sidebar bisa diciutkan, menu laci di HP, kolom cari pelanggan & avatar di atas. Migrasi 0018.
- 2026-10-09 — **Back Office dipisah total dari aplikasi AI** (founder: "link berbeda dan build berbeda", user tidak boleh bisa akses). Kode dipindah ke folder `backoffice/` = aplikasi Next.js tersendiri (package.json sendiri, tanpa kode/dependency AI), di-deploy sebagai **project Vercel terpisah** (Root Directory `backoffice`, region sin1) → link sendiri, URL bersih (`/`, `/customers`, `/sales`, …). Aplikasi AI (markethink-pi) tidak lagi berisi halaman/API back office (404). Login back office tetap username + password (tabel `backoffice_users`); akun owner pertama dibuat di `/setup` memakai **kode setup** dari env `BACKOFFICE_SETUP_CODE` yang diisi founder sendiri di Vercel (tidak lagi butuh login aplikasi). Env project back office: `SUPABASE_SERVICE_ROLE_KEY` (wajib), `BACKOFFICE_SETUP_CODE` (untuk owner pertama). Database tetap sama (Supabase production).
- 2026-10-09 — Menu & halaman **Admin dihapus dari aplikasi AI** (founder: aplikasi AI murni untuk user). Fiturnya dipindah ke Back Office (khusus owner): menu **Aplikasi AI → Marketing Agents** (tambah/edit/aktif-nonaktif agent) dan **Pengaturan aplikasi** (akses publik/undangan, pencarian web, pembuat gambar, kredit harian per paket); di detail pelanggan ada **Kontrol akun** (kuota kredit khusus, tambah kredit hari ini, akses khusus saat aplikasi tertutup, blokir/buka blokir). Ganti role admin dilakukan lewat env `ADMIN_EMAILS`.
- 2026-10-13 — **Layar awal chat dibuat minimalis** (founder: terlalu ramai). Kartu "Pilih otak marketing", 4 contoh prompt panjang, dan tautan "Lihat semua Marketing Agents" dihapus (pilih otak tetap ada di tombol kecil dalam kotak chat & di header; Agents tetap di sidebar). Gantinya ala ChatGPT/Claude: sapaan "Halo, {nama}" + kotak chat di tengah layar + chip jalan pintas (Caption, Campaign plan, Kalender konten, Riset tren, Buyer persona, Buat PPT, Buat gambar). Chip mengisi kotak chat dengan kerangka perintah dan menyorot bagian [..] pertama agar user tinggal mengetik (Riset tren otomatis menyalakan Riset Web). Setelah pesan pertama, kotak chat kembali ke bawah seperti biasa.
- 2026-10-13 — **Menu pilih otak dirapikan** (founder: tidak enak dilihat & tidak jelas). Dari kartu panjang (ikon jarum, deskripsi panjang, banyak tag keahlian) menjadi daftar ringkas: indikator level 1–4 batang, nama otak, satu baris kegunaan, biaya kredit di kanan, centang untuk yang dipilih, label kunci + nama paket untuk otak yang belum tersedia di paket user (klik → dialog upgrade), catatan kecil "makin pintar, makin banyak kredit".
- 2026-10-13 — **Add-on Tools Pro** (ACC founder): 3 add-on berbayar — **Jualan Online Kit** Rp30rb/bln 15× (Optimasi Listing Marketplace, Skrip Live Selling + mode contekan host, Template WhatsApp), **Dokter Iklan** Rp50rb/bln 10× (Analis Laporan Iklan dari CSV/Excel/screenshot → rapor skor, iklan boros vs bagus, usulan budget; + Kalkulator Bisnis tanpa kuota), **Riset Pasar Pro** Rp50rb/bln 6× (Riset Kompetitor dengan riset web otomatis → peta posisi, SWOT, celah konten, sumber; Brief KOL/Affiliate + estimasi fee + template DM). Promax gratis 3×/add-on/bulan (WIB), semua user 1× percobaan gratis, admin tanpa batas; urutan pakai kuota: Promax → beli → percobaan. Kuota hanya terpotong bila hasil berhasil. Hasil selalu berupa halaman visual + file PPT (mesin desain PPT) & Excel + cetak/PDF, memakai otak Senior dengan output terstruktur. Pembelian sementara manual: user klik "Beli add-on" → masuk "Calon pelanggan" di back office → tim mencatat di detail pelanggan (aktif 30 hari/bulan, perpanjangan menyambung). Harga & kuota bisa diubah owner di back office (Harga paket). Laporan back office (pendapatan, MRR, total bayar) ikut menghitung add-on; biaya AI tools tampil di Biaya AI. Tabel: `addons`, `addon_subscriptions`, `tool_runs` (migrasi 0019–0020).
- 2026-10-13 — Fix: halaman Tools Pro error ("Ada yang tidak beres") karena halaman server memanggil fungsi format (rupiah/tanggal/teks kuota) dari modul "use client". Fungsi & tipe dipindah ke `src/lib/addons/format.ts` (aman server & client); dicek tidak ada impor fungsi lain dari modul client di halaman server.
- 2026-10-13 — Fix Tools Pro (laporan founder: Analis Laporan Iklan gagal 3×): (1) PDF laporan hasil scan/"compressed" tidak punya teks → kini dikirim utuh ke AI untuk dibaca visual; file yang benar-benar tak terbaca → pesan jelas (bukan hasil karangan). (2) PPT tidak lagi bisa menggagalkan hasil: slide dengan data kurang (grafik 1 data, kartu tunggal, timeline < 3) otomatis diubah jadi poin/dibuang (`sanitizeDeck`); bila PPT tetap gagal, hasil + Excel tetap jadi. Tes data tipis untuk semua tool ditambahkan.
- 2026-10-13 — Hasil Tools Pro tampil di **riwayat sidebar** (Hari ini / 7 hari terakhir …) bersama chat, dengan ikon tool & bisa dicari, diganti nama, atau disembunyikan. Disembunyikan = `tool_runs.hidden` (tidak dihapus, tetap dihitung kuota agar tidak bisa diakali). API `/api/chats` ikut mengirim `toolRuns`; ganti nama/sembunyikan lewat `/api/tools/runs/:id`. Migrasi 0021.

## 2026-10-13 — Tools Pro jadi dropdown + Market Research Pro
- Sidebar: "Tools Pro" kini dropdown (buka/tutup, diingat browser; otomatis terbuka di halaman /tools) dengan submenu per kelompok: Market Research, Jualan Online, Iklan.
- Add-on `riset_pro` diganti nama "Market Research Pro" (harga Rp50rb & kuota 6/bulan TIDAK berubah). 4 tools baru mengikuti kerja konsultan (McKinsey/BCG: TAM-SAM-SOM, Porter, scorecard go/no-go; Nielsen/Kantar/Jakpat/Populix: persona, journey, kuesioner):
  - `sizing` Ukuran & Tren Pasar (riset web, TAM/SAM/SOM + bottom-up, proyeksi 3 skenario, kanal, tren, PESTEL).
  - `persona` Segmentasi & Persona (riset web, matriks segmen, persona, customer journey, faktor beli, insight).
  - `entry` Studi Kelayakan (riset web, scorecard → skor dihitung program, 5 Forces, izin RI, unit economics, modal, matriks risiko, rencana 90 hari).
  - `survey` Desain Survei (tanpa web; jumlah responden dihitung rumus Cochran, screener, Van Westendorp/NPS, Excel siap Google Form).
- Helper riset web dipindah ke `src/lib/addons/helpers.ts` (dipakai juga oleh Riset Kompetitor).
- Perkiraan biaya modal per pemakaian: sizing/persona/entry ±Rp5-8rb, survey ±Rp2rb.

## 2026-10-13 — Drag & drop di sidebar
- Chat umum (tanpa project) bisa digeser dengan mouse ke folder project (memakai pointer events + bayangan yang ikut kursor, bukan drag bawaan browser yang tidak jalan pada link), atau lewat menu ⋯ → "Pindahkan ke project" (untuk HP). Aturan lama dilonggarkan: chat umum boleh masuk project walau sudah berisi percakapan; chat yang sudah di dalam project tetap terkunci (isi project tidak bocor keluar).
- Urutan project bisa diubah dengan menggeser folder; disimpan di kolom baru `workspaces.sort_order` (project baru tampil paling atas). Riwayat chat tetap urut otomatis berdasarkan waktu.
- Bagian "Disematkan" di atas riwayat (ala ChatGPT/Claude): chat umum & hasil Tools Pro bisa digeser ke sana (garis biru = posisi lepas), diurutkan dengan menggeser, dan dilepas dengan menggeser kembali ke riwayat atau menu ⋯ → Sematkan/Lepas sematan. Kolom baru `chats.pin_order` & `tool_runs.pin_order`; API `PATCH /api/pins` menyimpan seluruh urutan. Riwayat di bawahnya tetap urut waktu.
- Drag & drop sidebar memakai @dnd-kit (gratis, MIT) agar terasa seperti ChatGPT/Claude: baris yang digeser melayang ikut kursor, item lain bergeser memberi ruang (urutan sematan & folder project), folder tujuan menyala, scroll otomatis di tepi, dan di HP cukup tekan-tahan ±0,25 detik lalu geser. Saat belum ada sematan, area "Lepas di sini untuk menyematkan" melayang di atas riwayat (tidak menggeser daftar).
- Riwayat sidebar kini satu daftar "Riwayat" yang urutannya bisa diatur dengan drag (label Hari ini/Kemarin dihapus karena bertentangan dengan urutan manual). Posisi disimpan di kolom `sort_key` (chats & tool_runs) = angka di tengah dua tetangga; item tanpa sort_key ikut waktu aktivitas, jadi chat baru tetap muncul paling atas. API `PATCH /api/history-order`.
- Kunci chat di project DICABUT (permintaan founder): chat di dalam folder bisa digeser keluar ke Riwayat (di posisi lepas), ke folder lain, atau ke Disematkan; juga lewat menu ⋯ → "Keluarkan dari project" / "Pindahkan ke project". Pesan lama tetap; mulai pesan berikutnya chat memakai konteks (brand kit/dokumen/memory) tempat barunya. API `PATCH /api/chats/:id` tidak lagi menolak 409.

## 2026-10-15 — Tools Pro per role marketing (25 tools, 8 add-on)
- Permintaan founder: Tools Pro dikelompokkan per role & hasil setara pakar/agency, tidak terasa AI. Kelompok (= add-on): Strategi & Brand (strategi_pro),
  Market Research (riset_pro), Konten & Sosmed (konten_pro), Iklan & Performance (dokter_iklan), Jualan Online (jualan_kit), CRM & Retensi (crm_pro),
  KOL & PR (kolpr_pro), Laporan (laporan_pro). WhatsApp pindah ke CRM, Brief KOL ke KOL & PR (belum ada pembelian, aman).
- 14 tools baru: plan, brand, campaign, gtm, calendar, script, audit, adcopy, promo, flow, loyalty, kolreport, press, report.
- Kerangka `src/lib/addons/pro/`: form deklaratif (fields → form + validasi zod + brief AI), `makeRunner` (file upload, riset web opsional,
  `validate` → pesan user `USER:`), standar gaya `EXPERT` (helpers.ts, juga dipakai tools lama) dengan daftar frasa klise AI terlarang.
- Angka penting dihitung program (bukan AI): margin promo, metrik & skor KOL, ekonomi loyalty, skor audit, budget dinormalisasi, durasi adegan naskah.
- Harga & kuota add-on baru = DRAFT (strategi 75rb/6, konten 50rb/15, crm 30rb/10, kolpr 50rb/10, laporan 50rb/8) — menunggu ACC founder.
- Tes generik `tests/pro-tools.test.ts` memakai semua fixture `tests/fixtures/pro/*.ts` (PPT/Excel valid + data tipis).
- 2026-10-15 — **Diskusi hasil Tools Pro** (permintaan founder): di setiap halaman hasil ada panel "Diskusikan hasil ini" untuk bertanya/mengoreksi data & maksud
  (2 kredit harian per pertanyaan, otak Senior, riwayat di tabel `tool_run_messages`). AI merangkum koreksi dalam blok [[KOREKSI]] → tombol
  "Perbaiki hasil" membuat versi baru dengan input sama + koreksi + hasil sebelumnya (kolom `tool_runs.revision_of/revision_note`), GRATIS maks 3×
  per hasil (tidak memotong kuota add-on; revisi tidak riset web ulang). Biaya diskusi tampil di back office sebagai "Tools · Diskusi hasil".
- 2026-10-15 — Revisi permintaan founder: diskusi hasil dipindah ke **chat utama**. Tombol "Bahas di Chat" (`POST /api/tools/runs/:id/to-chat`)
  membuat chat baru berisi hasil (dikonversi ke Markdown oleh `resultToMarkdown`) sebagai pesan pertama `tool-<runId>`; satu hasil → satu chat
  (`chats.source_run_id`). Pesan hasil itu selalu ikut konteks walau chat panjang. Panel diskusi samping & API-nya dihapus (tabel
  `tool_run_messages` tidak dipakai). "Perbaiki hasil" kini dialog di halaman hasil (gratis 3×).
- 2026-10-15 — **Kuota penyimpanan per paket** (ACC founder): Free 50 MB, Pro 1 GB (usulan, belum disebut founder), Promax 5 GB, admin tanpa batas.
  Disimpan di feature_flags `storage.max_mb` (+ `uploads.max_mb` per file, kini benar-benar ditegakkan). Dihitung dari upload user (chat & dokumen
  project) via `storage_used_bytes()`; file hasil AI tidak dihitung. Dicek saat minta URL upload (`/api/upload/sign`). Meter di Pengaturan user.
  Foto >1 MB dikompres di browser (maks 2048 px, WebP 85%). Back office: kartu "Kapasitas server" (vs batas gratis Supabase 1 GB file / 500 MB DB,
  peringatan ≥70%) + pemakai terbesar; kuota per paket bisa diubah di Pengaturan aplikasi. Hapus otomatis file lama BELUM (menunggu ACC).
- 2026-10-15 — **Tools Pro terkunci untuk paket Free** (founder): Free tidak dapat percobaan gratis; halaman tool menampilkan pilihan "Beli add-on"
  (harga/bulan & kuota) atau "Upgrade ke Pro/Promax" (permintaan masuk back office → Calon pelanggan). Gembok di submenu sidebar untuk Free.
  Pro tetap coba gratis 1× per add-on; Promax gratis 3× per add-on per bulan; API menolak (402) tanpa jatah.
- 2026-10-15 — **Fix keandalan Tools Pro** (error berulang di produksi): (1) Claude Sonnet 5.5 menolak structured output untuk skema besar
  ("compiled grammar is too large") lalu jatuh ke Gemini yang sedang penuh; (2) jawaban panjang terpotong → "could not parse".
  `aiObject` kini: AI menulis JSON biasa sesuai JSON Schema di prompt → program memperbaiki JSON terpotong (jsonrepair) & menyesuaikan tipe kecil
  (`src/lib/addons/json-output.ts`) → bila terpotong diulang lebih ringkas → bila tetap tidak sesuai skema, 1 putaran perbaikan oleh AI.
  Batas waktu dihitung dari awal proses (250 dtk dari 300 dtk Vercel). Caption Kalender Konten dipersingkat agar lebih cepat.

## Panel hasil otomatis di chat "Bahas di Chat"
- Chat yang dibuat dari hasil Tools Pro (`chats.source_run_id`) membuka panel kanan berisi versi TERBARU hasil (layar ≥1024px otomatis terbuka; tombol "Hasil" di header untuk membuka lagi).
- Bila user meminta perubahan di chat, AI menutup balasan dengan blok `[[PERBARUI_HASIL]]…[[/PERBARUI_HASIL]]`; klien menyembunyikan blok itu dan memanggil revisi (`__revise`) → panel memuat versi baru (termasuk PPT/Excel).
- Batas revisi gratis per hasil dinaikkan 3 → 5 (`MAX_REVISIONS` di `src/lib/addons/format.ts`), tidak memotong kuota.
- Hasil di panel kanan TIDAK berubah otomatis saat user hanya bertanya/diskusi (agar versi & jatah revisi tidak terbuang). Perubahan terjadi bila user memintanya,
  menjawab "ya" atas tawaran AI, atau klik tombol **Perbarui hasil** (di bawah jawaban terakhir) / **Terapkan ke hasil** (jawaban sebelumnya).

## Sidebar dua mode (ala Claude Code) & AI chat paham Tools Pro
- Sidebar punya pilihan **Chat | Tools Pro**. Mode Chat: chat baru, agents, project, sematan & riwayat chat biasa.
  Mode Tools Pro: semua tools per role, riwayat hasil Tools Pro + chat "Bahas di Chat". Mode ikut halaman yang dibuka (disimpan di browser).
- Sematan dipisah per mode tetapi disimpan bersama (menyimpan sematan di satu mode tidak melepas sematan mode lain).
- Chat biasa: system prompt berisi daftar ±25 hasil Tools Pro terbaru user + tool `read_tool_result` untuk membaca isi versi terbarunya
  saat user menyinggung hasil Tools Pro. Hasil tetap diubah lewat "Bahas di Chat".

## Markethink Agent (ACC founder 15 Okt 2026)
- Halaman `/tools/agent` (mode Tools Pro). User menulis satu tujuan (+ info bisnis opsional) → AI (otak Senior) menyusun rencana 2–5 langkah
  dari Tools Pro yang tersedia, urut fondasi → eksekusi, dibatasi sisa kuota per grup add-on (dicek program, bukan hanya AI).
- User bisa membuang langkah sebelum menjalankan. Browser menjalankan langkah satu per satu (`/api/agent/[id]/step`, satu tool per request,
  aman untuk batas 300 dtk Vercel). Tiap langkah: AI mengisi brief tool dari tujuan + hasil langkah sebelumnya → executeTool (logika sama dengan halaman tools).
- Setiap langkah memakai 1 kuota tool-nya (aturan kuota sama dengan pemakaian manual). Langkah gagal tidak memotong kuota & bisa diulang.
- Selesai → ringkasan eksekutif (inti strategi, rencana eksekusi, metrik, risiko) + "Bahas paket di Chat" (chat `source_agent_id`).
- Tidak dipakai Agent: kalkulator, Dokter Iklan, Laporan Bulanan, Laporan KOL (butuh upload data performa).
- Tabel `agent_runs`, kolom `tool_runs.agent_run_id`, `chats.source_agent_id` (migrasi 0030, sudah diterapkan ke production). Biaya AI Agent dicatat di usage_logs `tool:agent`.

## Warna brand: biru futuristik (15 Okt 2026, permintaan founder)
- Ungu diganti biru elektrik: primary light `oklch(0.57 0.22 258)` (≈ #1E5BFF), dark `oklch(0.7 0.17 245)`; aksen cahaya cyan `--glow` (≈ #22D3EE).
- Tombol utama: gradasi biru → biru-cyan (`--primary-2`) dengan glow halus. Logo & favicon: gradasi #1E5BFF → #22D3EE.
- Tema PPT "midnight"/"clean" ikut biru; warna kategori grafik tetap beragam (biru menggantikan indigo sebagai warna pertama).

## Otak Tools Pro & Agent: Associate (default) / Director (15 Okt 2026, permintaan founder)
- Semua Tools Pro, revisi, dan Markethink Agent memakai otak **Associate** (Claude Opus 5.5 → cadangan Gemini Pro) secara default,
  dengan pilihan **Director** (Claude Fable 5.1 → Opus) untuk paket yang membuka tier Director (Promax/admin). Sebelumnya Senior (Sonnet).
- Pilihan di form tool & Agent ("Otak: Associate | Director"), diingat di browser; server memvalidasi terhadap paket (`resolveToolTier`).
- Kolom `agent_runs.tier` (migrasi 0031).

- **Revisi (founder pilih opsi A, 15 Okt 2026):** default kembali ke **Senior** (biaya ±Rp5 rb/hasil). Associate (paket Pro/Promax) & Director
  (Promax/admin) tetap bisa dipilih; **Director memakai 2 kuota** per hasil (`tool_runs.quota_units`, migrasi 0032). Revisi tetap gratis (tidak memotong kuota).
  Agent dengan Director: jumlah langkah per grup = sisa kuota ÷ 2.
- Menu "Marketing Agents" di mode Chat dihapus dan diganti tautan **Markethink Agent** (ke `/tools/agent`). Halaman `/agents` dialihkan ke sana;
  data agent lama & chat yang memakainya tetap utuh.

## Penghematan gambar & Riset Web (15 Okt 2026, ACC founder)
- **Gambar baru** (chat & foto PPT): Imagen 4 Fast (±$0,02/gambar) bila `IMAGEN_API_KEY` diisi; edit/variasi gambar & cadangan tetap
  Gemini Flash Image via OpenRouter (±$0,034). Key Imagen dari project Google ber-billing terpisah agar Gemini gratis tetap gratis.
  Seedream di OpenRouter tidak lebih murah ($0,035) → tidak dipakai.
- **Riset Web**: bila `SERPER_API_KEY` diisi → chat memakai tool `web_search` berbasis Serper (Google, gl=id) menggantikan pencarian
  bawaan Claude ($10/1.000 → ±$1/1.000); mode Riset Web memakai Serper (cadangan Tavily); Tools Pro/Agent: Junior menyusun kata kunci →
  Serper paralel → otak pilihan menulis catatan riset bernomor. Gagal → otomatis kembali ke pencarian Claude.
- Uji pertama Serper (Riset Kompetitor PhotoBebaz): biaya $0,50 → $0,087 (−83%), 90 → 54 dtk, tapi data harga kompetitor tidak ketemu
  karena hanya cuplikan Google. Perbaikan: baca isi halaman teratas (fetch HTML → teks, gratis; lewati medsos/marketplace) —
  Tools Pro maks 8 halaman, chat 3 halaman — dan kata kunci khusus per brand/kompetitor (harga, promo, review, lokasi).
- **Temuan riset lengkap** (permintaan founder): catatan riset web (Serper: Markdown per topik/kompetitor, semua fakta detail + [n],
  bagian "Belum ditemukan") disimpan di `output.research_notes` lewat `ctx.researchNotes` → tampil sebagai kartu "Temuan riset lengkap"
  di halaman hasil & panel chat (ikut tercetak di PDF), ikut di konteks "Bahas di Chat"/Agent. Revisi memakai temuan hasil sebelumnya.
- Excel semua Tools Pro yang melakukan riset web kini punya sheet **"Temuan riset"** (Topik | Temuan | Sumber URL; baris "Belum
  ditemukan" diberi warna). Dibuat dari `ctx.researchNotes` lewat `withNotes()`; revisi memakai temuan & sumber hasil sebelumnya.

## Hemat biaya Tools Pro tanpa menurunkan kualitas laporan (16 Okt 2026)
- Temuan: ±84% biaya hasil Associate ($1,08) adalah proses berpikir AI (thinking) yang tidak tampil; tulisan terlihat hanya ±Rp1.400.
  Visual (grafik, PPT, Excel) Rp0 karena dibuat program — tidak ada yang dihemat dengan mengurangi visual.
- Tahap **Temuan riset** (merangkum fakta dari halaman) memakai level berpikir `low`. Tahap **laporan akhir** tetap level bawaan
  agar kualitas strategi sama (permintaan founder).
- Rincian biaya per tahap disimpan di `tool_runs.cost_breakdown` (migrasi 0033): tahap, model, token masuk/keluar, perkiraan token
  tulisan terlihat (sisa output = berpikir), biaya.

## Rapikan pemborosan biaya chat (16 Okt 2026, ACC founder) — harga paket belum diubah
- **Cache riwayat chat**: penanda cache di pesan asisten terakhir (stabil di giliran berikutnya) + pesan user terakhir
  (`withCacheBreakpoints`). Sebelumnya chat Senior membaca ±12 rb token riwayat dengan harga penuh tiap pesan.
- **Baca hasil Tools Pro**: maks 3 hasil per pesan (`MAX_TOOL_READS`), versi ringkas 7 rb karakter; `lengkap=true` 20 rb.
- **Otak Otomatis** (default chat baru & chat lama tanpa pilihan): heuristik `autoTier` — ringan → Junior; strategi/dokumen/
  lampiran/Riset Web/chat hasil Tools Pro/pesan panjang → Senior; ragu → Senior. Kredit sesuai otak yang dipakai; label tiap
  jawaban menunjukkan otak yang dipakai. Disimpan sebagai `chats.tier = 'auto'`.
- Rancangan paket (Starter Rp60 rb/250 kredit, Pro Rp200 rb/900, Promax Rp300 rb/1.350, 1 kredit = Rp100 modal) menunggu ACC.

## Paket all-in-1 kredit bulanan (16 Okt 2026, ACC founder "ACC paket")
- Satu dompet kredit **per bulan** (reset tgl 1, 00.00 WIB) untuk chat, riset, gambar, Tools Pro & Agent. 1 kredit ≈ Rp100 modal AI.
- Paket: Free 50 kredit · **Starter Rp60 rb / 250** · **Pro Rp200 rb / 900** · **Promax Rp300 rb / 1.350**. Modal maksimal = 50% harga
  (margin ≥50% walau kredit habis dipakai). Diuji di `tests/credits.test.ts`.
- Akses: Starter = Junior+Senior + semua Tools Pro; Pro + Associate + Markethink Agent; Promax + Director. Feature flag `tools_pro`, `agent`.
- Cara potong: perkiraan dulu (`consume_credits`), lalu disesuaikan ke biaya nyata (`settle_credits`, selisih + atau −); gagal = kembali penuh.
  Perkiraan Tools Pro: Senior 50, Associate 120, Director 300; revisi ±60% (tanpa riset ulang). Agent dibatasi sisa kredit per langkah.
- Add-on Tools Pro per kelompok dihapus dari aplikasi (tabel `addons` dibiarkan untuk riwayat). Upgrade lewat halaman `/pricing`
  → permintaan masuk back office "Calon pelanggan".
- Bonus kredit dari back office (delta +) ikut menambah saldo bulan berjalan (migrasi 0035).
- (16 Okt, permintaan founder) Angka kredit **tidak ditampilkan** ke user mana pun: pemakaian tampil sebagai persen kuota bulanan
  (lingkaran di kolom chat → klik untuk detail, seperti Claude). Halaman paket menyebut besar kuota relatif ("3,6× kuota Starter").
  Pemberitahuan "diproses Google Gemini" di bawah chat dihapus; keterangan tetap ada di Kebijakan Privasi.

## Baca tautan di chat — Tahap 1 (16 Okt 2026, ACC founder)
- Tautan di pesan user (maks 3) dibuka server sendiri (gratis, tanpa API): web/artikel, PDF & Office online, Google Docs/Sheets/Slides
  publik (via tautan ekspor), YouTube & TikTok (judul/keterangan via oEmbed). Ditolak dengan alasan jelas: IG, FB, X, Threads,
  LinkedIn, Pinterest, Lemon8, Shopee, Tokopedia, Lazada, Blibli, Bukalapak.
- Keamanan: hanya http(s) port 80/443, DNS dicek di setiap pengalihan (tolak IP privat/metadata), maks 8 MB, 9 detik.
  Isi tautan dibungkus `untrusted_data` (data, bukan perintah).
- Biaya = token AI membaca isi (maks 12 rb karakter/tautan di pesan saat ini; 4 rb karakter tersimpan sebagai `data-link`
  di jawaban & ikut riwayat). Kredit tetap disesuaikan ke biaya nyata.
- Tahap 2 (scraper berbayar untuk IG/TikTok/marketplace) belum — perlu laporan biaya & ACC.

## Login, daftar & lupa password (16 Okt 2026)
- Tombol mata (lihat/sembunyikan) di kolom password masuk, daftar & password baru.
- **Password pelanggan tidak ditampilkan di back office** (permintaan founder ditolak demi keamanan & UU PDP): Supabase menyimpan
  password sebagai hash, tidak bisa dibaca siapa pun. Gantinya: kartu "Akun login" (email, cara masuk Google/email, verifikasi,
  terakhir login) + tombol owner "Buat link reset password" (sekali pakai, 1 jam) untuk dikirim lewat WA/email.
- Lupa password diperbaiki: penyebab dari log — link reset (PKCE) hanya jalan di browser yang sama; founder membuka di HP → gagal.
  Sekarang lewat `/api/auth/forgot` dengan link tanpa PKCE (token di `#`), bisa dibuka di perangkat mana pun. Bila Resend
  terpasang, email dikirim sendiri (tanpa batas email bawaan Supabase ±2/jam).

## Free tanpa Riset Web (16 Okt 2026, permintaan founder)
- Flag `research` & `web_search` paket Free dimatikan (migrasi 0036). Server mengabaikan Riset Web & tidak memberi alat
  pencarian (Serper/Claude/Gemini) bila paket tidak membuka `research`; tombol Riset Web tampil terkunci + ajakan Starter.
- AI paket Free diberi tahu pencarian web tidak tersedia: jawab dari pengetahuan, label "perkiraan" untuk data terbaru,
  jangan mengarang sumber. Baca tautan & file tetap tersedia (gratis dibuka, hanya token).
- (16 Okt, revisi founder) Riset Web Free **dibuka lagi** (±Rp17/pencarian), batas 5 pencarian/hari kini juga berlaku untuk
  tombol Riset Web. Free memakai Serper (bukan Google Search bawaan Gemini yang kuota gratisnya cepat habis). Migrasi 0037.
- Free: jawaban maks 2.000 token (±1.500 kata), riwayat yang dibaca AI 10–19 pesan terakhir (`historyStart(total, 10)`).
- Free: gambar memakai model hemat OpenRouter dulu (`meta/muse-image` ±$0,01 terbukti 16 Okt → `openai/gpt-image-2`; rasio 4:5/5:4 dibulatkan untuk Image API) lalu jalur biasa
  (Gemini Flash Image ±$0,034) bila gagal. Override env `OPENROUTER_BUDGET_IMAGE_MODEL`. Kuota tetap 6 kredit/gambar.
- Prompt Junior ditambah "standar kualitas": spesifik + asumsi wajar, konteks Indonesia, kerangka marketing, contoh siap pakai,
  data berlabel perkiraan / pakai pencarian, cek mandiri sebelum kirim.
- (16 Okt, founder) Permintaan **murni membuat/mengedit gambar** di semua paket memakai otak **Junior** (`isImageRequest`),
  apa pun otak yang dipilih — hasil gambar ditentukan model gambar; tes: Senior +Rp640/gambar di chat baru tanpa beda kualitas.
  Campuran (strategi/PPT/caption/prompt + gambar) tetap memakai otak pilihan. Model gambar tetap dibedakan: Free = Muse,
  berbayar = Gemini Flash Image.
- (16 Okt, founder) **Semua paket** memakai Meta Muse untuk gambar baru (chat & foto AI di PPT), ±$0,01/gambar; batas & potongan
  kuota tidak berubah (6 kredit/gambar, Free 2/hari). Edit dari foto/gambar acuan tetap Gemini (Muse belum menerima gambar acuan).
- (16 Okt, founder) **Visual bertingkat**: foto AI per PPT Free 0 · Starter 1 (cover) · Pro 6 · Promax 8 (`DECK_IMAGE_MAX_BY_PLAN`);
  Pro & Promax gambar baru + foto PPT diberi arahan visual premium (`PREMIUM_ART_DIRECTION`). Model tetap Muse untuk semua.
- (16 Okt) Bug Free + PPT: Gemini gratis riset web lalu berhenti tanpa hasil (langkah ke-2 kosong). Permintaan PPT kini
  memakai Claude Haiku (bukan Gemini gratis), modal ±Rp50/PPT, dan tidak kena batas 2.000 token jawaban Free
  (isi semua slide dikirim dalam satu panggilan tool; batas itu memotong file PPT sebelum jadi). Jawaban kosong → kuota dikembalikan penuh, dicatat
  `status=error` "jawaban kosong", dan chat menampilkan pemberitahuan kirim ulang.
- (16 Okt, founder) PPT di chat punya tombol **"Lihat"** (semua paket): pratinjau semua slide di browser dari isi deck
  (input tool) + tema yang sama dengan file (`src/lib/deck-theme.ts`), foto AI disimpan sebagai file untuk pratinjau
  (`previewImages`). Pustaka `pptx-preview` dicoba tapi tidak bisa membaca file buatan pptxgenjs (0 slide) → tidak dipakai.
- (16 Okt, founder) PPT tanpa foto (Free, Starter selain cover, atau foto gagal): `fitDeckToImages` mengubah layout foto
  (image_text → bullets, product → cards, gallery → cards dari caption) & membuang kotak foto — file .pptx dan pratinjau sama-sama
  tanpa kotak foto kosong. Pratinjau slide teks dirapikan (poin bernomor dalam kartu, konten di tengah).

## Chat tetap dijawab saat user pindah chat (16 Okt 2026, permintaan founder)
- `/api/chat` tidak membatalkan AI saat koneksi browser putus (pindah chat), tapi tombol Stop kini benar-benar menghentikan
  AI: `/api/chat/stop` mengisi `chats.stop_requested_at` (migrasi 0039), server mengecek tiap 1,5 dtk lalu abort; kuota
  disesuaikan ke token yang sudah terpakai (`onAbort`). Stream tetap dikonsumsi
  sampai selesai (`consumeSseStream`) lalu disimpan. Konsekuensi: tombol Stop hanya menghentikan tampilan, jawaban tetap
  diselesaikan & ditagih di server.
- Kolom `chats.generating_at` (migrasi 0038) diisi saat mulai, dihapus setelah simpan; dianggap kedaluwarsa setelah 5 menit.
  Sidebar menampilkan ikon loading & memuat ulang tiap 4 dtk selama ada chat yang dijawab; chat yang dibuka saat masih
  dijawab menampilkan "Markethink masih menyusun jawaban…" dan memuat jawabannya otomatis (`GET /api/chats/[id]`).

## PPT standar konsultan & agency (16 Okt 2026, founder)
- Fix otak Director: isi PPT yang melebihi batas skema (judul/poin/tabel kepanjangan) dirapikan otomatis lewat
  `experimental_repairToolCall` + `clampToSchema` (dari JSON Schema zod) — sebelumnya gagal validasi lalu AI mengulang
  (tampil "Gagal membuat presentasi"). Percobaan gagal yang kemudian berhasil tidak ditampilkan lagi.
- Gaya konsultan: action title (judul = kesimpulan), Executive Summary di slide 2, maks 1 slide bullets, utamakan visual data.
  Field baru per slide: `takeaway` (kotak "SO WHAT" di bawah) & `source` (sumber data). Garis tipis di bawah judul, kartu &
  timeline lebih padat. Pratinjau "Lihat" ikut menampilkan so-what & sumber. Diverifikasi via render LibreOffice.

## PPT Promax gaya sinematik (2026-10-16)
- Promax (& admin) memakai `deckStyle = "cinematic"` (referensi founder: Demokrat Digital Arena): latar navy-hitam, foto AI gelap sebagai latar penuh slide isi, panel transparan berbingkai aksen, grid halus + glow, foto 16:9.
- Pro tetap gaya konsultan standar (6 foto) — di bawah Promax. Starter 1 foto cover, Free tanpa foto.
- **Dinonaktifkan** di hari yang sama: founder menilai salah arah (yang diminta gaya desain per tema — font, struktur, KV — bukan latar navy). Kode tetap ada, `deckStyleFor` selalu "standard".

## Laba rugi per akun (16 Okt 2026)
- (16 Okt, founder) **Laba rugi per akun** di back office (`/profit`, menu Keuangan): pendapatan akun (paket + add-on, diakui
  proporsional per hari masa aktif, hanya sampai hari ini) − biaya AI nyata (`usage_logs`). Status: Rugi / Untung tipis (<30%) /
  Untung / Sangat untung (≥70%). **Pengaman laba**: biaya AI maks akun = jatah kredit × Rp100, jadi paket aman selama
  kredit/bln ≤ harga × 70% ÷ Rp100 (tabel per paket + biaya nyata per kredit). Kebocoran per akun ditandai "Perlu tindakan":
  paket berbayar tanpa/lewat pembayaran, kuota khusus di atas batas aman, bonus kredit, biaya > pendapatan. Akun admin/tim
  dipisah. RPC `bo_account_pnl` (migrasi 0040, hanya service_role).

## PPT Promax "Signature" — AI Art Director (16 Okt 2026, founder ACC)
- Bukan template warna: AI memilih `design.mood` sesuai tema (11 mood: tech, editorial, corporate, bold, warm, beauty, playful,
  sport, minimal, heritage, modern) → pasangan font Google (OFL, `public/fonts/deck`), bentuk kotak (outline/solid/glass/rule),
  palet dari KV (kontras dijaga otomatis), plus `design.kv` (dunia visual), cover kicker, tagline, presenter.
- Foto konsisten: KV (cover) dibuat dulu, foto slide lain dibuat dengan KV sebagai acuan (Gemini) → tokoh/suasana sama.
  Tiap layout memberi arahan komposisi (mis. 2 kartu = subjek kiri-kanan; timeline = subjek di atas, bawah lega).
  Modal ±Rp4.500/deck (maks 8 foto). Kredit foto tetap DECK_IMAGE_CREDIT_COST per foto, gagal → refund.
- Tata letak terinspirasi deck referensi (Demokrat Digital Arena): kicker berspasi, judul besar, duo-split dengan garis cahaya,
  timeline di atas foto, kotak bergaris tipis, kotak pernyataan di bawah. Teks diukur dengan metrik font asli (tidak meluber).
- Satu "Scene" (`src/lib/deck`) → PPTX (bisa diedit), PDF (font tertanam, persis), pratinjau browser (persis). Pro ke bawah tetap
  mesin lama (`src/lib/pptx.ts`). Gaya navy "cinematic" sebelumnya dihapus.
