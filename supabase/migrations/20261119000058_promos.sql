-- Slot promosi di sidebar kiri (ACC founder 19 Nov 2026): slide otomatis berisi promosi Marqthink atau brand lain
-- (sponsor diberi label "Sponsor"). Dikelola dari back office; tampil untuk Free & berbayar (bisa dibatasi per paket).
create table if not exists public.promos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  subtitle text check (subtitle is null or char_length(subtitle) <= 160),
  eyebrow text check (eyebrow is null or char_length(eyebrow) <= 30),
  cta_label text not null default 'Lihat' check (char_length(cta_label) between 1 and 30),
  link_url text not null check (link_url ~ '^(/|https://)'),
  image_url text check (image_url is null or image_url ~ '^https://'),
  theme text not null default 'midnight' check (theme in ('midnight', 'aurora', 'sunrise', 'ink')),
  brand text check (brand is null or char_length(brand) <= 60),
  sponsored boolean not null default false,
  -- null = semua paket; selain itu daftar id paket (beta, starter, pro, promax).
  plans text[],
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.promos enable row level security;
drop policy if exists "read live promos" on public.promos;
create policy "read live promos" on public.promos for select to authenticated
  using (active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
grant select on public.promos to authenticated;

-- Statistik harian per promosi (tayangan & klik) — untuk laporan ke brand sponsor.
create table if not exists public.promo_stats (
  promo_id uuid not null references public.promos(id) on delete cascade,
  day date not null default ((now() at time zone 'Asia/Jakarta')::date),
  views integer not null default 0,
  clicks integer not null default 0,
  primary key (promo_id, day)
);
alter table public.promo_stats enable row level security;

create or replace function public.promo_track(p_promo uuid, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('view', 'click') or not exists (select 1 from promos where id = p_promo) then
    return;
  end if;
  insert into promo_stats (promo_id, day, views, clicks)
  values (p_promo, (now() at time zone 'Asia/Jakarta')::date, (p_kind = 'view')::int, (p_kind = 'click')::int)
  on conflict (promo_id, day) do update
    set views = promo_stats.views + excluded.views, clicks = promo_stats.clicks + excluded.clicks;
end;
$$;
revoke all on function public.promo_track(uuid, text) from public, anon;
grant execute on function public.promo_track(uuid, text) to authenticated;

-- Gambar promosi (publik, diunggah dari back office).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('promos', 'promos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- 3 slide awal Marqthink.
insert into public.promos (title, subtitle, eyebrow, cta_label, link_url, theme, brand, sort_order, plans)
select * from (values
  ('Setiap jawaban dicek Tim Otak', 'Kritikus & Pemeriksa Fakta memeriksa angka dan klaim sebelum kamu pakai.', 'Baru', 'Coba sekarang', '/chat', 'midnight', 'Marqthink', 1, null::text[]),
  ('Strategi lengkap dalam hitungan menit', 'Persona, kompetitor, kampanye & kalender konten, siap jadi PPT dan Excel.', 'Smart Tools', 'Buka Smart Tools', '/tools', 'aurora', 'Marqthink', 2, null::text[]),
  ('Otak Head & Director untuk strategi kelas konsultan', 'Jatah lebih besar dan analisis lebih dalam untuk brand yang serius tumbuh.', 'Upgrade', 'Lihat paket', '/pricing', 'sunrise', 'Marqthink', 3, array['beta', 'starter', 'pro'])
) as v(title, subtitle, eyebrow, cta_label, link_url, theme, brand, sort_order, plans)
where not exists (select 1 from public.promos);
