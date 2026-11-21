-- Riset brand otomatis: telusur web + gambar + IG → profil bisnis, produk & KV (warna, mood, gaya visual).
create table if not exists public.brand_research (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  data jsonb not null,
  sources jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists brand_research_ws_idx on public.brand_research (user_id, workspace_id, created_at desc);
alter table public.brand_research enable row level security;
drop policy if exists "own brand research" on public.brand_research;
create policy "own brand research" on public.brand_research for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.brand_research from anon, authenticated;
