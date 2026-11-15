-- Tim Otak: pemeriksaan jawaban oleh Kritikus + Pemeriksa Fakta (bawaan menyala; bisa dimatikan di Pengaturan → Personalisasi).
alter table public.profiles add column if not exists team_review boolean not null default true;
grant update (team_review) on public.profiles to authenticated;
