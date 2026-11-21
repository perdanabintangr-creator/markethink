-- Autopilot: katalog produk (SKU) pelanggan — konten bergiliran per produk, visual memakai foto produk asli.
create table if not exists public.brand_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  sku text check (sku is null or char_length(sku) <= 60),
  price text check (price is null or char_length(price) <= 60),
  description text check (description is null or char_length(description) <= 600),
  photo_paths text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists brand_products_user_idx on public.brand_products (user_id, created_at desc);
alter table public.brand_products enable row level security;
drop policy if exists "own brand products" on public.brand_products;
create policy "own brand products" on public.brand_products for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.brand_products from anon, authenticated;
alter table public.social_posts add column if not exists product_id uuid references public.brand_products(id) on delete set null;
