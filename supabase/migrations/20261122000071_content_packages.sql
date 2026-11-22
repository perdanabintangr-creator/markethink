-- Paket Autopilot Konten (ACC founder 22 Nov 2026): Autopilot + Kalender Konten dijual terpisah dari paket Pro/Promax,
-- bisa dibeli semua user (termasuk Free). Bundel Pro + Konten Pro. Paket berbayar otomatis kembali ke Free setelah habis.

create table if not exists public.content_plans (
  id text primary key,
  name text not null,
  tagline text,
  price_idr integer not null check (price_idr >= 0),
  promo_price_idr integer,
  promo_label text,
  promo_until timestamptz,
  posts_per_week integer not null,
  posts_per_month integer not null,
  inner_visuals integer not null default 2,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.content_plans (id, name, tagline, price_idr, posts_per_week, posts_per_month, inner_visuals, sort_order) values
  ('konten_lite', 'Konten Lite', '3 konten/minggu untuk brand yang baru mulai rutin', 149000, 3, 12, 2, 1),
  ('konten_pro', 'Konten Pro', '5 konten/minggu: feed aktif tiap hari kerja', 249000, 5, 20, 2, 2),
  ('konten_bisnis', 'Konten Bisnis', '10 konten/minggu dengan visual lebih banyak per carousel', 499000, 10, 40, 4, 3)
on conflict (id) do nothing;

create table if not exists public.content_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_plan_id text not null references public.content_plans(id),
  period_start timestamptz not null default now(),
  period_end timestamptz not null,
  months integer not null default 1,
  amount_idr integer not null default 0,
  payment_method text,
  note text,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists content_subscriptions_user_idx on public.content_subscriptions (user_id, period_end desc);

-- Bundel paket Marqthink + paket konten (harga satu tagihan, dibagi proporsional saat dicatat).
create table if not exists public.combo_offers (
  id text primary key,
  name text not null,
  plan_id text not null references public.plans(id),
  content_plan_id text not null references public.content_plans(id),
  price_idr integer not null check (price_idr > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
insert into public.combo_offers (id, name, plan_id, content_plan_id, price_idr, sort_order) values
  ('combo_pro_konten', 'Bundel Pro + Konten Pro', 'pro', 'konten_pro', 399000, 1)
on conflict (id) do nothing;

alter table public.content_plans enable row level security;
alter table public.content_subscriptions enable row level security;
alter table public.combo_offers enable row level security;

create policy content_plans_read on public.content_plans for select to anon, authenticated using (true);
create policy combo_offers_read on public.combo_offers for select to anon, authenticated using (true);
create policy content_subscriptions_own on public.content_subscriptions for select to authenticated using (user_id = (select auth.uid()));

revoke insert, update, delete on public.content_plans, public.content_subscriptions, public.combo_offers from anon, authenticated;

-- Catat penjualan paket konten. Paket sama → diperpanjang dari akhir periode berjalan; paket beda → periode lama ditutup sekarang.
create or replace function public.content_record_sale(
  p_user uuid,
  p_plan text,
  p_months integer,
  p_amount integer,
  p_method text,
  p_note text,
  p_paid_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev_plan text;
  v_prev_end timestamptz;
  v_start timestamptz;
  v_id uuid;
begin
  if not exists (select 1 from content_plans where id = p_plan) then raise exception 'invalid_content_plan'; end if;
  if not exists (select 1 from profiles where id = p_user) then raise exception 'user_not_found'; end if;
  perform 1 from profiles where id = p_user for update;

  select content_plan_id, period_end into v_prev_plan, v_prev_end
    from content_subscriptions
   where user_id = p_user and refunded_at is null and period_end > now()
   order by period_end desc
   limit 1;

  if v_prev_plan is null then
    v_start := now();
  elsif v_prev_plan = p_plan then
    v_start := v_prev_end;
  else
    update content_subscriptions
       set period_end = greatest(period_start, now())
     where user_id = p_user and refunded_at is null and period_end > now();
    v_start := now();
  end if;

  insert into content_subscriptions (user_id, content_plan_id, period_start, period_end, months, amount_idr, payment_method, note, paid_at)
  values (p_user, p_plan, v_start, v_start + make_interval(days => 30 * greatest(p_months, 1)), greatest(p_months, 1), p_amount,
          nullif(trim(p_method), ''), nullif(trim(p_note), ''), coalesce(p_paid_at, now()))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.content_record_sale(uuid, text, integer, integer, text, text, timestamptz) from public, anon, authenticated;

-- Paket berbayar yang masa aktifnya habis → kembali ke Free. Hanya paket yang berasal dari penjualan (langganan terakhir
-- sama dengan paket profil); paket yang diberikan manual oleh back office tanpa penjualan tidak disentuh. Admin dilewati.
create or replace function public.expire_paid_plans()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select p.id as user_id, p.plan_id
      from profiles p
     where p.plan_id <> 'beta'
       and coalesce(p.role, 'user') <> 'admin'
       and not exists (
         select 1 from subscriptions s
          where s.user_id = p.id and s.status in ('active', 'trialing') and s.current_period_end > now()
       )
       and (
         select s.plan_id from subscriptions s
          where s.user_id = p.id and s.refunded_at is null
          order by s.current_period_end desc nulls last
          limit 1
       ) = p.plan_id
  loop
    perform set_config('markethink.note', 'Masa aktif paket habis → Free', true);
    update profiles set plan_id = 'beta', updated_at = now() where id = r.user_id;
    update subscriptions set status = 'expired', updated_at = now()
     where user_id = r.user_id and status in ('active', 'trialing') and current_period_end <= now();
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.expire_paid_plans() from public, anon, authenticated;

-- Dijalankan tiap jam (menit ke-7).
select cron.unschedule('expire-paid-plans') where exists (select 1 from cron.job where jobname = 'expire-paid-plans');
select cron.schedule('expire-paid-plans', '7 * * * *', $cron$select public.expire_paid_plans();$cron$);
