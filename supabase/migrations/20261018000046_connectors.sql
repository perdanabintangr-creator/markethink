-- Aplikasi terhubung (mulai dari Canva): user menghubungkan akun Canva-nya sendiri lewat OAuth (PKCE),
-- lalu hasil Markethink (PPT, carousel/poster, gambar AI) bisa dikirim ke Canva sebagai desain yang bisa diedit.
-- Token HANYA dibaca/ditulis server (service role). Sengaja tanpa policy: user biasa tidak bisa membaca token lewat API publik.
-- State OAuth + code_verifier disimpan di cookie httpOnly bertanda tangan (umur 10 menit), bukan di tabel.

create table if not exists public.user_connectors (
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('canva')),
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  account_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.user_connectors enable row level security;
-- Tidak ada policy select/insert/update/delete untuk anon/authenticated: akses hanya lewat service role.
revoke all on public.user_connectors from anon, authenticated;
