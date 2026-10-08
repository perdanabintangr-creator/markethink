-- =====================================================================
-- Markethink — initial schema
-- Semua tabel data user memakai Row Level Security.
-- Penulisan tabel sensitif (kredit, usage, role) hanya lewat service_role.
-- =====================================================================

create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Plans & feature flags (siap monetisasi)
-- ---------------------------------------------------------------------
create table public.plans (
  id text primary key,
  name text not null,
  description text,
  daily_credits integer not null default 50,
  monthly_price_idr integer not null default 0,
  is_public boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.feature_flags (
  plan_id text not null references public.plans(id) on delete cascade,
  key text not null,
  enabled boolean not null default true,
  value jsonb,
  primary key (plan_id, key)
);

insert into public.plans (id, name, description, daily_credits, monthly_price_idr, is_public, sort_order) values
  ('beta', 'Beta Gratis', 'Akses beta gratis dengan kuota harian', 50, 0, true, 0),
  ('pro', 'Pro', 'Segera hadir', 500, 0, false, 1);

insert into public.feature_flags (plan_id, key, enabled, value) values
  ('beta', 'tier.junior', true, null),
  ('beta', 'tier.senior', true, null),
  ('beta', 'tier.associate', true, null),
  ('beta', 'research', true, null),
  ('beta', 'uploads', true, '{"max_mb": 10}'),
  ('beta', 'workspaces', true, '{"max": 5}'),
  ('pro', 'tier.junior', true, null),
  ('pro', 'tier.senior', true, null),
  ('pro', 'tier.associate', true, null),
  ('pro', 'research', true, null),
  ('pro', 'uploads', true, '{"max_mb": 25}'),
  ('pro', 'workspaces', true, '{"max": 50}');

-- ---------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  plan_id text not null default 'beta' references public.plans(id),
  language text not null default 'id' check (language in ('id', 'en')),
  persona_role text,
  industry text,
  experience text,
  goal text,
  onboarded boolean not null default false,
  consent_at timestamptz,
  banned boolean not null default false,
  daily_credit_override integer,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, consent_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    nullif(new.raw_user_meta_data->>'consent_at', '')::timestamptz
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Subscriptions (placeholder untuk payment gateway)
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null default 'active' check (status in ('trialing','active','past_due','canceled','expired')),
  provider text,
  provider_ref text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.subscriptions (user_id);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text,
  provider_ref text,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Kredit & usage
-- ---------------------------------------------------------------------
create table public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null,
  kind text not null check (kind in ('spend','refund','topup','grant','adjust')),
  reason text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index on public.credit_ledger (user_id, created_at desc);

create table public.usage_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  chat_id uuid,
  tier text,
  provider text,
  model text,
  input_tokens integer default 0,
  output_tokens integer default 0,
  est_cost_usd numeric(12,6) default 0,
  credits integer default 0,
  research boolean default false,
  attachments integer default 0,
  latency_ms integer,
  status text default 'ok',
  created_at timestamptz not null default now()
);
create index on public.usage_logs (created_at desc);
create index on public.usage_logs (user_id, created_at desc);

