-- Fase 1 jatah mingguan + harian (lanjutan migrasi 057): fungsi potong & sesuaikan kredit versi baru.
-- Nama baru (quota_consume / quota_settle) supaya fungsi lama tidak perlu dihapus; aplikasi memakai yang baru.
alter table public.usage_logs alter column credits type numeric(12, 2);

-- Potong kredit. Ditolak bila: jatah hari ini sudah habis ('daily'), sisa minggu ini < jumlah ('weekly'),
-- atau porsi Director (50% mingguan) terlampaui ('director'). Selama jatah harian belum habis, satu pekerjaan
-- besar tetap boleh berjalan walau hasilnya melewati batas harian.
create or replace function public.quota_consume(p_user uuid, p_amount numeric, p_reason text, p_meta jsonb default null)
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
create or replace function public.quota_settle(p_user uuid, p_delta numeric, p_reason text, p_meta jsonb default null)
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

revoke all on function public.quota_consume(uuid, numeric, text, jsonb) from public, anon, authenticated;
revoke all on function public.quota_settle(uuid, numeric, text, jsonb) from public, anon, authenticated;
grant execute on function public.quota_consume(uuid, numeric, text, jsonb) to service_role;
grant execute on function public.quota_settle(uuid, numeric, text, jsonb) to service_role;
