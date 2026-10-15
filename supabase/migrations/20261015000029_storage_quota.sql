-- Kuota penyimpanan file per paket (permintaan founder): Free 50 MB, Pro 1 GB, Promax 5 GB. Bisa diubah owner di back office.
-- Yang dihitung: file upload user (chat & dokumen project). File hasil (PPT/Excel/gambar buatan AI) tidak dihitung.
insert into public.feature_flags (plan_id, key, enabled, value) values
  ('beta', 'storage', true, '{"max_mb": 50}'),
  ('pro', 'storage', true, '{"max_mb": 1024}'),
  ('promax', 'storage', true, '{"max_mb": 5120}')
on conflict (plan_id, key) do nothing;

create or replace function public.storage_used_bytes(p_user uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select sum(size)::bigint from attachments where user_id = p_user and storage_path not like '%/generated/%'), 0)
       + coalesce((select sum(size)::bigint from workspace_files where user_id = p_user), 0);
$$;
revoke all on function public.storage_used_bytes(uuid) from public, anon, authenticated;
grant execute on function public.storage_used_bytes(uuid) to service_role;

-- Back office: ringkasan kapasitas (file storage & database) + pemakai terbesar.
create or replace function public.bo_storage_overview()
returns table (total_bytes bigint, upload_bytes bigint, generated_bytes bigint, files bigint, db_bytes bigint)
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    coalesce(sum((o.metadata->>'size')::bigint), 0),
    coalesce(sum((o.metadata->>'size')::bigint) filter (where o.name not like '%/generated/%'), 0),
    coalesce(sum((o.metadata->>'size')::bigint) filter (where o.name like '%/generated/%'), 0),
    count(*),
    pg_database_size(current_database())
  from storage.objects o;
$$;
revoke all on function public.bo_storage_overview() from public, anon, authenticated;
grant execute on function public.bo_storage_overview() to service_role;

create or replace function public.bo_storage_top(p_limit integer default 10)
returns table (user_id uuid, email text, plan_id text, bytes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.email, p.plan_id, storage_used_bytes(p.id) as bytes
  from profiles p
  order by bytes desc
  limit greatest(1, least(p_limit, 100));
$$;
revoke all on function public.bo_storage_top(integer) from public, anon, authenticated;
grant execute on function public.bo_storage_top(integer) to service_role;
