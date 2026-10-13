-- Add-on berbayar (Tools Pro): Jualan Online Kit, Dokter Iklan, Riset Pasar Pro.
-- Harga & kuota bisa diubah owner di back office. Pembelian dicatat tim (manual) sampai payment gateway aktif.
-- Kuota: pembelian aktif = monthly_quota per periode; Promax = promax_quota per bulan kalender WIB; semua user = trial_quota seumur akun.

create table if not exists public.addons (
  id text primary key,
  name text not null,
  tagline text,
  price_idr integer not null default 0 check (price_idr >= 0),
  monthly_quota integer not null default 0 check (monthly_quota >= 0),
  promax_quota integer not null default 0 check (promax_quota >= 0),
  trial_quota integer not null default 0 check (trial_quota >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.addons enable row level security;

insert into public.addons (id, name, tagline, price_idr, monthly_quota, promax_quota, trial_quota, sort_order) values
  ('jualan_kit', 'Jualan Online Kit', 'Listing marketplace, skrip live selling & template WhatsApp', 30000, 15, 3, 1, 1),
  ('dokter_iklan', 'Dokter Iklan', 'Rapor laporan iklan + rekomendasi budget + kalkulator', 50000, 10, 3, 1, 2),
  ('riset_pro', 'Riset Pasar Pro', 'Riset kompetitor & brief KOL/affiliate', 50000, 6, 3, 1, 3)
on conflict (id) do nothing;

-- Pembelian add-on (per periode, default 1 bulan).
create table if not exists public.addon_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  addon_id text not null references public.addons(id),
  period_start timestamptz not null default now(),
  period_end timestamptz not null,
  months integer not null default 1 check (months between 1 and 36),
  amount_idr integer not null default 0 check (amount_idr >= 0),
  payment_method text,
  note text,
  bo_created_by uuid references public.backoffice_users(id) on delete set null,
  paid_at timestamptz not null default now(),
  refunded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists addon_subscriptions_user_idx on public.addon_subscriptions (user_id, addon_id, period_end desc);
create index if not exists addon_subscriptions_paid_idx on public.addon_subscriptions (paid_at);
alter table public.addon_subscriptions enable row level security;
create policy "own addon subscriptions" on public.addon_subscriptions for select using (user_id = auth.uid());

-- Riwayat pemakaian tools (input, hasil terstruktur, file unduhan).
create table if not exists public.tool_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  addon_id text not null references public.addons(id),
  tool text not null,
  source text not null check (source in ('paid', 'promax', 'trial', 'admin')),
  status text not null default 'running' check (status in ('running', 'ok', 'error')),
  title text,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  files jsonb not null default '[]'::jsonb,
  error text,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists tool_runs_user_idx on public.tool_runs (user_id, created_at desc);
create index if not exists tool_runs_quota_idx on public.tool_runs (user_id, addon_id, source, created_at);
alter table public.tool_runs enable row level security;
create policy "own tool runs" on public.tool_runs for select using (user_id = auth.uid());

-- Catat penjualan add-on dari back office: perpanjangan menyambung dari periode aktif terakhir.
create or replace function public.bo_record_addon_sale(
  p_user uuid,
  p_addon text,
  p_months integer,
  p_amount integer,
  p_method text,
  p_note text,
  p_actor uuid,
  p_paid_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_id uuid;
begin
  if not exists (select 1 from addons where id = p_addon) then raise exception 'invalid_addon'; end if;
  if not exists (select 1 from profiles where id = p_user) then raise exception 'user_not_found'; end if;
  select greatest(now(), coalesce(max(period_end), now())) into v_start
    from addon_subscriptions
   where user_id = p_user and addon_id = p_addon and refunded_at is null and period_end > now();
  insert into addon_subscriptions (user_id, addon_id, period_start, period_end, months, amount_idr, payment_method, note, bo_created_by, paid_at)
  values (p_user, p_addon, v_start, v_start + make_interval(months => p_months), p_months, p_amount,
          nullif(trim(p_method), ''), nullif(trim(p_note), ''), p_actor, coalesce(p_paid_at, now()))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.bo_record_addon_sale(uuid, text, integer, integer, text, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.bo_record_addon_sale(uuid, text, integer, integer, text, text, uuid, timestamptz) to service_role;
