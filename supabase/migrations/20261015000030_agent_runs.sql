-- Markethink Agent: satu tujuan → beberapa Tools Pro dijalankan berurutan → ringkasan paket.
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal text not null,
  context text not null default '',
  title text,
  -- Rencana: [{ tool, why, status: pending|running|ok|error|skipped, run_id, error }]
  plan jsonb not null default '[]'::jsonb,
  status text not null default 'planned' check (status in ('planned', 'running', 'done', 'error')),
  summary text,
  chat_id uuid references public.chats(id) on delete set null,
  cost_usd numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agent_runs_user_idx on public.agent_runs (user_id, created_at desc);
alter table public.agent_runs enable row level security;
create policy "own agent runs" on public.agent_runs for select using (user_id = auth.uid());

-- Hasil tool yang dibuat oleh Agent ditandai, agar bisa dikelompokkan.
alter table public.tool_runs add column if not exists agent_run_id uuid references public.agent_runs(id) on delete set null;
create index if not exists tool_runs_agent_idx on public.tool_runs (agent_run_id);

-- Chat "Bahas paket di Chat" dari misi Agent (tampil di mode Tools Pro).
alter table public.chats add column if not exists source_agent_id uuid references public.agent_runs(id) on delete set null;
