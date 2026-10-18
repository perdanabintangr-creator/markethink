-- Add-on Tools Pro dijual lagi (founder 18 Okt): untuk user yang paketnya belum membuka Tools Pro (mis. Free).
-- Hasil dari add-on dicatat source 'addon' (terpisah dari pemakaian kredit paket = 'paid').
-- Harga promo (harga coret) per add-on, sama seperti paket.
alter table public.tool_runs drop constraint if exists tool_runs_source_check;
alter table public.tool_runs add constraint tool_runs_source_check check (source in ('paid', 'promax', 'trial', 'admin', 'addon'));

alter table public.addons
  add column if not exists promo_price_idr integer check (promo_price_idr is null or promo_price_idr > 0),
  add column if not exists promo_label text,
  add column if not exists promo_until timestamptz;

create index if not exists addon_subscriptions_active_idx on public.addon_subscriptions (user_id, addon_id, period_start, period_end) where refunded_at is null;
