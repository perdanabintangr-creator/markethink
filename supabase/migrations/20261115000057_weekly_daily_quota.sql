-- Fase 1 (ACC founder 15 Nov 2026): jatah MINGGUAN (reset Senin 00.00 WIB) + batas HARIAN (reset 00.00 WIB),
-- menggantikan dompet bulanan. Total ±sama dengan sebelumnya → biaya AI maksimal per paket tidak naik.
-- Free 12/8 · Starter 60/25 · Pro 210/80 · Promax 315/120 (mingguan/harian). 1 kredit ≈ Rp100 modal AI.
-- Kredit kini boleh pecahan (chat ringan dihitung sesuai biaya asli, tanpa pembulatan ke 1).
-- Otak Director maksimal 50% jatah mingguan.

alter table public.plans add column if not exists weekly_credits numeric not null default 0;
update public.plans set weekly_credits = 12, daily_credits = 8 where id = 'beta';
update public.plans set weekly_credits = 60, daily_credits = 25 where id = 'starter';
update public.plans set weekly_credits = 210, daily_credits = 80 where id = 'pro';
update public.plans set weekly_credits = 315, daily_credits = 120 where id = 'promax';

alter table public.credit_ledger alter column delta type numeric(12, 2);

create or replace function public.credit_week_start()
returns timestamptz language sql stable as $$
  select (date_trunc('week', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta');
$$;

create or replace function public.credit_day_start()
returns timestamptz language sql stable as $$
  select (date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta');
$$;

-- Status jatah lengkap. Override bulanan (back office) dikonversi: mingguan = override × 12/52, harian = 40% mingguan.
create or replace function public.get_quota_status(p_user uuid)
returns table (week_limit numeric, week_used numeric, day_limit numeric, day_used numeric, director_used numeric)
language sql stable security definer set search_path = public as $$
  with lim as (
    select
      case when p.role = 'admin' then 1000000::numeric
           when p.monthly_credit_override is not null then round(p.monthly_credit_override * 12.0 / 52, 2)
           else pl.weekly_credits end as week_limit,
      case when p.role = 'admin' then 1000000::numeric
           when p.monthly_credit_override is not null then round(p.monthly_credit_override * 12.0 / 52 * 0.4, 2)
           else pl.daily_credits::numeric end as day_limit
    from profiles p join plans pl on pl.id = p.plan_id
    where p.id = p_user
  ),
  led as (
    select
      coalesce(-sum(delta) filter (where created_at >= credit_week_start()), 0) as week_used,
      coalesce(-sum(delta) filter (where created_at >= credit_day_start()), 0) as day_used,
      coalesce(-sum(delta) filter (where created_at >= credit_week_start() and meta->>'tier' = 'director'), 0) as director_used
    from credit_ledger
    where user_id = p_user and kind in ('spend', 'refund') and created_at >= least(credit_week_start(), credit_day_start())
  )
  select lim.week_limit, led.week_used, lim.day_limit, led.day_used, greatest(led.director_used, 0) from lim, led;
$$;

-- Kompatibilitas (back office, P&L): "month_*" kini berarti jatah minggu ini; remaining = 0 bila jatah hari ini habis.
create or replace function public.get_credit_balance(p_user uuid)
returns table (month_limit integer, used integer, remaining integer)
language sql stable security definer set search_path = public as $$
  select round(s.week_limit)::integer,
         round(greatest(s.week_used, 0))::integer,
         case when s.day_used >= s.day_limit then 0
              else round(greatest(s.week_limit - s.week_used, 0))::integer end
  from get_quota_status(p_user) s;
$$;

drop function if exists public.consume_credits(uuid, integer, text, jsonb);
drop function if exists public.settle_credits(uuid, integer, text, jsonb);

-- Potong kredit. Ditolak bila: jatah hari ini sudah habis ('daily'), sisa minggu ini < jumlah ('weekly'),
-- atau porsi Director (50% mingguan) terlampaui ('director'). Selama jatah harian belum habis, satu pekerjaan
-- besar tetap boleh berjalan walau hasilnya melewati batas harian.
create or replace function public.consume_credits(p_user uuid, p_amount numeric, p_reason text, p_meta jsonb default null)
returns table (ok boolean, remaining numeric, reason text)
language plpgsql security definer set search_path = public as $$
declare
  s record;
  v_admin boolean;
begin
  perform 1 from profiles where id = p_user for update;
  select role = 'admin' into v_admin from profiles where id = p_user;
  select * into s from get_quota_status(p_user);
  if s.week_limit is null then
    return query select false, 0::numeric, 'no_plan'::text;
    return;
  end if;
  if s.day_used >= s.day_limit then
    return query select false, greatest(s.week_limit - s.week_used, 0), 'daily'::text;
    return;
  end if;
  if s.week_limit - s.week_used < p_amount then
    return query select false, greatest(s.week_limit - s.week_used, 0), 'weekly'::text;
    return;
  end if;
  if not coalesce(v_admin, false) and p_meta->>'tier' = 'director' and s.director_used + p_amount > s.week_limit * 0.5 then
    return query select false, greatest(s.week_limit - s.week_used, 0), 'director'::text;
    return;
  end if;
  insert into credit_ledger (user_id, delta, kind, reason, meta) values (p_user, -p_amount, 'spend', p_reason, p_meta);
  return query select true, s.week_limit - s.week_used - p_amount, null::text;
end;
$$;

-- Penyesuaian setelah biaya nyata diketahui (+ = tambahan potongan, − = pengembalian). Tidak ditolak walau jatah kurang.
create or replace function public.settle_credits(p_user uuid, p_delta numeric, p_reason text, p_meta jsonb default null)
returns numeric
language plpgsql security definer set search_path = public as $$
declare v_remaining numeric;
begin
  if p_delta <> 0 then
    insert into credit_ledger (user_id, delta, kind, reason, meta)
    values (p_user, -p_delta, case when p_delta > 0 then 'spend' else 'refund' end, p_reason, p_meta);
  end if;
  select greatest(week_limit - week_used, 0) into v_remaining from get_quota_status(p_user);
  return coalesce(v_remaining, 0);
end;
$$;

revoke all on function public.get_quota_status(uuid) from public, anon, authenticated;
revoke all on function public.consume_credits(uuid, numeric, text, jsonb) from public, anon, authenticated;
revoke all on function public.settle_credits(uuid, numeric, text, jsonb) from public, anon, authenticated;
grant execute on function public.get_quota_status(uuid) to service_role;
grant execute on function public.consume_credits(uuid, numeric, text, jsonb) to service_role;
grant execute on function public.settle_credits(uuid, numeric, text, jsonb) to service_role;
