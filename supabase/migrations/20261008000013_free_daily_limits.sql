-- Batas harian paket Free (di luar kredit): 20 chat, 2 gambar, 1 PPT per hari (WIB).
-- Paket lain tanpa per_day = hanya dibatasi kredit.
insert into public.feature_flags (plan_id, key, enabled, value) values
  ('beta', 'chat', true, '{"per_day": 20}'),
  ('pro', 'chat', true, null),
  ('promax', 'chat', true, null)
on conflict (plan_id, key) do update set enabled = excluded.enabled, value = excluded.value;

update public.feature_flags set enabled = true, value = '{"per_day": 2}' where plan_id = 'beta' and key = 'image_gen';
update public.feature_flags set enabled = true, value = '{"per_day": 1}' where plan_id = 'beta' and key = 'pptx';
