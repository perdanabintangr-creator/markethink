-- Dashboard internal Markethink: agregasi untuk monitoring user, paket, biaya AI, funnel, dan fitur.
-- Semua fungsi security definer & hanya bisa dieksekusi service_role (dipanggil dari halaman /admin).
-- Hari dihitung dalam WIB (Asia/Jakarta). Biaya dalam USD (estimasi dari usage_logs.est_cost_usd).

create or replace function public.admin_kpis()
returns table (
  total_users bigint,
  new_today bigint,
  new_7d bigint,
  new_30d bigint,
  dau bigint,
  wau bigint,
  mau bigint,
  onboarded bigint,
  activated bigint,
  messages_today bigint,
  errors_today bigint,
  cost_today numeric,
  cost_7d numeric,
  cost_30d numeric,
  images_30d bigint,
  pptx_30d bigint,
  waitlist bigint,
  banned bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with chat_logs as (
    select * from usage_logs where tier in ('junior','senior','associate','director')
  )
  select
    (select count(*) from profiles),
    (select count(*) from profiles where created_at >= credit_day_start()),
    (select count(*) from profiles where created_at >= now() - interval '7 days'),
    (select count(*) from profiles where created_at >= now() - interval '30 days'),
    (select count(distinct user_id) from chat_logs where created_at >= credit_day_start() and status = 'ok'),
    (select count(distinct user_id) from chat_logs where created_at >= now() - interval '7 days' and status = 'ok'),
    (select count(distinct user_id) from chat_logs where created_at >= now() - interval '30 days' and status = 'ok'),
    (select count(*) from profiles where onboarded),
    (select count(distinct user_id) from chat_logs where status = 'ok'),
    (select count(*) from chat_logs where created_at >= credit_day_start() and status = 'ok'),
    (select count(*) from usage_logs where created_at >= credit_day_start() and status <> 'ok'),
    (select coalesce(sum(est_cost_usd), 0) from usage_logs where created_at >= credit_day_start()),
    (select coalesce(sum(est_cost_usd), 0) from usage_logs where created_at >= now() - interval '7 days'),
    (select coalesce(sum(est_cost_usd), 0) from usage_logs where created_at >= now() - interval '30 days'),
    (select count(*) from usage_logs where tier in ('image','deck_image') and status = 'ok' and created_at >= now() - interval '30 days'),
    (select count(*) from usage_logs where tier = 'pptx' and status = 'ok' and created_at >= now() - interval '30 days'),
    (select count(*) from waitlist),
    (select count(*) from profiles where banned);
$$;

-- Per paket: jumlah user, user aktif, pesan, biaya → untuk menilai harga & margin per paket.
create or replace function public.admin_plan_breakdown(p_days integer default 30)
returns table (
  plan_id text,
  plan_name text,
  monthly_price_idr integer,
  daily_credits integer,
  users bigint,
  active_users bigint,
  messages bigint,
  cost_usd numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.monthly_price_idr,
    p.daily_credits,
    (select count(*) from profiles pr where pr.plan_id = p.id),
    (select count(distinct u.user_id) from usage_logs u join profiles pr on pr.id = u.user_id
       where pr.plan_id = p.id and u.status = 'ok' and u.created_at >= now() - make_interval(days => p_days)),
    (select count(*) from usage_logs u join profiles pr on pr.id = u.user_id
       where pr.plan_id = p.id and u.status = 'ok' and u.tier in ('junior','senior','associate','director')
         and u.created_at >= now() - make_interval(days => p_days)),
    (select coalesce(sum(u.est_cost_usd), 0) from usage_logs u join profiles pr on pr.id = u.user_id
       where pr.plan_id = p.id and u.created_at >= now() - make_interval(days => p_days))
  from plans p
  order by p.sort_order;
$$;

-- Deret harian: pendaftar baru, user aktif, pesan, biaya, error.
create or replace function public.admin_daily_series(p_days integer default 30)
returns table (day date, signups bigint, active_users bigint, messages bigint, cost_usd numeric, errors bigint)
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select generate_series(
      ((now() at time zone 'Asia/Jakarta')::date - (p_days - 1)),
      (now() at time zone 'Asia/Jakarta')::date,
      interval '1 day'
    )::date as day
  ),
  u as (
    select (created_at at time zone 'Asia/Jakarta')::date as day, user_id, tier, status, est_cost_usd
    from usage_logs
    where created_at >= now() - make_interval(days => p_days + 1)
  ),
  s as (
    select (created_at at time zone 'Asia/Jakarta')::date as day, count(*) as n
    from profiles
    where created_at >= now() - make_interval(days => p_days + 1)
    group by 1
  )
  select
    d.day,
    coalesce((select n from s where s.day = d.day), 0),
    (select count(distinct user_id) from u where u.day = d.day and u.status = 'ok' and u.tier in ('junior','senior','associate','director')),
    (select count(*) from u where u.day = d.day and u.status = 'ok' and u.tier in ('junior','senior','associate','director')),
    (select coalesce(sum(est_cost_usd), 0) from u where u.day = d.day),
    (select count(*) from u where u.day = d.day and u.status <> 'ok')
  from days d
  order by d.day;
$$;

-- Rincian biaya per kategori: chat per otak, pencarian web, gambar, foto PPT.
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
    from u where tier in ('image','deck_image','pptx') group by tier
  ) x
  where events > 0 or cost_usd > 0
  order by cost_usd desc;
$$;

