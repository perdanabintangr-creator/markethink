# Markethink — Otak Marketing Berbasis AI

Chat AI ala ChatGPT/Claude + riset web ber-sitasi ala Perplexity, dikhususkan untuk marketing:
riset → strategi → konten → kalender → KPI. Bahasa default Indonesia (bisa English).

## Fitur
- **Chat**: streaming, markdown + tabel, history (cari/rename/hapus), stop, regenerate, edit pesan, copy, feedback 👍👎 + alasan.
- **3 tier otak marketing**: Junior (cepat) → Senior (default) → Associate (deep reasoning). Dipetakan ke model LLM di `src/lib/ai/models.config.ts`, dengan fallback otomatis antar provider (Gemini, Groq, OpenRouter).
- **Onboarding persona** (role, industri, pengalaman, tujuan) → personalisasi system prompt (`prompts/system.md`).
- **Brand Workspace**: Brand Kit + upload knowledge (PDF/DOCX/TXT/CSV) → RAG pgvector.
- **16 Marketing Agents** dari database (admin bisa tambah/edit tanpa deploy).
- **Riset Web** (Tavily) dengan sitasi bernomor + kartu sumber.
- **Upload di chat**: dokumen, CSV (ringkasan statistik), gambar/screenshot iklan (model vision).
- **Canvas**: editor + versioning, export Markdown / DOCX / PDF / CSV, share link.
- **Memory** otomatis + bisa dilihat/edit/hapus di Pengaturan.
- **Share** link publik read-only untuk chat & canvas.
- **Kredit harian**, rate limit (Upstash), waitlist Pro saat kredit habis.
- **Admin dashboard**: user, DAU/WAU, pemakaian per tier & model, estimasi biaya LLM, feedback 👎, kelola agents, kuota, ban.
- **Siap monetisasi**: tabel `plans`, `subscriptions`, `credit_ledger`, `usage_logs`, `feature_flags`, `payment_events`, interface `PaymentProvider` + webhook placeholder.

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind v4 + komponen gaya shadcn/ui · Supabase (Auth, Postgres, Storage, pgvector, RLS) · Vercel AI SDK v5 · Tavily · Upstash Redis · Resend · PostHog · Sentry · Vercel.

## Setup lokal
```bash
npm install
cp .env.example .env.local   # isi key — lihat SETUP.md
npm run dev                  # http://localhost:3000
```
Database: jalankan `supabase/setup.sql` sekali di Supabase → SQL Editor, **atau** `npm run db:push`
(butuh `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`).
Setelah menambah migrasi baru di `supabase/migrations/`, jalankan `npm run db:bundle`.

## Perintah
| Perintah | Fungsi |
|---|---|
| `npm run dev` | server development |
| `npm run check` | lint + typecheck + unit test |
| `npm run build` | build production |
| `npm run db:push` | terapkan migrasi ke Supabase |
| `npm run db:bundle` | gabung migrasi → `supabase/setup.sql` |

## Deploy (Vercel)
Import repo di Vercel → isi Environment Variables dari `.env.example` → setiap push otomatis ter-deploy
(preview per branch, production dari `main`).

## Admin
Email yang tercantum di `ADMIN_EMAILS` otomatis menjadi admin saat login. Dashboard: `/admin`.

## Struktur
```
prompts/system.md            System prompt utama (variabel {role} {industry} {experience} {brand_kit} {memory})
src/lib/ai/models.config.ts  Tier → model, kredit, fallback
src/lib/ai/router.ts         Model router + fallback
src/app/api/chat/route.ts    Endpoint chat (kredit, riset, RAG, memory, logging)
supabase/migrations/         Schema + RLS + seed agents
```
