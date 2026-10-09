-- Akun Back Office terpisah dari akun aplikasi: login username + password khusus tim bisnis.
-- Password disimpan sebagai hash scrypt (dibuat di server), sesi disimpan sebagai hash token.
-- Tabel hanya bisa diakses service_role (RLS aktif tanpa policy).
-- Catatan: tabel backoffice_members (0017) tidak dipakai lagi.

create table if not exists public.backoffice_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  full_name text not null check (length(full_name) between 1 and 80),
  role text not null default 'staff' check (role in ('owner', 'staff')),
  password_hash text not null,
  active boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_by uuid references public.backoffice_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.backoffice_users enable row level security;

create table if not exists public.backoffice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.backoffice_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists backoffice_sessions_user_idx on public.backoffice_sessions (user_id);
alter table public.backoffice_sessions enable row level security;

-- Siapa (akun back office) yang mencatat penjualan / mengubah paket.
alter table public.subscriptions add column if not exists bo_created_by uuid references public.backoffice_users(id) on delete set null;
alter table public.plan_changes add column if not exists bo_changed_by uuid references public.backoffice_users(id) on delete set null;

create or replace function public.track_plan_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan_id is distinct from old.plan_id then
    new.plan_started_at := now();
    insert into plan_changes (user_id, from_plan, to_plan, changed_by, bo_changed_by, note)
    values (
      new.id,
      old.plan_id,
      new.plan_id,
      nullif(current_setting('markethink.actor', true), '')::uuid,
      nullif(current_setting('markethink.bo_actor', true), '')::uuid,
      nullif(current_setting('markethink.note', true), '')
    );
  end if;
  return new;
end;
$$;

-- Ubah paket dari back office (aktor = akun back office).
create or replace function public.bo_set_plan(p_user uuid, p_plan text, p_bo_actor uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from plans where id = p_plan) then raise exception 'invalid_plan'; end if;
  perform set_config('markethink.bo_actor', coalesce(p_bo_actor::text, ''), true);
  perform set_config('markethink.note', coalesce(p_note, ''), true);
  update profiles set plan_id = p_plan, updated_at = now() where id = p_user and plan_id <> p_plan;
  if p_plan = 'beta' then
    update subscriptions
       set status = 'canceled', current_period_end = least(current_period_end, greatest(current_period_start, now())), updated_at = now()
     where user_id = p_user and status in ('active', 'trialing') and current_period_end > now();
  end if;
end;
$$;

-- Catat penjualan (p_actor = id akun back office).
create or replace function public.bo_record_sale(
  p_user uuid,
  p_plan text,
  p_months integer,
  p_amount integer,
  p_method text,
  p_note text,
  p_actor uuid,
  p_paid_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cur_plan text;
  v_prev_id uuid;
  v_prev_plan text;
  v_prev_end timestamptz;
  v_start timestamptz;
  v_kind text;
  v_id uuid;
begin
  if p_plan = 'beta' or not exists (select 1 from plans where id = p_plan) then raise exception 'invalid_plan'; end if;
  select plan_id into v_cur_plan from profiles where id = p_user for update;
  if not found then raise exception 'user_not_found'; end if;

  select id, plan_id, current_period_end into v_prev_id, v_prev_plan, v_prev_end
    from subscriptions
   where user_id = p_user and status in ('active', 'trialing') and current_period_end > now()
   order by current_period_end desc
   limit 1;

  if v_prev_id is null then
    v_start := now();
    v_kind := case when exists (select 1 from subscriptions where user_id = p_user and refunded_at is null) then 'renewal' else 'new' end;
  elsif v_prev_plan = p_plan then
    v_start := v_prev_end;
    v_kind := 'renewal';
  else
    -- Ganti paket: semua periode berjalan/antrean paket lama ditutup sekarang.
    update subscriptions
       set status = 'canceled', current_period_end = least(current_period_end, greatest(current_period_start, now())), updated_at = now()
     where user_id = p_user and status in ('active', 'trialing') and current_period_end > now();
    v_start := now();
    v_kind := case
      when (select sort_order from plans where id = p_plan) > (select sort_order from plans where id = v_prev_plan) then 'upgrade'
      else 'downgrade'
    end;
  end if;

  insert into subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end,
                             amount_idr, months, kind, payment_method, note, bo_created_by, paid_at)
  values (p_user, p_plan, 'active', 'manual', v_start, v_start + make_interval(months => p_months),
          p_amount, p_months, v_kind, nullif(trim(p_method), ''), nullif(trim(p_note), ''), p_actor, coalesce(p_paid_at, now()))
  returning id into v_id;

  if v_cur_plan <> p_plan then
    perform set_config('markethink.bo_actor', coalesce(p_actor::text, ''), true);
    perform set_config('markethink.note', 'Penjualan dicatat (' || v_kind || ')', true);
    update profiles set plan_id = p_plan, updated_at = now() where id = p_user;
  end if;
  return v_id;
end;
$$;

revoke all on function public.bo_set_plan(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.bo_set_plan(uuid, text, uuid, text) to service_role;
revoke all on function public.bo_record_sale(uuid, text, integer, integer, text, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.bo_record_sale(uuid, text, integer, integer, text, text, uuid, timestamptz) to service_role;
