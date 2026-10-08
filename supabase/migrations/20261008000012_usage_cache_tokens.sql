-- Token prompt cache Claude (untuk memantau penghematan biaya).
alter table public.usage_logs add column if not exists cache_read_tokens integer not null default 0;
alter table public.usage_logs add column if not exists cache_write_tokens integer not null default 0;
