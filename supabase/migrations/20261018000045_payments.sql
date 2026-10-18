-- Pembayaran otomatis lewat Midtrans (Snap: QRIS, VA, e-wallet). Bayar sukses → paket/add-on/bundel aktif otomatis
-- lewat fungsi pencatatan yang sama dengan back office (bo_record_sale / bo_record_addon_sale).
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('plan', 'addon', 'bundle')),
  item_id text not null,
  item_name text,
  months integer not null default 1 check (months between 1 and 12),
  amount_idr integer not null check (amount_idr > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired', 'canceled')),
  provider text not null default 'midtrans',
  payment_type text,
  redirect_url text,
  raw jsonb,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  fulfill_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
alter table public.payments enable row level security;
create policy "own payments" on public.payments for select using (user_id = auth.uid());
