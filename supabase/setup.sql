-- File gabungan semua migrasi Markethink. Jalankan SEKALI di Supabase → SQL Editor (project baru).
-- Dibuat otomatis oleh: npm run db:bundle — jangan edit manual.

-- ===== 20261008000001_init.sql =====
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


-- ===== 20261008000002_seed_agents.sql =====
-- Seed Marketing Agents. Admin bisa menambah/mengubah dari /admin/agents tanpa deploy.

insert into public.agents (slug, name, description, icon, category, default_tier, output_canvas, sort_order, instructions, input_schema) values

('brainstorm-campaign', 'Brainstorm Ide Campaign', 'Kumpulan ide campaign kreatif lengkap dengan big idea, mekanik, dan channel.', 'lightbulb', 'strategi', 'senior', false, 1,
$$Kamu sedang menjalankan agent "Brainstorm Ide Campaign".
Hasilkan 5–7 ide campaign yang berbeda arah (emosional, rasional, UGC/komunitas, kolaborasi, promo, PR stunt, edukasi).
Untuk tiap ide tulis: Nama campaign, Big idea (1 kalimat), Insight konsumen yang mendasari, Mekanik eksekusi, Channel utama, Estimasi effort (rendah/sedang/tinggi), dan Contoh headline.
Tutup dengan tabel perbandingan (ide × dampak × biaya × kecepatan eksekusi) dan rekomendasi 1 ide terbaik beserta alasannya.$$,
'[{"name":"brand","label":"Brand / produk","type":"text","required":true,"placeholder":"mis. Kopi Senja – kopi susu literan"},
  {"name":"objective","label":"Tujuan campaign","type":"select","required":true,"options":["Awareness","Engagement","Leads","Penjualan","Retensi / loyalitas","Launching produk baru"]},
  {"name":"audience","label":"Target audiens","type":"textarea","placeholder":"Usia, lokasi, kebiasaan, pain point"},
  {"name":"budget","label":"Range budget","type":"text","placeholder":"mis. Rp5–10 juta"},
  {"name":"context","label":"Konteks tambahan","type":"textarea","placeholder":"Momen (Ramadan, 12.12), kompetitor, batasan"}]'::jsonb),

('brand-positioning', 'Brand Positioning & USP', 'Rumuskan positioning statement, USP, dan pilar pesan brand.', 'target', 'strategi', 'associate', true, 2,
$$Kamu sedang menjalankan agent "Brand Positioning & USP".
Susun: 1) Analisis kategori & kompetitor singkat, 2) Target audiens prioritas & insight, 3) Positioning statement (format: Untuk [target] yang [kebutuhan], [brand] adalah [kategori] yang [manfaat utama] karena [reason to believe]), 4) 3 alternatif USP dan rekomendasi, 5) Brand pillars (3–4) dengan proof point, 6) Messaging house (key message → supporting messages → bukti), 7) Tagline options (5), 8) Do & Don't komunikasi.$$,
'[{"name":"brand","label":"Nama brand","type":"text","required":true},
  {"name":"product","label":"Produk / jasa","type":"textarea","required":true},
  {"name":"audience","label":"Target audiens","type":"textarea"},
  {"name":"competitors","label":"Kompetitor utama","type":"textarea","placeholder":"Sebutkan 2–5 kompetitor"},
  {"name":"strengths","label":"Kelebihan yang kamu yakini","type":"textarea"}]'::jsonb),

('buyer-persona', 'Buyer Persona', 'Bangun 2–3 buyer persona lengkap dengan pain point & customer journey.', 'users', 'riset', 'senior', true, 3,
$$Kamu sedang menjalankan agent "Buyer Persona".
Buat 2–3 persona. Untuk tiap persona: nama & foto-deskripsi singkat, demografi, psikografi, tujuan, pain point, trigger membeli, keberatan (objection), channel & konten yang dikonsumsi, influencer/sumber kepercayaan, kutipan khas, dan pesan yang paling mengena.
Lanjutkan dengan tabel customer journey (Awareness → Consideration → Purchase → Retention → Advocacy) per persona: touchpoint, pertanyaan di benak, konten yang dibutuhkan, KPI.$$,
'[{"name":"business","label":"Bisnis / produk","type":"textarea","required":true},
  {"name":"market","label":"Pasar & lokasi","type":"text","placeholder":"mis. Jabodetabek, B2C"},
  {"name":"known","label":"Data pelanggan yang sudah diketahui","type":"textarea"}]'::jsonb),