-- Hari kuota dihitung per hari kalender WIB.
create or replace function public.credit_day_start()
returns timestamptz
language sql
stable
as $$
  select (date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta');
$$;

create or replace function public.get_credit_status(p_user uuid)
returns table (daily_limit integer, used integer, remaining integer)
language sql
stable
security definer
set search_path = public
as $$
  with lim as (
    select coalesce(p.daily_credit_override, pl.daily_credits) as daily_limit
    from profiles p join plans pl on pl.id = p.plan_id
    where p.id = p_user
  ),
  spent as (
    select coalesce(-sum(delta), 0)::integer as used
    from credit_ledger
    where user_id = p_user
      and kind in ('spend','refund')
      and created_at >= credit_day_start()
  )
  select lim.daily_limit, greatest(spent.used, 0), greatest(lim.daily_limit - spent.used, 0)
  from lim, spent;
$$;

-- Atomic: kunci baris profil, cek sisa, catat pemakaian.
create or replace function public.consume_credits(p_user uuid, p_amount integer, p_reason text, p_meta jsonb default null)
returns table (ok boolean, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_used integer;
begin
  perform 1 from profiles where id = p_user for update;
  select s.daily_limit, s.used into v_limit, v_used from get_credit_status(p_user) s;
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

revoke all on function public.consume_credits(uuid, integer, text, jsonb) from public, anon, authenticated;
revoke all on function public.get_credit_status(uuid) from public, anon, authenticated;
grant execute on function public.consume_credits(uuid, integer, text, jsonb) to service_role;
grant execute on function public.get_credit_status(uuid) to service_role;

-- ---------------------------------------------------------------------
-- Brand workspaces + knowledge (RAG)
-- ---------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  brand_kit jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.workspaces (user_id);

create table public.workspace_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  mime text not null,
  size integer not null,
  storage_path text not null,
  status text not null default 'processing' check (status in ('processing','ready','error')),
  error text,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index on public.workspace_files (workspace_id);

create table public.document_chunks (
  id bigint generated always as identity primary key,
  file_id uuid not null references public.workspace_files(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector(768)
);
create index on public.document_chunks (workspace_id);
create index on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.match_chunks(p_workspace uuid, p_embedding extensions.vector(768), p_count integer default 6)
returns table (id bigint, file_id uuid, content text, similarity double precision)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select c.id, c.file_id, c.content, 1 - (c.embedding <=> p_embedding) as similarity
  from document_chunks c
  where c.workspace_id = p_workspace
    and c.user_id = auth.uid()
    and c.embedding is not null
  order by c.embedding <=> p_embedding
  limit p_count;
$$;

-- ---------------------------------------------------------------------
-- Marketing agents (dikelola admin)
-- ---------------------------------------------------------------------
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon text not null default 'sparkles',
  category text not null default 'umum',
  instructions text not null,
  input_schema jsonb not null default '[]'::jsonb,
  default_tier text not null default 'senior' check (default_tier in ('junior','senior','associate')),
  output_canvas boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Chats & messages
-- ---------------------------------------------------------------------
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  title text not null default 'Chat baru',
  tier text not null default 'senior',
  share_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.chats (user_id, updated_at desc);

create table public.messages (
  id text not null,
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  parts jsonb not null,
  metadata jsonb,
  position integer not null,
  created_at timestamptz not null default now(),
  primary key (chat_id, id)
);
create index on public.messages (chat_id, position);

create table public.message_feedback (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  message_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating in (-1, 1)),
  reason text,
  comment text,
  created_at timestamptz not null default now(),
  unique (chat_id, message_id, user_id)
);
create index on public.message_feedback (rating, created_at desc);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  mime text not null,
  size integer not null,
  storage_path text not null,
  extracted_text text,
  created_at timestamptz not null default now()
);
create index on public.attachments (user_id);

-- ---------------------------------------------------------------------
-- Canvas + versioning
-- ---------------------------------------------------------------------
create table public.canvases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chat_id uuid references public.chats(id) on delete set null,
  title text not null default 'Dokumen',
  current_version integer not null default 1,
  share_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.canvases (user_id, updated_at desc);
create index on public.canvases (chat_id);

create table public.canvas_versions (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid not null references public.canvases(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  version integer not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (canvas_id, version)
);

-- ---------------------------------------------------------------------
-- Memory
-- ---------------------------------------------------------------------
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  source text not null default 'auto' check (source in ('auto','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.memories (user_id);

-- ---------------------------------------------------------------------
-- Waitlist Pro
-- ---------------------------------------------------------------------
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  plan_interest text,
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.feature_flags enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.usage_logs enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_files enable row level security;
alter table public.document_chunks enable row level security;
alter table public.agents enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.message_feedback enable row level security;
alter table public.attachments enable row level security;
alter table public.canvases enable row level security;
alter table public.canvas_versions enable row level security;
alter table public.memories enable row level security;
alter table public.waitlist enable row level security;

-- Katalog publik (read-only)
create policy "plans readable" on public.plans for select using (true);
create policy "flags readable" on public.feature_flags for select using (true);
create policy "active agents readable" on public.agents for select to authenticated using (is_active);

-- Profiles: baca & ubah milik sendiri, kolom sensitif dikunci lewat grant.
create policy "own profile select" on public.profiles for select using (id = auth.uid());
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (full_name, avatar_url, language, persona_role, industry, experience, goal, onboarded, consent_at, last_active_at, updated_at)
  on public.profiles to authenticated;

-- Read-only untuk user
create policy "own subscriptions" on public.subscriptions for select using (user_id = auth.uid());
create policy "own ledger" on public.credit_ledger for select using (user_id = auth.uid());
create policy "own usage" on public.usage_logs for select using (user_id = auth.uid());

-- CRUD milik sendiri
create policy "own workspaces" on public.workspaces for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own workspace files" on public.workspace_files for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own chunks" on public.document_chunks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own chats" on public.chats for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own messages" on public.messages for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own feedback" on public.message_feedback for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own attachments" on public.attachments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own canvases" on public.canvases for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own canvas versions" on public.canvas_versions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own memories" on public.memories for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "waitlist insert" on public.waitlist for insert to authenticated with check (user_id = auth.uid());

-- payment_events: tanpa policy → hanya service_role.

-- ---------------------------------------------------------------------
-- Storage bucket privat untuk upload
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('uploads', 'uploads', false, 26214400)
on conflict (id) do nothing;

create policy "own uploads read" on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own uploads delete" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
