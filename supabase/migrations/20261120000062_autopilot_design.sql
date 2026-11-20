-- Autopilot Konten: gaya desain studio (referensi founder 20 Nov) + visual utama buatan AI per cover.
alter table public.social_posts add column if not exists design text not null default 'classic' check (design in ('glossy', 'bold', 'photo', 'classic'));
alter table public.social_posts add column if not exists image_regens integer not null default 0;
alter table public.autopilot_settings add column if not exists design text not null default 'auto' check (design in ('auto', 'glossy', 'bold', 'photo', 'classic'));
