-- Tombol Stop: penanda permintaan berhenti; jawaban yang sedang dibuat di server dihentikan bila penanda ini diisi.
alter table public.chats add column if not exists stop_requested_at timestamptz;