-- User dengan pemakaian/biaya terbesar (deteksi pemakai berat & penyalahgunaan).
create or replace function public.admin_top_users(p_days integer default 30, p_limit integer default 15)
returns table (
  user_id uuid,
  email text,
  plan_id text,
  messages bigint,
  images bigint,
  cost_usd numeric,
  last_active timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.id,
    pr.email,
    pr.plan_id,
    count(*) filter (where u.status = 'ok' and u.tier in ('junior','senior','associate','director')),
    count(*) filter (where u.status = 'ok' and u.tier in ('image','deck_image')),
    coalesce(sum(u.est_cost_usd), 0),
    max(u.created_at)
  from usage_logs u
  join profiles pr on pr.id = u.user_id
  where u.created_at >= now() - make_interval(days => p_days)
  group by pr.id, pr.email, pr.plan_id
  order by 6 desc
  limit p_limit;
$$;

-- Funnel aktivasi: daftar → onboarding → chat pertama → aktif ≥ 3 hari berbeda.
create or replace function public.admin_funnel()
returns table (signups bigint, onboarded bigint, first_message bigint, active_3_days bigint, paying bigint)
language sql
stable
security definer
set search_path = public
as $$
  with chat_days as (
    select user_id, count(distinct (created_at at time zone 'Asia/Jakarta')::date) as days
    from usage_logs
    where status = 'ok' and tier in ('junior','senior','associate','director')
    group by user_id
  )
  select
    (select count(*) from profiles where role <> 'admin'),
    (select count(*) from profiles where role <> 'admin' and onboarded),
    (select count(*) from chat_days c join profiles p on p.id = c.user_id where p.role <> 'admin'),
    (select count(*) from chat_days c join profiles p on p.id = c.user_id where p.role <> 'admin' and c.days >= 3),
    (select count(*) from profiles where role <> 'admin' and plan_id <> 'beta');
$$;

-- Pemakaian fitur dalam periode.
create or replace function public.admin_feature_usage(p_days integer default 30)
returns table (feature text, total bigint, users bigint)
language sql
stable
security definer
set search_path = public
as $$
  with since as (select now() - make_interval(days => p_days) as t)
  select * from (
    select 'chat', count(*), count(distinct user_id) from usage_logs, since
      where tier in ('junior','senior','associate','director') and status = 'ok' and created_at >= since.t
    union all
    select 'web_search', coalesce(sum(web_searches), 0), count(distinct user_id) from usage_logs, since
      where web_searches > 0 and created_at >= since.t
    union all
    select 'image', count(*), count(distinct user_id) from usage_logs, since
      where tier = 'image' and status = 'ok' and created_at >= since.t
    union all
    select 'pptx', count(*), count(distinct user_id) from usage_logs, since
      where tier = 'pptx' and status = 'ok' and created_at >= since.t
    union all
    select 'upload', count(*), count(distinct user_id) from attachments, since
      where storage_path not like '%/generated/%' and created_at >= since.t
    union all
    select 'project', count(*), count(distinct user_id) from workspaces, since
      where created_at >= since.t
    union all
    select 'knowledge_file', count(*), count(distinct user_id) from workspace_files, since
      where created_at >= since.t
    union all
    select 'canvas', count(*), count(distinct user_id) from canvases, since
      where created_at >= since.t
    union all
    select 'share', count(*), count(distinct user_id) from chats, since
      where share_token is not null and updated_at >= since.t
    union all
    select 'feedback_up', count(*), count(distinct user_id) from message_feedback, since
      where rating = 1 and created_at >= since.t
    union all
    select 'feedback_down', count(*), count(distinct user_id) from message_feedback, since
      where rating = -1 and created_at >= since.t
  ) x(feature, total, users);
$$;

-- Profil user dari onboarding (peran & industri) → insight target pasar.
create or replace function public.admin_personas()
returns table (kind text, value text, users bigint)
language sql
stable
security definer
set search_path = public
as $$
  select 'role', coalesce(persona_role, '(kosong)'), count(*) from profiles where role <> 'admin' group by 2
  union all
  select 'industry', coalesce(nullif(trim(industry), ''), '(kosong)'), count(*) from profiles where role <> 'admin' group by 2
  union all
  select 'experience', coalesce(experience, '(kosong)'), count(*) from profiles where role <> 'admin' group by 2
  order by 1, 3 desc;
$$;

-- Ringkasan pemakaian per user untuk halaman daftar & detail user.
create or replace function public.admin_user_usage(p_user_ids uuid[], p_days integer default 30)
returns table (user_id uuid, messages bigint, images bigint, pptx bigint, cost_usd numeric, last_active timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.user_id,
    count(*) filter (where u.status = 'ok' and u.tier in ('junior','senior','associate','director')),
    count(*) filter (where u.status = 'ok' and u.tier in ('image','deck_image')),
    count(*) filter (where u.status = 'ok' and u.tier = 'pptx'),
    coalesce(sum(u.est_cost_usd), 0),
    max(u.created_at)
  from usage_logs u
  where u.user_id = any(p_user_ids) and u.created_at >= now() - make_interval(days => p_days)
  group by u.user_id;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_kpis()',
    'admin_plan_breakdown(integer)',
    'admin_daily_series(integer)',
    'admin_cost_breakdown(integer)',
    'admin_top_users(integer, integer)',
    'admin_funnel()',
    'admin_feature_usage(integer)',
    'admin_personas()',
    'admin_user_usage(uuid[], integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
