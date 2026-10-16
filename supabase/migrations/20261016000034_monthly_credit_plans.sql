-- Paket baru (ACC founder 16 Okt 2026): satu dompet kredit per BULAN untuk semua fitur (chat, gambar, Riset Web, Tools Pro, Agent).
-- 1 kredit ≈ Rp100 modal AI; kredit dipotong sesuai pemakaian nyata. Free 50 · Starter Rp60rb/250 · Pro Rp200rb/900 · Promax Rp300rb/1.350.

alter table public.plans add column if not exists monthly_credits integer not null default 0;
alter table public.profiles add column if not exists monthly_credit_override integer;

insert into public.plans (id, name, description, daily_credits, monthly_price_idr, is_public, is_active, sort_order, monthly_credits)
values ('starter', 'Starter', 'Junior & Senior, semua Tools Pro, Riset Web, gambar, PPT', 0, 60000, true, true, 1, 250)
on conflict (id) do update set name = excluded.name, description = excluded.description, monthly_price_idr = excluded.monthly_price_idr,
  is_public = excluded.is_public, is_active = excluded.is_active, sort_order = excluded.sort_order, monthly_credits = excluded.monthly_credits;

update public.plans set monthly_credits = 50, description = 'Coba Markethink dengan otak Junior' where id = 'beta';
update public.plans set monthly_credits = 900, monthly_price_idr = 200000, sort_order = 2, is_public = true,
  description = 'Junior, Senior, Associate, semua Tools Pro & Markethink Agent' where id = 'pro';
update public.plans set monthly_credits = 1350, monthly_price_idr = 300000, sort_order = 3, is_public = true,
  description = 'Semua otak termasuk Director, semua Tools Pro & Markethink Agent' where id = 'promax';

-- Fitur paket Starter (seperti Pro, tanpa Associate/Director, tanpa Agent).
insert into public.feature_flags (plan_id, key, enabled, value)
select 'starter', key, enabled, value from public.feature_flags where plan_id = 'pro'
on conflict (plan_id, key) do nothing;
update public.feature_flags set enabled = false where plan_id = 'starter' and key in ('tier.associate', 'tier.director');
update public.feature_flags set value = '{"max_mb": 1024}' where plan_id = 'starter' and key = 'storage';
update public.feature_flags set value = '{"max": 20}' where plan_id = 'starter' and key = 'workspaces';
update public.feature_flags set value = '{"max_mb": 5120}' where plan_id = 'pro' and key = 'storage';
update public.feature_flags set value = '{"max_mb": 10240}' where plan_id = 'promax' and key = 'storage';
insert into public.feature_flags (plan_id, key, enabled, value) values
  ('beta', 'tools_pro', false, null), ('starter', 'tools_pro', true, null), ('pro', 'tools_pro', true, null), ('promax', 'tools_pro', true, null),
  ('beta', 'agent', false, null), ('starter', 'agent', false, null), ('pro', 'agent', true, null), ('promax', 'agent', true, null)
on conflict (plan_id, key) do update set enabled = excluded.enabled;

-- Awal bulan berjalan dalam WIB (reset kredit tiap tanggal 1, 00.00 WIB).
create or replace function public.credit_month_start()
returns timestamptz language sql stable as $$
  select (date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta');
$$;

-- Saldo kredit bulan ini. Admin tanpa batas praktis.
create or replace function public.get_credit_balance(p_user uuid)
returns table (month_limit integer, used integer, remaining integer)
language sql stable security definer set search_path = public as $$
  with lim as (
    select case when p.role = 'admin' then 1000000 else coalesce(p.monthly_credit_override, pl.monthly_credits) end as month_limit
    from profiles p join plans pl on pl.id = p.plan_id
    where p.id = p_user
  ),
  spent as (
    select coalesce(-sum(delta), 0)::integer as used
    from credit_ledger
    where user_id = p_user and kind in ('spend', 'refund') and created_at >= credit_month_start()
  )
  select lim.month_limit, greatest(spent.used, 0), greatest(lim.month_limit - spent.used, 0) from lim, spent;
$$;

-- Potong kredit (cek saldo bulan ini). Signature sama dengan sebelumnya.
create or replace function public.consume_credits(p_user uuid, p_amount integer, p_reason text, p_meta jsonb default null)
returns table (ok boolean, remaining integer)
language plpgsql security definer set search_path = public as $$
declare
  v_limit integer;
  v_used integer;
begin
  perform 1 from profiles where id = p_user for update;
  select s.month_limit, s.used into v_limit, v_used from get_credit_balance(p_user) s;
  if v_limit is null then
    return query select false, 0;
    return;
  end if;
  if v_limit - v_used < p_amount then
    return query select false, greatest(v_limit - v_used, 0);
    return;
  end if;
  insert into credit_ledger (user_id, delta, kind, reason, meta) values (p_user, -p_amount, 'spend', p_reason, p_meta);
  return query select true, v_limit - v_used - p_amount;
end;
$$;

-- Penyesuaian setelah biaya nyata diketahui (+ = tambahan potongan, − = pengembalian). Tidak ditolak walau saldo kurang.
create or replace function public.settle_credits(p_user uuid, p_delta integer, p_reason text, p_meta jsonb default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_remaining integer;
begin
  if p_delta <> 0 then
    insert into credit_ledger (user_id, delta, kind, reason, meta)
    values (p_user, -p_delta, case when p_delta > 0 then 'spend' else 'refund' end, p_reason, p_meta);
  end if;
  select remaining into v_remaining from get_credit_balance(p_user);
  return coalesce(v_remaining, 0);
end;
$$;

revoke all on function public.get_credit_balance(uuid) from public, anon, authenticated;
revoke all on function public.settle_credits(uuid, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.get_credit_balance(uuid) to service_role;
grant execute on function public.settle_credits(uuid, integer, text, jsonb) to service_role;
