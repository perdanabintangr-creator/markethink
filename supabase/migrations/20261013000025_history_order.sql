-- Urutan manual riwayat chat di sidebar (drag & drop). Null = ikut waktu aktivitas terakhir.
-- Nilai = angka urut (semakin besar semakin atas), default memakai epoch milidetik waktu aktivitas.
alter table public.chats add column if not exists sort_key double precision;
alter table public.tool_runs add column if not exists sort_key double precision;
