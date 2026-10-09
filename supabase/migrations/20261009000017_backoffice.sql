-- Back office Markethink (/backoffice): database pelanggan, riwayat paket, pencatatan penjualan, dan laporan sales.
-- Semua fungsi security definer & hanya bisa dieksekusi service_role (dipanggil dari server back office).
-- Bulan & hari dihitung dalam WIB (Asia/Jakarta). Nominal dalam Rupiah.

-- 1) Anggota tim back office (selain admin). Admin aplikasi otomatis punya akses.
create table if not exists public.backoffice_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.backoffice_members enable row level security;

-- 2) Sejak kapan user berada di paketnya sekarang.
alter table public.profiles add column if not exists plan_started_at timestamptz;
update public.profiles set plan_started_at = created_at where plan_started_at is null;
alter table public.profiles alter column plan_started_at set default now();

-- 3) Riwayat perubahan paket (otomatis lewat trigger, dari jalur mana pun).
create table if not exists public.plan_changes (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  from_plan text,
  to_plan text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists plan_changes_user_idx on public.plan_changes (user_id, created_at desc);
create index if not exists plan_changes_created_idx on public.plan_changes (created_at);
alter table public.plan_changes enable row level security;

create or replace function public.track_plan_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan_id is distinct from old.plan_id then
    new.plan_started_at := now();
    insert into plan_changes (user_id, from_plan, to_plan, changed_by, note)
    values (
      new.id,
      old.plan_id,
      new.plan_id,
      nullif(current_setting('markethink.actor', true), '')::uuid,
      nullif(current_setting('markethink.note', true), '')
    );
  end if;
  return new;
end;
$$;

create or replace trigger profiles_plan_change
  before update of plan_id on public.profiles
  for each row execute function public.track_plan_change();

-- 4) Subscriptions dipakai sebagai catatan penjualan (manual sekarang, payment gateway nanti).
-- Penjualan yang dibatalkan/refund ditandai refunded_at (status 'canceled') dan tidak dihitung sebagai pendapatan.
alter table public.subscriptions
  add column if not exists amount_idr integer not null default 0 check (amount_idr >= 0),
  add column if not exists months integer not null default 1 check (months between 1 and 36),
  add column if not exists kind text not null default 'new' check (kind in ('new', 'renewal', 'upgrade', 'downgrade')),
  add column if not exists payment_method text,
  add column if not exists note text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists paid_at timestamptz not null default now(),
  add column if not exists refunded_at timestamptz;
create index if not exists subscriptions_paid_at_idx on public.subscriptions (paid_at);

-- Ubah paket user + catat siapa yang mengubah. Turun ke Free = berhenti berlangganan.
create or replace function public.bo_change_plan(p_user uuid, p_plan text, p_actor uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from plans where id = p_plan) then raise exception 'invalid_plan'; end if;
  perform set_config('markethink.actor', coalesce(p_actor::text, ''), true);
  perform set_config('markethink.note', coalesce(p_note, ''), true);
  update profiles set plan_id = p_plan, updated_at = now() where id = p_user and plan_id <> p_plan;
  if p_plan = 'beta' then
    update subscriptions
       set status = 'canceled', current_period_end = least(current_period_end, greatest(current_period_start, now())), updated_at = now()
     where user_id = p_user and status in ('active', 'trialing') and current_period_end > now();
  end if;
end;
$$;

-- Catat penjualan: perpanjangan paket yang sama menyambung dari tanggal habis sebelumnya.
create or replace function public.bo_record_sale(
  p_user uuid,
  p_plan text,
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
  v_cur_plan text;
  v_prev_id uuid;
  v_prev_plan text;
  v_prev_end timestamptz;
  v_start timestamptz;
  v_kind text;
  v_id uuid;
begin
  if p_plan = 'beta' or not exists (select 1 from plans where id = p_plan) then raise exception 'invalid_plan'; end if;
  select plan_id into v_cur_plan from profiles where id = p_user for update;
  if not found then raise exception 'user_not_found'; end if;

  select id, plan_id, current_period_end into v_prev_id, v_prev_plan, v_prev_end
    from subscriptions
   where user_id = p_user and status in ('active', 'trialing') and current_period_end > now()
   order by current_period_end desc
   limit 1;

  if v_prev_id is null then
    v_start := now();
    v_kind := case when exists (select 1 from subscriptions where user_id = p_user and refunded_at is null) then 'renewal' else 'new' end;
  elsif v_prev_plan = p_plan then
    v_start := v_prev_end;
    v_kind := 'renewal';
  else
    -- Ganti paket: semua periode berjalan/antrean paket lama ditutup sekarang.
    update subscriptions
       set status = 'canceled', current_period_end = least(current_period_end, greatest(current_period_start, now())), updated_at = now()
     where user_id = p_user and status in ('active', 'trialing') and current_period_end > now();
    v_start := now();
    v_kind := case
      when (select sort_order from plans where id = p_plan) > (select sort_order from plans where id = v_prev_plan) then 'upgrade'
      else 'downgrade'
    end;
  end if;

  insert into subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end,
                             amount_idr, months, kind, payment_method, note, created_by, paid_at)
  values (p_user, p_plan, 'active', 'manual', v_start, v_start + make_interval(months => p_months),
          p_amount, p_months, v_kind, nullif(trim(p_method), ''), nullif(trim(p_note), ''), p_actor, coalesce(p_paid_at, now()))
  returning id into v_id;

  if v_cur_plan <> p_plan then
    perform set_config('markethink.actor', coalesce(p_actor::text, ''), true);
    perform set_config('markethink.note', 'Penjualan dicatat (' || v_kind || ')', true);
    update profiles set plan_id = p_plan, updated_at = now() where id = p_user;
  end if;
  return v_id;
