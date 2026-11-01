-- Back office: daftar pelanggan ikut menampilkan & bisa dicari dengan nomor WhatsApp.
drop function if exists public.bo_customer_list(text, text, text, text, integer, integer);

create function public.bo_customer_list(p_search text default null, p_plan text default null, p_status text default 'all', p_sort text default 'newest', p_limit integer default 50, p_offset integer default 0)
returns table(id uuid, email text, full_name text, whatsapp text, role text, internal boolean, plan_id text, banned boolean, created_at timestamptz, plan_started_at timestamptz, last_active_at timestamptz, first_paid_at timestamptz, active_until timestamptz, total_paid bigint, payments bigint, total_count bigint)
language sql stable security definer set search_path to 'public'
as $function$
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
      p.id, p.email, p.full_name, p.whatsapp, p.role, (p.role <> 'user' or b.user_id is not null) as internal, p.plan_id, p.banned, p.created_at, p.plan_started_at, p.last_active_at,
      y.first_paid_at, u.active_until, coalesce(y.total_paid, 0)::bigint as total_paid, coalesce(y.payments, 0)::bigint as payments
    from profiles p
    left join until u on u.user_id = p.id
    left join pay y on y.user_id = p.id
    left join backoffice_members b on b.user_id = p.id
    where (coalesce(p_search, '') = ''
        or p.email ilike '%' || p_search || '%'
        or p.full_name ilike '%' || p_search || '%'
        or (length(regexp_replace(p_search, '\D', '', 'g')) >= 4
            and p.whatsapp like '%' || regexp_replace(regexp_replace(p_search, '\D', '', 'g'), '^0', '') || '%'))
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
$function$;

revoke all on function public.bo_customer_list(text, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.bo_customer_list(text, text, text, text, integer, integer) to service_role;