('competitor-swot', 'Analisis Kompetitor & SWOT', 'Bandingkan kompetitor dan susun SWOT + strategi TOWS.', 'swords', 'riset', 'associate', true, 4,
$$Kamu sedang menjalankan agent "Analisis Kompetitor & SWOT".
Susun: 1) Tabel kompetitor (positioning, harga, produk unggulan, channel, kekuatan, kelemahan, tone komunikasi), 2) Peta posisi (jelaskan sumbu & letak tiap brand), 3) SWOT brand user, 4) Matriks TOWS (SO, WO, ST, WT) dengan strategi konkret, 5) 5 quick wins yang bisa dieksekusi 30 hari.
Jika data kompetitor tidak pasti, beri label "perlu verifikasi" dan sarankan mengaktifkan Riset Web.$$,
'[{"name":"brand","label":"Brand kamu","type":"text","required":true},
  {"name":"competitors","label":"Kompetitor","type":"textarea","required":true,"placeholder":"Satu per baris"},
  {"name":"category","label":"Kategori / industri","type":"text"},
  {"name":"notes","label":"Catatan","type":"textarea"}]'::jsonb),

('campaign-plan', 'Campaign Plan End-to-End', 'Rencana campaign dari objective sampai KPI, siap dipresentasikan.', 'map', 'strategi', 'associate', true, 5,
$$Kamu sedang menjalankan agent "Campaign Plan End-to-End".
Struktur wajib: 1) Ringkasan eksekutif, 2) Objective (SMART), 3) Target audiens & insight, 4) Big idea & key message, 5) Strategi channel (tabel: channel, peran di funnel, format konten, frekuensi, porsi budget), 6) Timeline per fase (teaser, launch, sustain, closing) dalam tabel mingguan, 7) Alokasi budget (tabel dengan nominal & persentase), 8) KPI per funnel + target angka + tool pengukuran, 9) Risiko & mitigasi, 10) Next steps 7 hari pertama.$$,
'[{"name":"brand","label":"Brand / produk","type":"text","required":true},
  {"name":"objective","label":"Objective","type":"textarea","required":true},
  {"name":"audience","label":"Target audiens","type":"textarea"},
  {"name":"budget","label":"Total budget","type":"text"},
  {"name":"duration","label":"Durasi campaign","type":"text","placeholder":"mis. 6 minggu"},
  {"name":"channels","label":"Channel yang tersedia","type":"text","placeholder":"IG, TikTok, Meta Ads, KOL, offline"}]'::jsonb),

('content-calendar', 'Content Calendar', 'Kalender konten dalam tabel, siap export CSV.', 'calendar', 'konten', 'senior', true, 6,
$$Kamu sedang menjalankan agent "Content Calendar".
Output utama berupa SATU tabel markdown dengan kolom persis: Tanggal | Hari | Platform | Pilar Konten | Format | Topik/Judul | Hook | Caption Singkat | CTA | Status.
Isi untuk seluruh periode yang diminta dengan frekuensi sesuai input. Sebelum tabel, tulis singkat pilar konten (3–5) dan proporsinya. Setelah tabel, beri tips produksi batch dan metrik yang dipantau.$$,
'[{"name":"brand","label":"Brand","type":"text","required":true},
  {"name":"period","label":"Periode","type":"text","required":true,"placeholder":"mis. 1–30 November 2026"},
  {"name":"platforms","label":"Platform","type":"text","placeholder":"Instagram, TikTok"},
  {"name":"frequency","label":"Frekuensi posting","type":"text","placeholder":"mis. 4x seminggu"},
  {"name":"themes","label":"Tema / momen penting","type":"textarea"}]'::jsonb),

('social-caption', 'Caption IG/TikTok/LinkedIn', 'Caption + hook + hashtag sesuai karakter platform.', 'message-square', 'konten', 'junior', false, 7,
$$Kamu sedang menjalankan agent "Caption Sosial Media".
Buat 3 variasi caption untuk platform yang diminta. Tiap variasi: Hook (baris pertama yang menghentikan scroll), Body, CTA, dan 8–15 hashtag (campuran besar, niche, branded). Sesuaikan panjang & gaya dengan platform (LinkedIn lebih profesional, TikTok singkat & playful). Beri label angle tiap variasi.$$,
'[{"name":"platform","label":"Platform","type":"select","required":true,"options":["Instagram","TikTok","LinkedIn","X/Twitter","Facebook"]},
  {"name":"topic","label":"Topik / produk","type":"textarea","required":true},
  {"name":"tone","label":"Tone","type":"select","options":["Santai","Profesional","Lucu","Inspiratif","Hard selling"]},
  {"name":"cta","label":"CTA yang diinginkan","type":"text"}]'::jsonb),

