-- Akses beta tertutup: hanya user dengan beta_access (atau admin) yang bisa memakai app
-- selama access_mode = 'invite_only'. Admin bisa mengubahnya dari /admin/quota.
alter table public.profiles add column if not exists beta_access boolean not null default false;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy "settings readable" on public.app_settings for select to authenticated using (true);

insert into public.app_settings (key, value) values ('access_mode', '"invite_only"')
on conflict (key) do nothing;
