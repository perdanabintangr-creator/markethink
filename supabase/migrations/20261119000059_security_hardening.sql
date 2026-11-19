-- Audit keamanan (19 Nov 2026). Pertahanan berlapis di database — berlaku walau ada bug di kode server.

-- 1) Fungsi internal: jangan bisa dipanggil dari luar (anon/authenticated) lewat /rest/v1/rpc.
revoke all on function public.get_quota_status(uuid) from public, anon, authenticated;
grant execute on function public.get_quota_status(uuid) to service_role;
alter function public.credit_month_start() set search_path = public;
alter function public.credit_week_start() set search_path = public;
alter function public.credit_day_start() set search_path = public;

-- 2) Data turunan wajib menempel ke induk milik user sendiri (cegah menyisipkan data ke chat/kanvas/project orang lain).
alter policy "own messages" on public.messages
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid()));

alter policy "own canvas versions" on public.canvas_versions
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.canvases c where c.id = canvas_id and c.user_id = auth.uid()));

alter policy "own canvases" on public.canvases
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (chat_id is null or exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid())));

alter policy "own chats" on public.chats
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (workspace_id is null or exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
    and (source_run_id is null or exists (select 1 from public.tool_runs r where r.id = source_run_id and r.user_id = auth.uid()))
    and (source_agent_id is null or exists (select 1 from public.agent_runs a where a.id = source_agent_id and a.user_id = auth.uid()))
  );

alter policy "own feedback" on public.message_feedback
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid()));

alter policy "own outcomes" on public.strategy_outcomes
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid())
    and (workspace_id is null or exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid()))
  );

alter policy "own memories" on public.memories
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (workspace_id is null or exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid())));

-- 3) File: alamat penyimpanan wajib di folder milik user sendiri (server mengunduh file berdasarkan kolom ini).
alter policy "own attachments" on public.attachments
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and storage_path like auth.uid()::text || '/%' and storage_path not like '%..%');

alter policy "own workspace files" on public.workspace_files
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid() and storage_path like auth.uid()::text || '/%' and storage_path not like '%..%'
    and exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid())
  );

alter policy "own chunks" on public.document_chunks
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.workspace_files f where f.id = file_id and f.user_id = auth.uid() and f.workspace_id = document_chunks.workspace_id)
  );

-- 4) Tabel yang hanya boleh ditulis server: cabut hak tulis langsung (RLS sudah menolak; ini lapis kedua).
revoke insert, update, delete on public.credit_ledger, public.payments, public.payment_events, public.subscriptions,
  public.addon_subscriptions, public.usage_logs, public.tool_runs, public.tool_run_messages, public.tool_watchers,
  public.agent_runs, public.plans, public.feature_flags, public.app_settings, public.agents, public.addons,
  public.addon_bundles, public.plan_changes, public.promos, public.promo_stats,
  public.backoffice_users, public.backoffice_sessions, public.backoffice_members
  from anon, authenticated;
revoke select on public.backoffice_users, public.backoffice_sessions, public.backoffice_members, public.payment_events,
  public.plan_changes, public.promo_stats from anon, authenticated;
-- anon (belum login) tidak perlu menulis tabel apa pun.
revoke insert, update, delete on all tables in schema public from anon;

-- Profil: user tidak membuat profil sendiri (dibuat trigger saat daftar) → cabut INSERT; buka kolom personalisasi yang memang diubah user.
revoke insert on public.profiles from anon, authenticated;
grant update (response_style, custom_instructions) on public.profiles to authenticated;

-- 5) Statistik promosi tidak bisa digelembungkan: hanya server yang mencatat, sekali per user per hari per jenis.
create table if not exists public.promo_seen (
  promo_id uuid not null references public.promos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('view', 'click')),
  primary key (promo_id, user_id, day, kind)
);
alter table public.promo_seen enable row level security;
revoke all on public.promo_seen from anon, authenticated;

-- Versi lama (dipanggil langsung oleh user) dimatikan.
revoke all on function public.promo_track(uuid, text) from public, anon, authenticated;
create or replace function public.promo_track(p_promo uuid, p_kind text, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_day date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if p_kind not in ('view', 'click') or not exists (select 1 from promos where id = p_promo) then
    return;
  end if;
  insert into promo_seen (promo_id, user_id, day, kind) values (p_promo, p_user, v_day, p_kind) on conflict do nothing;
  if not found then
    return;
  end if;
  insert into promo_stats (promo_id, day, views, clicks)
  values (p_promo, v_day, (p_kind = 'view')::int, (p_kind = 'click')::int)
  on conflict (promo_id, day) do update
    set views = promo_stats.views + excluded.views, clicks = promo_stats.clicks + excluded.clicks;
end;
$$;
revoke all on function public.promo_track(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.promo_track(uuid, text, uuid) to service_role;

-- 6) Pembatas jumlah permintaan (rate limit) tanpa layanan tambahan: jendela tetap per kunci.
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into rate_limits (key, window_start, hits) values (p_key, v_start, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into v_hits;
  -- Bersihkan jendela lama sesekali (±1% panggilan).
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_limit;
end;
$$;
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