('short-video-script', 'Script Video Pendek', 'Script TikTok/Reels dengan hook 3 detik, scene, dan teks layar.', 'clapperboard', 'konten', 'senior', true, 8,
$$Kamu sedang menjalankan agent "Script Video Pendek".
Buat 3 konsep script. Tiap script dalam tabel: Detik | Visual/Shot | Voice over/Dialog | Teks di layar | Audio/SFX. Wajib: hook di 0–3 detik, retention trick di tengah, CTA di akhir. Sertakan judul, durasi, format (talking head, POV, skit, tutorial, before-after), dan saran audio tren yang relevan (umum, tanpa klaim spesifik).$$,
'[{"name":"product","label":"Produk / topik","type":"textarea","required":true},
  {"name":"duration","label":"Durasi","type":"select","options":["15 detik","30 detik","60 detik"]},
  {"name":"goal","label":"Tujuan video","type":"select","options":["Awareness","Edukasi","Jualan","Engagement"]},
  {"name":"talent","label":"Talent / resource yang tersedia","type":"text"}]'::jsonb),

('ads-copy', 'Ads Copy (Meta, Google, TikTok)', 'Copy iklan per format platform dengan variasi A/B.', 'megaphone', 'iklan', 'senior', false, 9,
$$Kamu sedang menjalankan agent "Ads Copy".
Ikuti batas karakter platform: Google Search (headline ≤30, description ≤90, buat 10 headline + 4 description), Meta (primary text, headline ≤40, description), TikTok (ad text ≤100 + ide visual). Buat variasi A/B dengan angle berbeda (pain, benefit, social proof, urgency, offer). Akhiri dengan tabel rencana A/B test: variabel yang diuji, hipotesis, metrik keberhasilan.$$,
'[{"name":"platform","label":"Platform","type":"select","required":true,"options":["Meta Ads","Google Ads","TikTok Ads","Semua"]},
  {"name":"product","label":"Produk & offer","type":"textarea","required":true},
  {"name":"audience","label":"Target","type":"textarea"},
  {"name":"objective","label":"Objective iklan","type":"select","options":["Traffic","Konversi","Leads","Install app","Awareness"]}]'::jsonb),

('marketplace-copy', 'Copy Marketplace', 'Judul & deskripsi produk Shopee/Tokopedia/TikTok Shop yang SEO-friendly.', 'shopping-bag', 'umkm', 'junior', false, 10,
$$Kamu sedang menjalankan agent "Copy Marketplace".
Hasilkan: 3 opsi judul produk (≤100 karakter, kata kunci utama di depan), deskripsi produk terstruktur (hook, manfaat dengan emoji bullet, spesifikasi, isi paket, cara pakai, garansi/FAQ), 10 kata kunci pencarian, dan saran 5 teks untuk foto/thumbnail produk. Sesuaikan aturan umum marketplace (hindari klaim berlebihan & kata terlarang).$$,
'[{"name":"marketplace","label":"Marketplace","type":"select","required":true,"options":["Shopee","Tokopedia","TikTok Shop","Lazada","Semua"]},
  {"name":"product","label":"Nama & detail produk","type":"textarea","required":true},
  {"name":"price","label":"Harga & promo","type":"text"},
  {"name":"usp","label":"Keunggulan","type":"textarea"}]'::jsonb),

('whatsapp-script', 'WhatsApp Broadcast & Follow-up', 'Script broadcast, follow-up, dan balasan keberatan pelanggan.', 'message-circle', 'umkm', 'junior', false, 11,
$$Kamu sedang menjalankan agent "WhatsApp Broadcast & Follow-up".
Buat: 1) 3 variasi pesan broadcast (singkat, personal, dengan CTA jelas), 2) Sequence follow-up (H+1, H+3, H+7) untuk yang belum membalas, 3) Template balasan untuk 5 keberatan umum (mahal, nanti dulu, ragu kualitas, bandingkan toko lain, ongkir), 4) Tips agar tidak dianggap spam & patuh kebijakan WhatsApp Business. Gunakan variabel seperti {nama}.$$,
'[{"name":"business","label":"Bisnis / produk","type":"textarea","required":true},
  {"name":"goal","label":"Tujuan pesan","type":"select","options":["Promo","Reminder pembayaran","Re-engagement pelanggan lama","Launching produk","Follow-up leads"]},
  {"name":"offer","label":"Offer / promo","type":"text"},
  {"name":"tone","label":"Tone","type":"select","options":["Ramah santai","Sopan formal","Akrab ala teman"]}]'::jsonb),

('seo-article', 'Artikel SEO', 'Artikel blog SEO lengkap dengan outline, meta, dan FAQ.', 'file-text', 'konten', 'senior', true, 12,
$$Kamu sedang menjalankan agent "Artikel SEO".
Output: meta title (≤60 karakter), meta description (≤155), slug, keyword utama & turunan, outline H2/H3, lalu artikel lengkap sesuai panjang yang diminta dengan keyword natural, paragraf pendek, subjudul jelas, bullet, internal link suggestion [dalam kurung siku], FAQ (4–5 pertanyaan, cocok untuk schema), dan CTA penutup.$$,
'[{"name":"keyword","label":"Keyword utama","type":"text","required":true},
  {"name":"audience","label":"Pembaca sasaran","type":"text"},
  {"name":"length","label":"Panjang","type":"select","options":["±800 kata","±1200 kata","±2000 kata"]},
  {"name":"brand","label":"Brand / produk yang disisipkan","type":"text"}]'::jsonb),

