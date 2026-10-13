-- Laporan back office ikut menghitung penjualan add-on; biaya AI tools tampil di rincian biaya.

-- Semua penjualan (paket + add-on) dalam satu bentuk, tanpa akun internal.
create or replace view public.bo_all_sales with (security_invoker = true) as
  select s.user_id, s.paid_at, s.amount_idr, s.kind, 'plan'::text as source, s.plan_id as item
    from subscriptions s
   where s.refunded_at is null
  union all
  select a.user_id, a.paid_at, a.amount_idr, 'addon'::text, 'addon'::text, a.addon_id
    from addon_subscriptions a
   where a.refunded_at is null;
revoke all on public.bo_all_sales from public, anon, authenticated;
grant select on public.bo_all_sales to service_role;

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
  all_sales as (select x.* from bo_all_sales x join cust c on c.id = x.user_id),
  addon_active as (
    select a.amount_idr, a.months from addon_subscriptions a join cust c on c.id = a.user_id
     where a.refunded_at is null and a.period_start <= now() and a.period_end > now()
  ),
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
      where status in ('active', 'trialing') and current_period_start <= now() and current_period_end > now())
      + (select coalesce(sum(amount_idr::numeric / months), 0) from addon_active),
    (select coalesce(sum(amount_idr), 0) from all_sales, m where paid_at >= m.this_month),
    (select coalesce(sum(amount_idr), 0) from all_sales, m where paid_at >= m.last_month and paid_at < m.this_month),
    (select coalesce(sum(amount_idr), 0) from all_sales),
    (select count(*) from all_sales, m where paid_at >= m.this_month),
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
    select date_trunc('month', x.paid_at at time zone 'Asia/Jakarta')::date as month, x.kind, x.amount_idr
    from bo_all_sales x join cust c on c.id = x.user_id
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

-- Ringkasan per add-on: pelanggan aktif, pendapatan bulan ini, pemakaian bulan ini, biaya AI bulan ini.
create or replace function public.bo_addon_summary()
returns table (addon_id text, name text, price_idr integer, active_users bigint, revenue_this_month bigint, runs_this_month bigint, cost_usd_this_month numeric)
language sql
stable
security definer
set search_path = public
as $$
  with m as (select (date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta') as t)
  select
    a.id,
    a.name,
    a.price_idr,
    (select count(distinct s.user_id) from addon_subscriptions s
      where s.addon_id = a.id and s.refunded_at is null and s.period_start <= now() and s.period_end > now()),
    (select coalesce(sum(s.amount_idr), 0) from addon_subscriptions s, m where s.addon_id = a.id and s.refunded_at is null and s.paid_at >= m.t),
    (select count(*) from tool_runs r, m where r.addon_id = a.id and r.status = 'ok' and r.created_at >= m.t),
    (select coalesce(sum(r.cost_usd), 0) from tool_runs r, m where r.addon_id = a.id and r.created_at >= m.t)
  from addons a
  order by a.sort_order;
$$;

create or replace function public.admin_cost_breakdown(p_days integer default 30)
returns table (category text, events bigint, cost_usd numeric)
language sql
stable
security definer
set search_path = public
as $$
  with u as (
    select * from usage_logs where created_at >= now() - make_interval(days => p_days)
  )
  select category, events, cost_usd from (
    select ('chat:' || tier) as category, count(*) filter (where status = 'ok') as events,
           coalesce(sum(est_cost_usd - coalesce(web_searches, 0) * 0.01), 0) as cost_usd
    from u where tier in ('junior','senior','associate','director') group by tier
    union all
    select 'web_search', coalesce(sum(web_searches), 0), coalesce(sum(web_searches), 0) * 0.01
    from u where coalesce(web_searches, 0) > 0
    union all
    select tier, count(*) filter (where status = 'ok'), coalesce(sum(est_cost_usd), 0)
    from u where tier in ('image','deck_image','pptx') or tier like 'tool:%' group by tier
  ) x
  where events > 0 or cost_usd > 0
  order by cost_usd desc;
$$;

revoke all on function public.bo_addon_summary() from public, anon, authenticated;
grant execute on function public.bo_addon_summary() to service_role;

-- Total bayar per pelanggan ikut menghitung add-on.
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
  with until as (
    select user_id, max(current_period_end) filter (where status in ('active', 'trialing')) as active_until
    from subscriptions
    group by user_id
  ),
  pay as (
    select user_id, min(paid_at) as first_paid_at, coalesce(sum(amount_idr), 0) as total_paid, count(*) as payments
    from bo_all_sales
    group by user_id
  ),
  base as (
    select
      p.id, p.email, p.full_name, p.role, (p.role <> 'user' or b.user_id is not null) as internal, p.plan_id, p.banned, p.created_at, p.plan_started_at, p.last_active_at,
      y.first_paid_at, u.active_until, coalesce(y.total_paid, 0)::bigint as total_paid, coalesce(y.payments, 0)::bigint as payments
    from profiles p
    left join until u on u.user_id = p.id
    left join pay y on y.user_id = p.id
    left join backoffice_members b on b.user_id = p.id
    where (coalesce(p_search, '') = '' or p.email ilike '%' || p_search || '%' or p.full_name ilike '%' || p_search || '%')
      and (coalesce(p_plan, '') = '' or p.plan_id = p_plan)
      and case coalesce(p_status, 'all')
        when 'paying' then b.user_id is null and p.role = 'user' and p.plan_id <> 'beta'
        when 'free' then b.user_id is null and p.role = 'user' and p.plan_id = 'beta'
        when 'expiring' then b.user_id is null and p.role = 'user' and p.plan_id <> 'beta' and u.active_until between now() and now() + interval '7 days'
        when 'overdue' then b.user_id is null and p.role = 'user' and p.plan_id <> 'beta' and u.active_until < now()
        when 'no_record' then b.user_id is null and p.role = 'user' and p.plan_id <> 'beta' and u.active_until is null
        when 'churned' then b.user_id is null and p.role = 'user' and p.plan_id = 'beta' and y.payments > 0
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
