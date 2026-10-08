-- Agregasi untuk admin dashboard (hanya service_role).

create or replace function public.admin_overview()
returns table (
  total_users bigint,
  new_users_7d bigint,
  dau bigint,
  wau bigint,
  messages_today bigint,
  errors_today bigint,
  waitlist bigint,
  banned_users bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from profiles),
    (select count(*) from profiles where created_at >= now() - interval '7 days'),
    (select count(distinct user_id) from usage_logs where created_at >= credit_day_start()),
    (select count(distinct user_id) from usage_logs where created_at >= now() - interval '7 days'),
    (select count(*) from usage_logs where created_at >= credit_day_start() and status = 'ok'),
    (select count(*) from usage_logs where created_at >= credit_day_start() and status <> 'ok'),
    (select count(*) from waitlist),
    (select count(*) from profiles where banned);
$$;

create or replace function public.admin_usage_by_tier(p_days integer default 30)
returns table (
  tier text,
  messages bigint,
  users bigint,
  input_tokens bigint,
  output_tokens bigint,
  credits bigint,
  est_cost_usd numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(tier, '-') as tier,
    count(*) filter (where status = 'ok'),
    count(distinct user_id),
    coalesce(sum(input_tokens), 0),
    coalesce(sum(output_tokens), 0),
    coalesce(sum(credits), 0),
    coalesce(sum(est_cost_usd), 0)
  from usage_logs
  where created_at >= now() - make_interval(days => p_days)
  group by 1
  order by 2 desc;
$$;

create or replace function public.admin_usage_by_model(p_days integer default 30)
returns table (provider text, model text, messages bigint, est_cost_usd numeric)
language sql
stable
security definer
set search_path = public
as $$
  select provider, model, count(*), coalesce(sum(est_cost_usd), 0)
  from usage_logs
  where created_at >= now() - make_interval(days => p_days) and status = 'ok'
  group by 1, 2
  order by 3 desc
  limit 20;
$$;

create or replace function public.admin_daily_activity(p_days integer default 14)
returns table (day date, active_users bigint, messages bigint)
language sql
stable
security definer
set search_path = public
as $$
  select (created_at at time zone 'Asia/Jakarta')::date as day, count(distinct user_id), count(*)
  from usage_logs
  where created_at >= now() - make_interval(days => p_days)
  group by 1
  order by 1;
$$;

revoke all on function public.admin_overview() from public, anon, authenticated;
revoke all on function public.admin_usage_by_tier(integer) from public, anon, authenticated;
revoke all on function public.admin_usage_by_model(integer) from public, anon, authenticated;
revoke all on function public.admin_daily_activity(integer) from public, anon, authenticated;
grant execute on function public.admin_overview() to service_role;
grant execute on function public.admin_usage_by_tier(integer) to service_role;
grant execute on function public.admin_usage_by_model(integer) to service_role;
grant execute on function public.admin_daily_activity(integer) to service_role;