('kol-brief', 'KOL / Influencer Brief', 'Brief KOL siap kirim: objective, deliverables, do & don''t, timeline.', 'star', 'iklan', 'senior', true, 13,
$$Kamu sedang menjalankan agent "KOL Brief".
Susun brief profesional: latar belakang brand, objective, target audiens, key message (maks 3), deliverables per KOL (format, jumlah, durasi), mandatory (tag, hashtag, link, disclosure #ad / kerja sama berbayar), do & don't, referensi konten, timeline (draft, revisi, posting), KPI & reporting, plus kriteria pemilihan KOL (tier nano/micro/macro, ER minimum, kecocokan audiens) dan estimasi rate card umum (beri catatan bahwa rate bervariasi).$$,
'[{"name":"brand","label":"Brand / produk","type":"text","required":true},
  {"name":"objective","label":"Objective","type":"textarea","required":true},
  {"name":"kol_tier","label":"Tier KOL","type":"select","options":["Nano (1–10K)","Micro (10–100K)","Macro (100K–1M)","Mega (>1M)","Campuran"]},
  {"name":"budget","label":"Budget","type":"text"},
  {"name":"platform","label":"Platform","type":"text"}]'::jsonb),

('event-activation', 'Event / Activation Plan', 'Rencana event online-to-offline lengkap dengan run-down & budget.', 'party-popper', 'strategi', 'associate', true, 14,
$$Kamu sedang menjalankan agent "Event / Activation Plan".
Susun: konsep & tema, objective + KPI, target pengunjung, mekanik O2O (pre-event online → on-site → post-event online), run-down acara (tabel jam), kebutuhan venue & vendor, rencana promosi, skema data capture (patuh UU PDP), budget breakdown (tabel), checklist H-30 sampai H+7, risiko & mitigasi.$$,
'[{"name":"brand","label":"Brand","type":"text","required":true},
  {"name":"event_type","label":"Jenis event","type":"select","options":["Pop-up store","Launching","Workshop/komunitas","Bazaar","Sampling","Online event/live"]},
  {"name":"location","label":"Lokasi & tanggal","type":"text"},
  {"name":"budget","label":"Budget","type":"text"},
  {"name":"goal","label":"Tujuan","type":"textarea"}]'::jsonb),

('pitch-proposal', 'Pitch Deck & Proposal Klien', 'Outline pitch deck slide-by-slide atau proposal untuk klien.', 'presentation', 'bisnis', 'associate', true, 15,
$$Kamu sedang menjalankan agent "Pitch Deck & Proposal Klien".
Buat outline slide-by-slide (12–15 slide): judul slide, poin isi, visual yang disarankan, dan speaker notes singkat. Struktur umum: masalah/opportunity klien → insight → strategi → big idea → eksekusi → timeline → tim → investasi (opsi paket) → KPI & reporting → kenapa kami → next steps. Jika tipe = proposal, tulis versi dokumen lengkap.$$,
'[{"name":"type","label":"Tipe","type":"select","required":true,"options":["Pitch deck","Proposal dokumen"]},
  {"name":"client","label":"Klien & industrinya","type":"text","required":true},
  {"name":"brief","label":"Brief / kebutuhan klien","type":"textarea","required":true},
  {"name":"offer","label":"Layanan yang ditawarkan","type":"textarea"},
  {"name":"budget","label":"Range investasi","type":"text"}]'::jsonb),

('pricing-promo', 'Pricing & Promo Strategy', 'Strategi harga, bundling, dan kalender promo yang tetap untung.', 'tags', 'bisnis', 'senior', true, 16,
$$Kamu sedang menjalankan agent "Pricing & Promo Strategy".
Analisis: struktur biaya & margin (hitung dari input bila ada), pendekatan pricing (cost-plus, value-based, competitor-based) dan rekomendasinya, price ladder/tiering, ide bundling, mekanik promo (diskon, cashback, B2G1, flash sale, voucher ongkir) beserta simulasi margin dalam tabel, kalender promo 3 bulan (termasuk tanggal kembar & momen musiman Indonesia), dan guardrail agar brand tidak terjebak perang harga.$$,
'[{"name":"product","label":"Produk","type":"textarea","required":true},
  {"name":"cost","label":"HPP / biaya per unit","type":"text"},
  {"name":"current_price","label":"Harga sekarang","type":"text"},
  {"name":"competitor_price","label":"Harga kompetitor","type":"text"},
  {"name":"goal","label":"Tujuan","type":"select","options":["Naikkan volume","Naikkan margin","Habiskan stok","Akuisisi pelanggan baru"]}]'::jsonb);


-- ===== 20261008000003_admin_stats.sql =====
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


-- ===== 20261008000004_harden_functions.sql =====
-- Temuan Supabase security advisor.
alter function public.credit_day_start() set search_path = public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;


-- ===== 20261008000005_usage_error.sql =====
alter table public.usage_logs add column if not exists error text;


-- ===== 20261008000006_beta_access.sql =====
-- Akses beta tertutup: hanya user dengan beta_access (atau admin) yang bisa memakai app
-- selama access_mode = 'invite_only'. Admin bisa mengubahnya dari /admin/quota.
alter table public.profiles add column if not exists beta_access boolean not null default false;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy "settings readable" on public.app_settings for select to authenticated using (true);

insert into public.app_settings (key, value) values ('access_mode', '"invite_only"')
on conflict (key) do nothing;


-- ===== 20261008000007_tier_by_plan.sql =====
-- Paket gratis hanya Markethink Junior; Senior & Associate untuk paket Pro.
update public.feature_flags set enabled = false where plan_id = 'beta' and key in ('tier.senior','tier.associate');
update public.plans set name = 'Gratis', description = 'Akses gratis dengan Markethink Junior dan kuota harian' where id = 'beta';
update public.plans set description = 'Semua otak marketing: Junior, Senior, Associate' where id = 'pro';


-- ===== 20261008000008_promax.sql =====
-- Paket ketiga: Promax (otak Director + kredit terbesar). Free = id 'beta'.
insert into public.plans (id, name, description, daily_credits, monthly_price_idr, is_public, sort_order)
values ('promax', 'Promax', 'Semua otak termasuk Director (paling pintar) + kredit terbesar', 2000, 0, false, 2)
on conflict (id) do nothing;

update public.plans set name = 'Free' where id = 'beta';

insert into public.feature_flags (plan_id, key, enabled, value) values
  ('beta', 'tier.director', false, null),
  ('pro', 'tier.director', false, null),
  ('promax', 'tier.junior', true, null),
  ('promax', 'tier.senior', true, null),
  ('promax', 'tier.associate', true, null),
  ('promax', 'tier.director', true, null),
  ('promax', 'research', true, null),
  ('promax', 'uploads', true, '{"max_mb": 25}'),
  ('promax', 'workspaces', true, '{"max": 200}')
on conflict (plan_id, key) do nothing;


-- ===== 20261008000009_web_search_setting.sql =====
-- Saklar pencarian web Claude (berbayar per pencarian) — diatur admin di /admin/quota.
insert into public.app_settings (key, value) values ('web_search', 'false') on conflict (key) do nothing;


-- ===== 20261008000010_usage_web_searches.sql =====
alter table public.usage_logs add column if not exists web_searches integer not null default 0;


-- ===== 20261008000011_image_pptx.sql =====
-- Pembuat gambar AI (berbayar per gambar, Gemini) — saklar admin, default mati sampai disetujui.
insert into public.app_settings (key, value) values ('image_gen', 'false') on conflict (key) do nothing;

-- Gambar: paket Pro & Promax. PPT: semua paket (biaya hanya kredit).
insert into public.feature_flags (plan_id, key, enabled, value) values
  ('beta', 'image_gen', false, null),
  ('pro', 'image_gen', true, null),
  ('promax', 'image_gen', true, null),
  ('beta', 'pptx', true, null),
  ('pro', 'pptx', true, null),
  ('promax', 'pptx', true, null)
on conflict (plan_id, key) do nothing;


-- ===== 20261008000012_usage_cache_tokens.sql =====
-- Token prompt cache Claude (untuk memantau penghematan biaya).
alter table public.usage_logs add column if not exists cache_read_tokens integer not null default 0;
alter table public.usage_logs add column if not exists cache_write_tokens integer not null default 0;


-- ===== 20261008000013_free_daily_limits.sql =====
-- Batas harian paket Free (di luar kredit): 20 chat, 2 gambar, 1 PPT per hari (WIB).
-- Paket lain tanpa per_day = hanya dibatasi kredit.
insert into public.feature_flags (plan_id, key, enabled, value) values
  ('beta', 'chat', true, '{"per_day": 20}'),
  ('pro', 'chat', true, null),
  ('promax', 'chat', true, null)
on conflict (plan_id, key) do update set enabled = excluded.enabled, value = excluded.value;

update public.feature_flags set enabled = true, value = '{"per_day": 2}' where plan_id = 'beta' and key = 'image_gen';
update public.feature_flags set enabled = true, value = '{"per_day": 1}' where plan_id = 'beta' and key = 'pptx';


-- ===== 20261008000014_free_models.sql =====
-- Paket Free: model gratis (Gemini free tier) dulu, Claude sebagai cadangan.
-- Pencarian web Claude (berbayar) untuk Free dibatasi 5 per hari; Google Search gratis tidak dihitung.
insert into public.feature_flags (plan_id, key, enabled, value) values
  ('beta', 'free_models', true, null),
  ('pro', 'free_models', false, null),
  ('promax', 'free_models', false, null),
  ('beta', 'web_search', true, '{"per_day": 5}'),
  ('pro', 'web_search', true, null),
  ('promax', 'web_search', true, null)
on conflict (plan_id, key) do update set enabled = excluded.enabled, value = excluded.value;


-- ===== 20261008000015_project_memories.sql =====
-- Projects (= workspaces): memory per project agar konteks antar project/klien tidak tercampur.
-- workspace_id null = memory umum (chat di luar project).
alter table public.memories
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
create index if not exists memories_user_workspace_idx on public.memories (user_id, workspace_id);


-- ===== 20261009000016_admin_dashboard.sql =====
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


-- ===== 20261009000017_backoffice.sql =====
-- Back office Markethink (/backoffice): database pelanggan, riwayat paket, pencatatan penjualan, dan laporan sales.
-- Semua fungsi security definer & hanya bisa dieksekusi service_role (dipanggil dari server back office).
-- Bulan & hari dihitung dalam WIB (Asia/Jakarta). Nominal dalam Rupiah.

-- 1) Anggota tim back office (selain admin). Admin aplikasi otomatis punya akses.
create table if not exists public.backoffice_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.backoffice_members enable row level security;

