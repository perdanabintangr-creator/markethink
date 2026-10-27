-- Pantau mingguan: Smart Tools dijalankan ulang otomatis tiap minggu dari hasil yang dipilih user.
create table public.tool_watchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tool text not null,
  input jsonb not null,
  title text not null,
  tier text not null default 'senior',
  active boolean not null default true,
  next_run_at timestamptz not null,
  last_run_at timestamptz,
  last_run_id uuid references public.tool_runs(id) on delete set null,
  last_status text,
  -- Hasil asal yang dipilih user untuk dipantau.
  source_run_id uuid references public.tool_runs(id) on delete set null,
  created_at timestamptz not null default now()
);
create index tool_watchers_due on public.tool_watchers (next_run_at) where active;
create index tool_watchers_user on public.tool_watchers (user_id);
alter table public.tool_watchers enable row level security;
create policy "own watchers" on public.tool_watchers for select using (user_id = auth.uid());
