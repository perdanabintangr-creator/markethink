-- Saklar pencarian web Claude (berbayar per pencarian) — diatur admin di /admin/quota.
insert into public.app_settings (key, value) values ('web_search', 'false') on conflict (key) do nothing;
