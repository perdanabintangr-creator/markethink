-- Chat yang dibuka dari hasil Tools Pro ("Bahas di Chat"): satu hasil → satu chat (dibuka ulang bila diklik lagi).
alter table public.chats add column if not exists source_run_id uuid references public.tool_runs(id) on delete set null;
create index if not exists chats_source_run_idx on public.chats (source_run_id);
