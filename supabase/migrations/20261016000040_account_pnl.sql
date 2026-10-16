-- Laba rugi per akun (back office): pendapatan yang sudah "terpakai" (diakui) dalam periode vs biaya AI nyata akun itu.
-- Pendapatan diakui proporsional terhadap masa aktif pembelian (paket & add-on), hanya sampai hari ini:
-- bayar Rp600rb untuk 3 bulan → diakui ±Rp200rb per bulan berjalan. Penjualan yang dibatalkan (refunded_at) tidak dihitung.
-- p_days null = sepanjang waktu.
create or replace function public.bo_account_pnl(p_days integer default 30)
returns table (
  id uuid,
  email text,
  full_name text,
  plan_id text,
  internal boolean,
  banned boolean,
  created_at timestamptz,
  last_active_at timestamptz,
  revenue_idr numeric,
  cost_usd numeric,
  events bigint,
  credits_spent bigint,
  month_limit integer,
  month_used integer,
  plan_credits integer,
  credit_override integer,
  bonus_credits bigint,
  plan_price_idr integer,
  active_until timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with win as (
    select case when p_days is null then '-infinity'::timestamptz else now() - make_interval(days => p_days) end as w0
  ),
  periods as (
    select s.user_id, s.amount_idr::numeric as amount,
           coalesce(s.current_period_start, s.paid_at) as p0,
           coalesce(s.current_period_end, s.paid_at + make_interval(months => s.months)) as p1
      from subscriptions s
     where s.refunded_at is null and s.amount_idr > 0
    union all
    select a.user_id, a.amount_idr::numeric, a.period_start, a.period_end
      from addon_subscriptions a
     where a.refunded_at is null and a.amount_idr > 0
  ),
  rev as (
    select p.user_id,
           sum(
             case
               when p.p1 <= p.p0 then case when p.p0 >= w.w0 and p.p0 <= now() then p.amount else 0 end
               else p.amount * greatest(0, extract(epoch from (least(p.p1, now()) - greatest(p.p0, w.w0))))
                    / extract(epoch from (p.p1 - p.p0))
             end
           ) as revenue_idr
      from periods p, win w
     group by p.user_id
  ),
  cost as (
    select u.user_id, coalesce(sum(u.est_cost_usd), 0) as cost_usd, count(*) as events
      from usage_logs u, win w
     where u.user_id is not null and u.created_at >= w.w0
     group by u.user_id
  ),
  cred as (
    select c.user_id,
           coalesce(-sum(c.delta) filter (where c.kind in ('spend', 'refund') and c.created_at >= w.w0), 0) as credits_spent,
           coalesce(sum(c.delta) filter (where c.delta > 0 and c.kind in ('grant', 'topup', 'adjust') and c.created_at >= credit_month_start()), 0) as bonus_credits
      from credit_ledger c, win w
     group by c.user_id
  ),
  until as (
    select s.user_id, max(s.current_period_end) filter (where s.status in ('active', 'trialing')) as active_until
      from subscriptions s
     group by s.user_id
  )
  select
    p.id, p.email, p.full_name, p.plan_id,
    (p.role <> 'user' or exists (select 1 from backoffice_members b where b.user_id = p.id)) as internal,
    p.banned, p.created_at, p.last_active_at,
    round(coalesce(r.revenue_idr, 0)) as revenue_idr,
    coalesce(c.cost_usd, 0) as cost_usd,
    coalesce(c.events, 0) as events,
    greatest(coalesce(k.credits_spent, 0), 0)::bigint as credits_spent,
    b.month_limit, b.used as month_used,
    pl.monthly_credits as plan_credits,
    p.monthly_credit_override as credit_override,
    coalesce(k.bonus_credits, 0)::bigint as bonus_credits,
    pl.monthly_price_idr as plan_price_idr,
    t.active_until
  from profiles p
  join plans pl on pl.id = p.plan_id
  left join rev r on r.user_id = p.id
  left join cost c on c.user_id = p.id
  left join cred k on k.user_id = p.id
  left join until t on t.user_id = p.id
  left join lateral get_credit_balance(p.id) b on true
  order by p.created_at desc
  limit 5000;
$$;

revoke all on function public.bo_account_pnl(integer) from public, anon, authenticated;
grant execute on function public.bo_account_pnl(integer) to service_role;
