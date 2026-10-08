-- Paket ketiga: Promax (otak Director + kredit terbesar). Free = id 'beta'.
insert into public.plans (id, name, description, daily_credits, monthly_price_idr, is_public, sort_order)
values ('promax', 'Promax', 'Semua otak termasuk Director (paling pintar) + kredit terbesar', 2000, 0, false, 2)
on conflict (id) do nothing;

update public.plans set name = 'Free' where id = 'beta';

insert into public.feature_flags (plan_id, key, enabled, value) values
  ('beta', 'tier.director', false, null),
  ('pro', 'tier.director', false, null),
  ('promax', 'tier.junior', true, null),
  ('promax', 'tier.senior', true, null),
  ('promax', 'tier.associate', true, null),
  ('promax', 'tier.director', true, null),
  ('promax', 'research', true, null),
  ('promax', 'uploads', true, '{"max_mb": 25}'),
  ('promax', 'workspaces', true, '{"max": 200}')
on conflict (plan_id, key) do nothing;
