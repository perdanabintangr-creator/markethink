-- Bonus kredit dari back office (delta +) ikut menambah saldo saat memotong kredit:
-- consume_credits memakai `remaining` (bukan limit − used yang di-clamp).
create or replace function public.consume_credits(p_user uuid, p_amount integer, p_reason text, p_meta jsonb default null)
returns table (ok boolean, remaining integer)
language plpgsql security definer set search_path = public as $$
declare
  v_limit integer;
  v_remaining integer;
begin
  perform 1 from profiles where id = p_user for update;
  select s.month_limit, s.remaining into v_limit, v_remaining from get_credit_balance(p_user) s;
  if v_limit is null then
    return query select false, 0;
    return;
  end if;
  if v_remaining < p_amount then
    return query select false, greatest(v_remaining, 0);
    return;
  end if;
  insert into credit_ledger (user_id, delta, kind, reason, meta) values (p_user, -p_amount, 'spend', p_reason, p_meta);
  return query select true, v_remaining - p_amount;
end;
$$;

revoke all on function public.consume_credits(uuid, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.consume_credits(uuid, integer, text, jsonb) to service_role;
