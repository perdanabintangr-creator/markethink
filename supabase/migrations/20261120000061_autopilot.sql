-- Autopilot Konten (ACC founder 20 Nov 2026): tiap minggu/bulan AI menyiapkan konten Instagram (carousel, single image,
-- naskah Reel + caption) dengan desain premium sesuai Brand Kit; pelanggan cukup ACC. Paket Pro & Promax.
-- Posting otomatis ke Instagram menyusul setelah aplikasi Meta lolos verifikasi (status 'approved' = siap tayang).

create table if not exists public.autopilot_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  enabled boolean not null default false,
  cadence text not null default 'weekly' check (cadence in ('weekly', 'monthly')),
  posts_per_week integer not null default 7 check (posts_per_week between 3 and 14),
  slot_times text[] not null default array['12:00', '19:00'],
  focus text check (focus is null or char_length(focus) <= 600),
  generating_at timestamptz,
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.autopilot_settings enable row level security;
drop policy if exists "own autopilot settings" on public.autopilot_settings;
create policy "own autopilot settings" on public.autopilot_settings for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.autopilot_settings from anon, authenticated;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  batch_id uuid not null,
  platform text not null default 'instagram' check (platform in ('instagram')),
  post_date date not null,
  post_time time not null,
  kind text not null check (kind in ('carousel', 'image', 'reel')),
  title text not null check (char_length(title) between 1 and 160),
  pillar text,
  funnel text,
  slides jsonb not null default '[]'::jsonb,
  caption text not null default '',
  alt_text text,
  script text,
  note text,
  lint jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved', 'script_ok', 'rejected', 'posted', 'failed', 'manual')),
  media text[],
  reviewed_at timestamptz,
  posted_at timestamptz,
  ig_media_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists social_posts_user_date_idx on public.social_posts (user_id, post_date, post_time);
create index if not exists social_posts_status_idx on public.social_posts (status, post_date);
alter table public.social_posts enable row level security;
drop policy if exists "own social posts" on public.social_posts;
create policy "own social posts" on public.social_posts for select to authenticated using (user_id = auth.uid());
-- Semua perubahan lewat server (cek paket, render, statistik); user tidak menulis langsung.
revoke insert, update, delete on public.social_posts from anon, authenticated;
