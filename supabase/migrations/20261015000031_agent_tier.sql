-- Otak yang dipilih untuk misi (associate | director).
alter table public.agent_runs add column if not exists tier text not null default 'associate';
