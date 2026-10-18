-- Harga promo (harga coret) per paket, diatur owner di back office → Harga paket.
-- Aktif bila promo_price_idr diisi, lebih murah dari harga normal, dan (promo_until kosong atau belum lewat).
alter table public.plans
  add column if not exists promo_price_idr integer check (promo_price_idr is null or promo_price_idr >= 0),
  add column if not exists promo_label text,
  add column if not exists promo_until timestamptz;
