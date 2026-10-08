-- Pembuat gambar AI (berbayar per gambar, Gemini) — saklar admin, default mati sampai disetujui.
insert into public.app_settings (key, value) values ('image_gen', 'false') on conflict (key) do nothing;

-- Gambar: paket Pro & Promax. PPT: semua paket (biaya hanya kredit).
insert into public.feature_flags (plan_id, key, enabled, value) values
  ('beta', 'image_gen', false, null),
  ('pro', 'image_gen', true, null),
  ('promax', 'image_gen', true, null),
  ('beta', 'pptx', true, null),
  ('pro', 'pptx', true, null),
  ('promax', 'pptx', true, null)
on conflict (plan_id, key) do nothing;
