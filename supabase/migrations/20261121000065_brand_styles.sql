-- Autopilot: DNA Gaya (pustaka industri + analisis referensi pelanggan).
create table if not exists public.brand_styles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  source text not null default 'reference' check (source in ('reference', 'preset')),
  dna jsonb not null,
  reference_paths text[] not null default '{}',
  analysis text,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists brand_styles_user_idx on public.brand_styles (user_id, created_at desc);
alter table public.brand_styles enable row level security;
drop policy if exists "own brand styles" on public.brand_styles;
create policy "own brand styles" on public.brand_styles for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.brand_styles from anon, authenticated;

alter table public.social_posts add column if not exists style jsonb;
alter table public.autopilot_settings add column if not exists industry text;
alter table public.autopilot_settings add column if not exists style_preset text;
alter table public.autopilot_settings add column if not exists style_id uuid references public.brand_styles(id) on delete set null;
