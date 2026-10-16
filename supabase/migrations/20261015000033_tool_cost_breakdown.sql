-- Rincian biaya per tahap tiap hasil Tools Pro (kata kunci, pencarian, temuan riset, laporan, perbaikan) — untuk analisa margin.
alter table public.tool_runs add column if not exists cost_breakdown jsonb not null default '[]'::jsonb;
