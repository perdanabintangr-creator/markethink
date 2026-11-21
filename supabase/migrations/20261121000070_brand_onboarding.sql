-- Brand Onboarding (ACC founder 21 Nov): profil di workspaces.brand_kit (key baru), aset brand, Brand DNA bervesi,
-- gate Autopilot sampai DNA di-ACC, jejak versi DNA per konten.
alter table public.workspaces add column if not exists onboarding_status text not null default 'draft'
  check (onboarding_status in ('draft', 'researching', 'review', 'approved'));
alter table public.workspaces add column if not exists brand_dna_version integer;

create table if not exists public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('logo', 'real_photo', 'feed_screenshot', 'competitor_screenshot', 'reference_screenshot')),
  storage_path text not null,
  caption text,
  analysis jsonb,
  product_id uuid references public.brand_products(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists brand_assets_ws_idx on public.brand_assets (workspace_id, kind);
alter table public.brand_assets enable row level security;
drop policy if exists "own brand assets" on public.brand_assets;
create policy "own brand assets" on public.brand_assets for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.brand_assets from anon, authenticated;

create table if not exists public.brand_dna_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  version integer not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'superseded')),
  dna jsonb not null,
  research_id uuid references public.brand_research(id) on delete set null,
  kit_snapshot jsonb,
  cost_usd numeric(10, 4) not null default 0,
  edited_by_user boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, version)
);
create index if not exists brand_dna_ws_idx on public.brand_dna_versions (workspace_id, version desc);
alter table public.brand_dna_versions enable row level security;
drop policy if exists "own brand dna" on public.brand_dna_versions;
create policy "own brand dna" on public.brand_dna_versions for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.brand_dna_versions from anon, authenticated;

alter table public.social_posts add column if not exists brand_dna_version integer;
