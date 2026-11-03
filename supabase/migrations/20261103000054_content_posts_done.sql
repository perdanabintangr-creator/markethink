-- Tanda "sudah diposting" per posting di Kalender konten (per user).
create table if not exists public.content_posts_done (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_key text not null check (char_length(post_key) between 3 and 200),
  posted_at timestamptz not null default now(),
  primary key (user_id, post_key)
);
alter table public.content_posts_done enable row level security;
drop policy if exists "own posted marks" on public.content_posts_done;
create policy "own posted marks" on public.content_posts_done for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.content_posts_done to authenticated;
