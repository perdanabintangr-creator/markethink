-- Visual Director: rencana visual per slide (perlu gambar? subjek, adegan, prompt, zona teks) + metadata biaya per gambar.
alter table public.social_posts add column if not exists visual_plan jsonb;
alter table public.usage_logs add column if not exists meta jsonb;