-- 2) Sejak kapan user berada di paketnya sekarang.
alter table public.profiles add column if not exists plan_started_at timestamptz;
update public.profiles set plan_started_at = created_at where plan_started_at is null;
alter table public.profiles alter column plan_started_at set default now();

-- 3) Riwayat perubahan paket (otomatis lewat trigger, dari jalur mana pun).
create table if not exists public.plan_changes (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  from_plan text,
  to_plan text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists plan_changes_user_idx on public.plan_changes (user_id, created_at desc);
create index if not exists plan_changes_created_idx on public.plan_changes (created_at);
alter table public.plan_changes enable row level security;

create or replace function public.track_plan_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan_id is distinct from old.plan_id then
    new.plan_started_at := now();
    insert into plan_changes (user_id, from_plan, to_plan, changed_by, note)
    values (
      new.id,
      old.plan_id,
      new.plan_id,
      nullif(current_setting('markethink.actor', true), '')::uuid,
      nullif(current_setting('markethink.note', true), '')
    );
  end if;
  return new;
end;
$$;

create or replace trigger profiles_plan_change
  before update of plan_id on public.profiles
  for each row execute function public.track_plan_change();

-- 4) Subscriptions dipakai sebagai catatan penjualan (manual sekarang, payment gateway nanti).
-- Penjualan yang dibatalkan/refund ditandai refunded_at (status 'canceled') dan tidak dihitung sebagai pendapatan.
alter table public.subscriptions
  add column if not exists amount_idr integer not null default 0 check (amount_idr >= 0),
  add column if not exists months integer not null default 1 check (months between 1 and 36),
  add column if not exists kind text not null default 'new' check (kind in ('new', 'renewal', 'upgrade', 'downgrade')),
  add column if not exists payment_method text,
  add column if not exists note text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists paid_at timestamptz not null default now(),
  add column if not exists refunded_at timestamptz;