end;
$$;

-- Ringkasan bisnis untuk halaman utama back office. "Pelanggan" = akun selain admin & anggota tim back office.
create or replace function public.bo_overview()
returns table (
  total_accounts bigint,
  internal_accounts bigint,
  customers bigint,
  free_users bigint,
  paying_users bigint,
  new_today bigint,
  new_7d bigint,
  new_this_month bigint,
  new_last_month bigint,
  active_30d bigint,
  mrr_idr numeric,
  revenue_this_month bigint,
  revenue_last_month bigint,
  revenue_total bigint,
  sales_this_month bigint,
  new_paid_this_month bigint,
  renewals_this_month bigint,
  upgrades_this_month bigint,
  churn_this_month bigint,
  expiring_7d bigint,
  overdue bigint,
  paid_without_record bigint,
  waitlist bigint,
  waitlist_this_month bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with
  m as (
    select
      (date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta') as this_month,
      ((date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month') at time zone 'Asia/Jakarta') as last_month
  ),
  cust as (select * from profiles p where p.role = 'user' and not exists (select 1 from backoffice_members b where b.user_id = p.id)),
  sales as (select s.* from subscriptions s join cust c on c.id = s.user_id where s.refunded_at is null),
  until as (
    select user_id, max(current_period_end) as until
    from subscriptions where status in ('active', 'trialing')
    group by user_id
  ),
  paying as (select c.id, u.until from cust c left join until u on u.user_id = c.id where c.plan_id <> 'beta')
  select
    (select count(*) from profiles),
    (select count(*) from profiles p where p.role <> 'user' or exists (select 1 from backoffice_members b where b.user_id = p.id)),
    (select count(*) from cust),
    (select count(*) from cust where plan_id = 'beta'),
    (select count(*) from paying),
    (select count(*) from cust where created_at >= credit_day_start()),
    (select count(*) from cust where created_at >= now() - interval '7 days'),
    (select count(*) from cust, m where created_at >= m.this_month),
    (select count(*) from cust, m where created_at >= m.last_month and created_at < m.this_month),
    (select count(*) from cust where last_active_at >= now() - interval '30 days'),
    (select coalesce(sum(amount_idr::numeric / months), 0) from sales
      where status in ('active', 'trialing') and current_period_start <= now() and current_period_end > now()),
    (select coalesce(sum(amount_idr), 0) from sales, m where paid_at >= m.this_month),
    (select coalesce(sum(amount_idr), 0) from sales, m where paid_at >= m.last_month and paid_at < m.this_month),
    (select coalesce(sum(amount_idr), 0) from sales),
    (select count(*) from sales, m where paid_at >= m.this_month),
    (select count(*) from sales, m where paid_at >= m.this_month and kind = 'new'),
    (select count(*) from sales, m where paid_at >= m.this_month and kind = 'renewal'),
    (select count(*) from sales, m where paid_at >= m.this_month and kind = 'upgrade'),
    (select count(*) from plan_changes pc join cust c on c.id = pc.user_id, m
      where pc.created_at >= m.this_month and pc.to_plan = 'beta' and pc.from_plan <> 'beta'),
    (select count(*) from paying where until between now() and now() + interval '7 days'),
    (select count(*) from paying where until < now()),
    (select count(*) from paying where until is null),
    (select count(*) from waitlist),
    (select count(*) from waitlist, m where created_at >= m.this_month);
$$;

-- Deret bulanan: pendaftar, pendapatan, jenis penjualan, berhenti langganan.
create or replace function public.bo_monthly(p_months integer default 12)
returns table (
  month date,
  signups bigint,
  revenue bigint,
  sales bigint,
  new_paid bigint,
  renewals bigint,
  upgrades bigint,
  churn bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with
  months as (
    select generate_series(
      date_trunc('month', now() at time zone 'Asia/Jakarta')::date - make_interval(months => p_months - 1),
      date_trunc('month', now() at time zone 'Asia/Jakarta')::date,
      interval '1 month'
    )::date as month
  ),
  cust as (select p.id, p.created_at from profiles p where p.role = 'user' and not exists (select 1 from backoffice_members b where b.user_id = p.id)),
  s as (
    select date_trunc('month', s.paid_at at time zone 'Asia/Jakarta')::date as month, s.kind, s.amount_idr
    from subscriptions s join cust c on c.id = s.user_id
    where s.refunded_at is null
  )
  select
    mo.month,
    (select count(*) from cust where date_trunc('month', created_at at time zone 'Asia/Jakarta')::date = mo.month),
    (select coalesce(sum(amount_idr), 0) from s where s.month = mo.month),
    (select count(*) from s where s.month = mo.month),
    (select count(*) from s where s.month = mo.month and kind = 'new'),
    (select count(*) from s where s.month = mo.month and kind = 'renewal'),
    (select count(*) from s where s.month = mo.month and kind = 'upgrade'),
    (select count(*) from plan_changes pc join cust c on c.id = pc.user_id
      where pc.to_plan = 'beta' and pc.from_plan <> 'beta'
        and date_trunc('month', pc.created_at at time zone 'Asia/Jakarta')::date = mo.month)
  from months mo
  order by mo.month;
$$;

-- Komposisi pelanggan & MRR per paket.
create or replace function public.bo_plan_mix()
returns table (plan_id text, plan_name text, monthly_price_idr integer, customers bigint, active_subs bigint, mrr_idr numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.monthly_price_idr,
    (select count(*) from profiles pr where pr.plan_id = p.id and pr.role = 'user' and not exists (select 1 from backoffice_members b where b.user_id = pr.id)),
    (select count(*) from subscriptions s join profiles pr on pr.id = s.user_id
      where s.plan_id = p.id and pr.role = 'user' and not exists (select 1 from backoffice_members b where b.user_id = pr.id) and s.status in ('active', 'trialing')
        and s.current_period_start <= now() and s.current_period_end > now()),
    (select coalesce(sum(s.amount_idr::numeric / s.months), 0) from subscriptions s join profiles pr on pr.id = s.user_id
      where s.plan_id = p.id and pr.role = 'user' and not exists (select 1 from backoffice_members b where b.user_id = pr.id) and s.status in ('active', 'trialing')
        and s.current_period_start <= now() and s.current_period_end > now())
  from plans p
  order by p.sort_order;
$$;

-- Daftar pelanggan dengan ringkasan langganan (cari, filter, urutkan, halaman).
create or replace function public.bo_customer_list(
  p_search text default null,
  p_plan text default null,
  p_status text default 'all',
  p_sort text default 'newest',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  internal boolean,
  plan_id text,
  banned boolean,
  created_at timestamptz,
  plan_started_at timestamptz,
  last_active_at timestamptz,
  first_paid_at timestamptz,
  active_until timestamptz,
  total_paid bigint,
  payments bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with agg as (
    select
      user_id,
      min(paid_at) filter (where refunded_at is null) as first_paid_at,
      max(current_period_end) filter (where status in ('active', 'trialing')) as active_until,
      coalesce(sum(amount_idr) filter (where refunded_at is null), 0) as total_paid,
      count(*) filter (where refunded_at is null) as payments
    from subscriptions
    group by user_id
  ),
  base as (
    select
      p.id, p.email, p.full_name, p.role, (p.role <> 'user' or b.user_id is not null) as internal, p.plan_id, p.banned, p.created_at, p.plan_started_at, p.last_active_at,
      a.first_paid_at, a.active_until, coalesce(a.total_paid, 0)::bigint as total_paid, coalesce(a.payments, 0)::bigint as payments
    from profiles p
    left join agg a on a.user_id = p.id
    left join backoffice_members b on b.user_id = p.id
    where (coalesce(p_search, '') = '' or p.email ilike '%' || p_search || '%' or p.full_name ilike '%' || p_search || '%')
      and (coalesce(p_plan, '') = '' or p.plan_id = p_plan)
      and case coalesce(p_status, 'all')
        when 'paying' then b.user_id is null and p.role = 'user' and p.plan_id <> 'beta'
        when 'free' then b.user_id is null and p.role = 'user' and p.plan_id = 'beta'
        when 'expiring' then b.user_id is null and p.role = 'user' and p.plan_id <> 'beta' and a.active_until between now() and now() + interval '7 days'
        when 'overdue' then b.user_id is null and p.role = 'user' and p.plan_id <> 'beta' and a.active_until < now()
        when 'no_record' then b.user_id is null and p.role = 'user' and p.plan_id <> 'beta' and a.active_until is null
        when 'churned' then b.user_id is null and p.role = 'user' and p.plan_id = 'beta' and a.payments > 0
        when 'internal' then (p.role <> 'user' or b.user_id is not null)
        else true
      end
  )
  select r.*, count(*) over () as total_count
  from base r
  order by
    case when p_sort = 'paid' then r.total_paid end desc nulls last,
    case when p_sort = 'active' then r.last_active_at end desc nulls last,
    case when p_sort = 'until' then r.active_until end asc nulls last,
    r.created_at desc
  limit greatest(1, least(p_limit, 500))
  offset greatest(0, p_offset);
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'track_plan_change()',
    'bo_change_plan(uuid, text, uuid, text)',
    'bo_record_sale(uuid, text, integer, integer, text, text, uuid, timestamptz)',
    'bo_overview()',
    'bo_monthly(integer)',
    'bo_plan_mix()',
    'bo_customer_list(text, text, text, text, integer, integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
