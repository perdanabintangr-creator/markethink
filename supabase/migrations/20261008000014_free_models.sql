-- Paket Free: model gratis (Gemini free tier) dulu, Claude sebagai cadangan.
-- Pencarian web Claude (berbayar) untuk Free dibatasi 5 per hari; Google Search gratis tidak dihitung.
insert into public.feature_flags (plan_id, key, enabled, value) values
  ('beta', 'free_models', true, null),
  ('pro', 'free_models', false, null),
  ('promax', 'free_models', false, null),
  ('beta', 'web_search', true, '{"per_day": 5}'),
  ('pro', 'web_search', true, null),
  ('promax', 'web_search', true, null)
on conflict (plan_id, key) do update set enabled = excluded.enabled, value = excluded.value;
