-- Autopilot belajar dari performa: statistik post Instagram pelanggan (30-60 hari terakhir), disinkron harian.
create table if not exists public.instagram_media_stats (
  user_id uuid not null references public.profiles(id) on delete cascade,
  ig_media_id text not null,
  post_id uuid references public.social_posts(id) on delete set null,
  posted_at timestamptz,
  media_type text,
  caption text,
  permalink text,
  likes integer not null default 0,
  comments integer not null default 0,
  reach integer not null default 0,
  saved integer not null default 0,
  shares integer not null default 0,
  views integer not null default 0,
  fetched_at timestamptz not null default now(),
  primary key (user_id, ig_media_id)
);
create index if not exists instagram_media_stats_user_time_idx on public.instagram_media_stats (user_id, posted_at desc);
alter table public.instagram_media_stats enable row level security;
drop policy if exists "own ig stats" on public.instagram_media_stats;
create policy "own ig stats" on public.instagram_media_stats for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.instagram_media_stats from anon, authenticated;
alter table public.instagram_accounts add column if not exists insights_synced_at timestamptz;