create index if not exists subscriptions_paid_at_idx on public.subscriptions (paid_at);

-- Ubah paket user + catat siapa yang mengubah. Turun ke Free = berhenti berlangganan.
create or replace function public.bo_change_plan(p_user uuid, p_plan text, p_actor uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from plans where id = p_plan) then raise exception 'invalid_plan'; end if;
  perform set_config('markethink.actor', coalesce(p_actor::text, ''), true);
  perform set_config('markethink.note', coalesce(p_note, ''), true);
  update profiles set plan_id = p_plan, updated_at = now() where id = p_user and plan_id <> p_plan;
  if p_plan = 'beta' then
    update subscriptions
       set status = 'canceled', current_period_end = least(current_period_end, greatest(current_period_start, now())), updated_at = now()
     where user_id = p_user and status in ('active', 'trialing') and current_period_end > now();
  end if;
end;
$$;

-- Catat penjualan: perpanjangan paket yang sama menyambung dari tanggal habis sebelumnya.
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
                             amount_idr, months, kind, payment_method, note, created_by, paid_at)
  values (p_user, p_plan, 'active', 'manual', v_start, v_start + make_interval(months => p_months),
          p_amount, p_months, v_kind, nullif(trim(p_method), ''), nullif(trim(p_note), ''), p_actor, coalesce(p_paid_at, now()))
  returning id into v_id;

  if v_cur_plan <> p_plan then
    perform set_config('markethink.actor', coalesce(p_actor::text, ''), true);
    perform set_config('markethink.note', 'Penjualan dicatat (' || v_kind || ')', true);
    update profiles set plan_id = p_plan, updated_at = now() where id = p_user;
  end if;
  return v_id;
