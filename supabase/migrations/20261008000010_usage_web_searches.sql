alter table public.usage_logs add column if not exists web_searches integer not null default 0;
