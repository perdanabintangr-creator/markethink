-- Autopilot: tujuan + campuran pilar, tahap ide (strategist) terpisah dari penulisan, pemeriksaan tim senior.
alter table public.autopilot_settings add column if not exists goal text not null default 'balanced' check (goal in ('balanced', 'awareness', 'engagement', 'sales', 'custom'));
alter table public.autopilot_settings add column if not exists pillar_mix jsonb;
alter table public.autopilot_settings add column if not exists review_ideas boolean not null default false;

create table if not exists public.autopilot_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  batch_id uuid not null,
  post_date date not null,
  post_time time not null,
  kind text not null check (kind in ('carousel', 'image', 'reel')),
  pillar text,
  funnel text,
  product_id uuid references public.brand_products(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  angle text,
  hook text,
  reason text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'written', 'dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists autopilot_ideas_user_idx on public.autopilot_ideas (user_id, status, post_date);
alter table public.autopilot_ideas enable row level security;
drop policy if exists "own autopilot ideas" on public.autopilot_ideas;
create policy "own autopilot ideas" on public.autopilot_ideas for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.autopilot_ideas from anon, authenticated;

alter table public.social_posts add column if not exists team_review jsonb;
