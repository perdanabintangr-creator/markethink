-- Diskusi hasil Tools Pro: tanya-jawab tentang hasil + revisi berdasarkan koreksi user.
create table if not exists public.tool_run_messages (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.tool_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists tool_run_messages_run_idx on public.tool_run_messages (run_id, created_at);
alter table public.tool_run_messages enable row level security;
create policy "own tool run messages" on public.tool_run_messages for select using (user_id = auth.uid());

-- Revisi = run baru yang merujuk run asal; tidak memotong kuota add-on (dibatasi jumlahnya per run asal).
alter table public.tool_runs add column if not exists revision_of uuid references public.tool_runs(id) on delete set null;
alter table public.tool_runs add column if not exists revision_note text;
create index if not exists tool_runs_revision_idx on public.tool_runs (revision_of);

-- Biaya diskusi hasil Tools Pro ikut tampil di rincian biaya back office.
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
    from u where tier in ('image','deck_image','pptx','tool_chat') or tier like 'tool:%' group by tier
  ) x
  where events > 0 or cost_usd > 0
  order by cost_usd desc;
$$;
