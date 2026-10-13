-- Hasil tools bisa disembunyikan dari riwayat sidebar (tetap dihitung kuota; tidak dihapus).
alter table public.tool_runs add column if not exists hidden boolean not null default false;
