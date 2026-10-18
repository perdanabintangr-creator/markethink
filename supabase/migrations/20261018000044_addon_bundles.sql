-- Smart Tools: add-on untuk SEMUA paket + bundel hemat + diskon member Pro/Promax 15% (founder 18 Okt).
-- Laba minimal 40%: modal AI per pembelian dibatasi 60% dari uang yang dibayar (lihat src/lib/addons/addon-quota.ts).

-- Bundel: beberapa add-on dalam satu pembelian, lebih murah dari eceran.
create table if not exists public.addon_bundles (
  id text primary key,
  name text not null,
  tagline text,
  addon_ids text[] not null,
  price_idr integer not null check (price_idr > 0),
  promo_price_idr integer check (promo_price_idr is null or promo_price_idr > 0),
  promo_label text,
  promo_until timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.addon_bundles enable row level security;
create policy "bundles readable" on public.addon_bundles for select using (true);

insert into public.addon_bundles (id, name, tagline, addon_ids, price_idr, sort_order) values
  ('bundle_umkm', 'Bundel UMKM', 'Jualan online, konten sosmed & CRM pelanggan dalam satu paket', array['jualan_kit', 'konten_pro', 'crm_pro'], 99000, 1),
  ('bundle_agency', 'Bundel Agency', 'Strategi, riset pasar, laporan klien & KOL/PR untuk agency', array['strategi_pro', 'riset_pro', 'laporan_pro', 'kolpr_pro'], 189000, 2)
on conflict (id) do nothing;

-- Pembelian add-on yang berasal dari bundel (untuk laporan).
alter table public.addon_subscriptions add column if not exists bundle_id text references public.addon_bundles(id);

-- Kuota hasil per bulan disesuaikan supaya modal AI (perkiraan per hasil) muat di 60% harga normal.
update public.addons set monthly_quota = 3, updated_at = now() where id in ('riset_pro', 'jualan_kit', 'crm_pro', 'kolpr_pro');
update public.addons set monthly_quota = 6, updated_at = now() where id in ('konten_pro', 'dokter_iklan', 'laporan_pro', 'strategi_pro');