end;
$$;

-- Ringkasan bisnis untuk halaman utama back office. "Pelanggan" = akun selain admin & anggota tim back office.
create or replace function public.bo_overview()
returns table (
  total_accounts bigint,
  internal_accounts bigint,
  customers bigint,
  free_users bigint,
  paying_users bigint,
  new_today bigint,
  new_7d bigint,
  new_this_month bigint,
  new_last_month bigint,
  active_30d bigint,
  mrr_idr numeric,
  revenue_this_month bigint,
  revenue_last_month bigint,
  revenue_total bigint,
  sales_this_month bigint,
  new_paid_this_month bigint,
  renewals_this_month bigint,
  upgrades_this_month bigint,
  churn_this_month bigint,
  expiring_7d bigint,
  overdue bigint,
  paid_without_record bigint,
  waitlist bigint,
  waitlist_this_month bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with
  m as (
    select
      (date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta') as this_month,
      ((date_trunc('month', now() at time zone 'Asia/Jakarta') - interval '1 month') at time zone 'Asia/Jakarta') as last_month
  ),
  cust as (select * from profiles p where p.role = 'user' and not exists (select 1 from backoffice_members b where b.user_id = p.id)),
  sales as (select s.* from subscriptions s join cust c on c.id = s.user_id where s.refunded_at is null),
  until as (
    select user_id, max(current_period_end) as until
    from subscriptions where status in ('active', 'trialing')
    group by user_id
  ),
  paying as (select c.id, u.until from cust c left join until u on u.user_id = c.id where c.plan_id <> 'beta')
  select
    (select count(*) from profiles),
    (select count(*) from profiles p where p.role <> 'user' or exists (select 1 from backoffice_members b where b.user_id = p.id)),
    (select count(*) from cust),
    (select count(*) from cust where plan_id = 'beta'),
    (select count(*) from paying),
    (select count(*) from cust where created_at >= credit_day_start()),
    (select count(*) from cust where created_at >= now() - interval '7 days'),
    (select count(*) from cust, m where created_at >= m.this_month),
    (select count(*) from cust, m where created_at >= m.last_month and created_at < m.this_month),
    (select count(*) from cust where last_active_at >= now() - interval '30 days'),
    (select coalesce(sum(amount_idr::numeric / months), 0) from sales
      where status in ('active', 'trialing') and current_period_start <= now() and current_period_end > now()),
    (select coalesce(sum(amount_idr), 0) from sales, m where paid_at >= m.this_month),
    (select coalesce(sum(amount_idr), 0) from sales, m where paid_at >= m.last_month and paid_at < m.this_month),
    (select coalesce(sum(amount_idr), 0) from sales),
    (select count(*) from sales, m where paid_at >= m.this_month),
    (select count(*) from sales, m where paid_at >= m.this_month and kind = 'new'),
    (select count(*) from sales, m where paid_at >= m.this_month and kind = 'renewal'),
    (select count(*) from sales, m where paid_at >= m.this_month and kind = 'upgrade'),
    (select count(*) from plan_changes pc join cust c on c.id = pc.user_id, m
      where pc.created_at >= m.this_month and pc.to_plan = 'beta' and pc.from_plan <> 'beta'),
    (select count(*) from paying where until between now() and now() + interval '7 days'),
    (select count(*) from paying where until < now()),
    (select count(*) from paying where until is null),
    (select count(*) from waitlist),
    (select count(*) from waitlist, m where created_at >= m.this_month);
$$;

-- Deret bulanan: pendaftar, pendapatan, jenis penjualan, berhenti langganan.
create or replace function public.bo_monthly(p_months integer default 12)
returns table (
  month date,
  signups bigint,
  revenue bigint,
  sales bigint,
  new_paid bigint,
  renewals bigint,
  upgrades bigint,
  churn bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with
  months as (
    select generate_series(
      date_trunc('month', now() at time zone 'Asia/Jakarta')::date - make_interval(months => p_months - 1),
      date_trunc('month', now() at time zone 'Asia/Jakarta')::date,
      interval '1 month'
    )::date as month
  ),
  cust as (select p.id, p.created_at from profiles p where p.role = 'user' and not exists (select 1 from backoffice_members b where b.user_id = p.id)),
  s as (
    select date_trunc('month', s.paid_at at time zone 'Asia/Jakarta')::date as month, s.kind, s.amount_idr
    from subscriptions s join cust c on c.id = s.user_id
    where s.refunded_at is null
  )
  select
    mo.month,
    (select count(*) from cust where date_trunc('month', created_at at time zone 'Asia/Jakarta')::date = mo.month),
    (select coalesce(sum(amount_idr), 0) from s where s.month = mo.month),
    (select count(*) from s where s.month = mo.month),
    (select count(*) from s where s.month = mo.month and kind = 'new'),
    (select count(*) from s where s.month = mo.month and kind = 'renewal'),
    (select count(*) from s where s.month = mo.month and kind = 'upgrade'),
    (select count(*) from plan_changes pc join cust c on c.id = pc.user_id
      where pc.to_plan = 'beta' and pc.from_plan <> 'beta'
        and date_trunc('month', pc.created_at at time zone 'Asia/Jakarta')::date = mo.month)
  from months mo
  order by mo.month;
$$;

-- Komposisi pelanggan & MRR per paket.
create or replace function public.bo_plan_mix()
returns table (plan_id text, plan_name text, monthly_price_idr integer, customers bigint, active_subs bigint, mrr_idr numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.monthly_price_idr,
    (select count(*) from profiles pr where pr.plan_id = p.id and pr.role = 'user' and not exists (select 1 from backoffice_members b where b.user_id = pr.id)),
    (select count(*) from subscriptions s join profiles pr on pr.id = s.user_id
      where s.plan_id = p.id and pr.role = 'user' and not exists (select 1 from backoffice_members b where b.user_id = pr.id) and s.status in ('active', 'trialing')
        and s.current_period_start <= now() and s.current_period_end > now()),
    (select coalesce(sum(s.amount_idr::numeric / s.months), 0) from subscriptions s join profiles pr on pr.id = s.user_id
      where s.plan_id = p.id and pr.role = 'user' and not exists (select 1 from backoffice_members b where b.user_id = pr.id) and s.status in ('active', 'trialing')
        and s.current_period_start <= now() and s.current_period_end > now())
  from plans p
  order by p.sort_order;
$$;

-- Daftar pelanggan dengan ringkasan langganan (cari, filter, urutkan, halaman).
create or replace function public.bo_customer_list(
  p_search text default null,
  p_plan text default null,
  p_status text default 'all',
  p_sort text default 'newest',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  internal boolean,
  plan_id text,
  banned boolean,
  created_at timestamptz,
  plan_started_at timestamptz,
  last_active_at timestamptz,
  first_paid_at timestamptz,
  active_until timestamptz,
  total_paid bigint,
  payments bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with agg as (
    select
      user_id,
      min(paid_at) filter (where refunded_at is null) as first_paid_at,
      max(current_period_end) filter (where status in ('active', 'trialing')) as active_until,
      coalesce(sum(amount_idr) filter (where refunded_at is null), 0) as total_paid,
      count(*) filter (where refunded_at is null) as payments
    from subscriptions
    group by user_id
  ),
  base as (
    select
      p.id, p.email, p.full_name, p.role, (p.role <> 'user' or b.user_id is not null) as internal, p.plan_id, p.banned, p.created_at, p.plan_started_at, p.last_active_at,
      a.first_paid_at, a.active_until, coalesce(a.total_paid, 0)::bigint as total_paid, coalesce(a.payments, 0)::bigint as payments
    from profiles p
    left join agg a on a.user_id = p.id
    left join backoffice_members b on b.user_id = p.id
    where (coalesce(p_search, '') = '' or p.email ilike '%' || p_search || '%' or p.full_name ilike '%' || p_search || '%')
      and (coalesce(p_plan, '') = '' or p.plan_id = p_plan)
      and case coalesce(p_status, 'all')
        when 'paying' then b.user_id is null and p.role = 'user' and p.plan_id <> 'beta'
        when 'free' then b.user_id is null and p.role = 'user' and p.plan_id = 'beta'
        when 'expiring' then b.user_id is null and p.role = 'user' and p.plan_id <> 'beta' and a.active_until between now() and now() + interval '7 days'
        when 'overdue' then b.user_id is null and p.role = 'user' and p.plan_id <> 'beta' and a.active_until < now()
        when 'no_record' then b.user_id is null and p.role = 'user' and p.plan_id <> 'beta' and a.active_until is null
        when 'churned' then b.user_id is null and p.role = 'user' and p.plan_id = 'beta' and a.payments > 0
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
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'track_plan_change()',
    'bo_change_plan(uuid, text, uuid, text)',
    'bo_record_sale(uuid, text, integer, integer, text, text, uuid, timestamptz)',
    'bo_overview()',
    'bo_monthly(integer)',
    'bo_plan_mix()',
    'bo_customer_list(text, text, text, text, integer, integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;


-- ===== 20261009000018_backoffice_accounts.sql =====
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
