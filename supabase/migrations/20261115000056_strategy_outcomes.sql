-- Tim Otak tahap 2 — Ingatan Hasil: user melaporkan hasil strategi dari jawaban AI (berhasil / biasa / tidak berhasil).
-- Dipakai sebagai konteks jawaban berikutnya (dalam lingkup project yang sama) & oleh Pemeriksaan Tim.
create table if not exists public.strategy_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  chat_id uuid not null references public.chats(id) on delete cascade,
  message_id text not null check (char_length(message_id) between 1 and 100),
  result text not null check (result in ('berhasil', 'biasa', 'gagal')),
  topic text not null check (char_length(topic) between 1 and 240),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, chat_id, message_id)
);
create index if not exists strategy_outcomes_user_idx on public.strategy_outcomes (user_id, workspace_id, created_at desc);
alter table public.strategy_outcomes enable row level security;
drop policy if exists "own outcomes" on public.strategy_outcomes;
create policy "own outcomes" on public.strategy_outcomes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.strategy_outcomes to authenticated;

-- Pemeriksaan Tim untuk hasil Smart Tools (Kampanye, Persona, Kompetitor, Kalender konten).
alter table public.tool_runs add column if not exists review jsonb;
