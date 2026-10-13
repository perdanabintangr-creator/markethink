-- Chat & hasil Tools Pro bisa disematkan di atas riwayat sidebar dan diurutkan dengan drag & drop (null = tidak disematkan).
alter table public.chats add column if not exists pin_order integer;
alter table public.tool_runs add column if not exists pin_order integer;
