# Branding — Marqthink

Nama brand disimpan di **`src/lib/brand.ts`** (`BRAND`, `BRAND_WORDMARK`, `BRAND_SLUG`; salinan di `backoffice/src/lib/brand.ts`).

## Ganti nama brand lagi (kode)
1. `node scripts/rename-brand.mjs <NamaLama> <NamaBaru>` — mengganti teks UI, email, prompt AI, PPT/Excel, nama file unduhan, back office, tes.
2. Buat migrasi data untuk teks di database (contoh: `supabase/migrations/20261031000051_rebrand_marqthink.sql`), lalu `npm run db:bundle`.
3. `npm run check` → `npm run build` → commit → push.

Yang sengaja **tidak** diubah (nama teknis, bukan tampilan): nama package, `supabase/config.toml`, env `MARKETHINK_APP_URL` (back office), salt OAuth, setting DB `markethink.actor`, awalan nomor order `MTK-`, kunci `localStorage` `mt_*`, migrasi lama.

## Langkah di luar kode (founder)
| Tempat | Yang diubah |
|---|---|
| Vercel → project aplikasi → Settings → Domains | Tambah domain baru (mis. `marqthink.vercel.app` bila tersedia, atau domain sendiri). Domain lama tetap aktif. |
| Vercel → Environment Variables | `NEXT_PUBLIC_APP_URL` = alamat baru; `EMAIL_FROM` = `Marqthink <noreply@domain>` setelah domain diverifikasi di Resend. Back office: `MARKETHINK_APP_URL` = alamat baru. Redeploy. |
| Supabase → Authentication → URL Configuration | Site URL = alamat baru; tambah `https://<alamat-baru>/**` di Redirect URLs (alamat lama biarkan dulu). |
| Google Cloud → OAuth consent screen | Nama aplikasi "Marqthink" (+ logo bila ada). |
| Canva Developer Portal | Nama integrasi "Marqthink"; tambah redirect URL `https://<alamat-baru>/api/connectors/canva/callback`. |
| Mayar / Midtrans / Duitku | Nama merchant "Marqthink"; webhook/notification URL ke alamat baru (`/api/webhooks/mayar`, `/api/webhooks/midtrans`, `/api/webhooks/duitku`). |
| Legal | Cek merek "Marqthink" di PDKI (kelas 9 & 42) dan ketersediaan domain sebelum promosi besar. |
