-- Hubungkan Instagram + posting otomatis Autopilot (Instagram API with Instagram Login).
-- Token akses disimpan TERENKRIPSI (AES-256-GCM di server) dan tabel hanya bisa diakses service role.

create table if not exists public.instagram_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  ig_user_id text not null,
  username text,
  account_type text,
  picture_url text,
  token_enc text not null,
  token_expires_at timestamptz not null,
  scope text,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists instagram_accounts_ig_user_idx on public.instagram_accounts (ig_user_id);
alter table public.instagram_accounts enable row level security;
revoke all on public.instagram_accounts from anon, authenticated;

alter table public.autopilot_settings add column if not exists auto_publish boolean not null default false;
alter table public.social_posts add column if not exists permalink text;
alter table public.social_posts add column if not exists publish_started_at timestamptz;
alter table public.social_posts add column if not exists publish_attempts integer not null default 0;
create index if not exists social_posts_publish_due_idx on public.social_posts (post_date, post_time) where status = 'approved';

-- Rahasia pemicu posting dibuat acak DI DATABASE (tidak pernah keluar ke chat/Git); server membacanya lewat RPC
-- khusus service role untuk mencocokkan header dari pg_cron.
create extension if not exists pg_net;
create extension if not exists pg_cron;
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'autopilot_publish_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'autopilot_publish_secret');
  end if;
end $$;

create or replace function public.autopilot_publish_secret()
returns text
language sql
security definer
set search_path = ''
as $$ select decrypted_secret from vault.decrypted_secrets where name = 'autopilot_publish_secret' limit 1 $$;
revoke all on function public.autopilot_publish_secret() from public, anon, authenticated;
grant execute on function public.autopilot_publish_secret() to service_role;

-- Tiap 5 menit: panggil endpoint posting (hanya bekerja bila ada konten ACC yang jatuh tempo).
select cron.schedule(
  'autopilot-publish',
  '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://marqthink.com/api/cron/publish',
       headers := jsonb_build_object('Content-Type', 'application/json', 'x-publish-secret', public.autopilot_publish_secret()),
       body := '{}'::jsonb,
       timeout_milliseconds := 5000
     ) $$
);
