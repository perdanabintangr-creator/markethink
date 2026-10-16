-- Penanda chat yang sedang dijawab AI (untuk ikon loading di riwayat & melanjutkan jawaban saat user pindah chat).
alter table public.chats add column if not exists generating_at timestamptz;
