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

-- Fungsi potong/sesuaikan kredit versi baru (nama baru agar fungsi lama tidak perlu dihapus; lihat migrasi 060).
