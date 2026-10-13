-- Urutan project di sidebar bisa diatur user (drag & drop). Null = belum diatur (project baru tampil paling atas).
alter table public.workspaces add column if not exists sort_order integer;
