-- Projects (= workspaces): memory per project agar konteks antar project/klien tidak tercampur.
-- workspace_id null = memory umum (chat di luar project).
alter table public.memories
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
create index if not exists memories_user_workspace_idx on public.memories (user_id, workspace_id);
