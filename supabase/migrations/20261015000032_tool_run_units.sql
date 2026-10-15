-- Pemakaian kuota per hasil: otak Director memakai 2 kuota, lainnya 1.
alter table public.tool_runs add column if not exists quota_units integer not null default 1;
