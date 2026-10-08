# Markethink — Checklist Akun & API Key

Semua layanan di bawah punya **free tier**. Jangan upgrade ke plan berbayar.
Nama variabel mengikuti `.env.example`.

> ⚠️ Jangan pernah paste API key ke chat atau ke file yang di-commit.
> Isi key di **dua tempat**: (A) Vercel → Project → Settings → Environment Variables,
> dan (B) environment Claude Code cloud (menu environment di title bar sesi → Edit → Environment variables),
> supaya CTO bisa menjalankan migrasi & test.

---

## 1. GitHub — repo
- [x] Repo `perdanabintangr-creator/markethink` sudah ada.

## 2. Supabase — Auth, Database, Storage, pgvector
1. Daftar di https://supabase.com/dashboard → **New project** (region: Southeast Asia / Singapore). Simpan **database password**.
2. **Project Settings → API**: salin
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (rahasia!)
3. **Project Settings → General**: `Reference ID` → `SUPABASE_PROJECT_REF`.
4. Password database → `SUPABASE_DB_PASSWORD`.
5. https://supabase.com/dashboard/account/tokens → **Generate new token** → `SUPABASE_ACCESS_TOKEN` (dipakai CTO untuk menjalankan migrasi).
6. **Pasang database** (sekali saja): buka **SQL Editor → New query**, salin seluruh isi file `supabase/setup.sql` dari repo GitHub, tempel, klik **Run**. (Atau biarkan CTO menjalankan `npm run db:push` kalau `SUPABASE_ACCESS_TOKEN` sudah diisi.)
7. **Authentication → URL Configuration**: Site URL = URL Vercel production (isi setelah langkah Vercel), tambahkan Redirect URL `https://<domain-vercel>/auth/callback` dan `http://localhost:3000/auth/callback`.

## 3. Google Cloud — OAuth (login Google)
1. https://console.cloud.google.com → buat project "Markethink".
2. **APIs & Services → OAuth consent screen** → External → isi nama app, email support → Save.
3. **Credentials → Create Credentials → OAuth client ID** → Web application.
   - Authorized redirect URI: `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
4. Salin Client ID & Client Secret → tempel di **Supabase → Authentication → Providers → Google** → Enable. (Tidak perlu masuk `.env`.)

## 4. Google Gemini API — LLM + embedding
1. https://aistudio.google.com/apikey → **Create API key**.
2. → `GOOGLE_GENERATIVE_AI_API_KEY`

## 5. OpenRouter — LLM (model gratis)
1. https://openrouter.ai → Sign in → https://openrouter.ai/settings/keys → **Create Key** (credit limit boleh 0).
2. → `OPENROUTER_API_KEY`

## 6. Groq — LLM cepat (fallback)
1. https://console.groq.com/keys → **Create API Key**.
2. → `GROQ_API_KEY`

## 7. Tavily — Riset Web
1. https://app.tavily.com → Sign up → salin API key di dashboard (1.000 kredit/bulan gratis).
2. → `TAVILY_API_KEY`

## 8. Upstash Redis — rate limit & kuota
1. https://console.upstash.com → **Create Database** (Redis, region Singapore, free).
2. Tab **REST API**: salin `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`.

## 9. Resend — email
1. https://resend.com → Sign up → https://resend.com/api-keys → **Create API Key** (Sending access).
2. → `RESEND_API_KEY`. Selama belum punya domain, `EMAIL_FROM` pakai `onboarding@resend.dev` (hanya bisa kirim ke email akun Resend kamu sendiri).
3. (Opsional nanti) **Domains → Add domain** kalau sudah punya domain sendiri.

## 10. PostHog — analytics
1. https://us.posthog.com/signup (atau eu.posthog.com) → buat project.
2. **Project Settings** → `Project API Key` → `NEXT_PUBLIC_POSTHOG_KEY`; host → `NEXT_PUBLIC_POSTHOG_HOST`.

## 11. Sentry — error tracking
1. https://sentry.io/signup → buat project platform **Next.js**.
2. **Project Settings → Client Keys (DSN)** → `NEXT_PUBLIC_SENTRY_DSN`.
3. Organization slug → `SENTRY_ORG`, project slug → `SENTRY_PROJECT`.
4. **Settings → Auth Tokens** (organization token) → `SENTRY_AUTH_TOKEN` (untuk upload source map).

## 12. Vercel — hosting
1. https://vercel.com/signup → login dengan GitHub (plan **Hobby**, gratis).
2. **Add New → Project → Import** `perdanabintangr-creator/markethink`. Framework: Next.js. Biarkan default.
3. Isi semua Environment Variables di atas (Production + Preview).
4. Setelah ini setiap push ke GitHub otomatis ter-deploy (preview untuk branch, production untuk `main`). CTO tidak butuh token Vercel.
5. Salin URL production → isi `NEXT_PUBLIC_APP_URL` dan Site URL di Supabase (langkah 2.6).

## 13. App
- `ADMIN_EMAILS` = email kamu (mis. `perdanabintangr@gmail.com`) → otomatis jadi admin.
- Kuota kredit harian (default 50/user) diatur dari dashboard admin → Paket & kredit, tidak perlu env.

## 14. Akses jaringan environment Claude Code
Environment cloud sesi ini saat ini **memblokir** host API eksternal (hanya npm yang lolos).
Supaya CTO bisa menjalankan migrasi & test end-to-end, buka menu environment di title bar sesi → **Edit → Network access**, lalu pilih akses lebih luas atau tambahkan Allowed domains:

```
*.supabase.co
*.supabase.com
api.supabase.com
openrouter.ai
generativelanguage.googleapis.com
api.groq.com
api.tavily.com
*.upstash.io
api.resend.com
```

Panduan: https://code.claude.com/docs/en/cloud-environments#network-access

Setelah env + network diisi, **mulai sesi baru** (environment variable dibaca saat sesi start) dan bilang "lanjut".
