-- Smart Tools hanya untuk paket Pro & Promax (keputusan founder 29 Okt 2026).
-- Starter tidak lagi membuka Smart Tools; add-on per kelompok & bundel tidak dijual lagi (data pembelian lama tetap tersimpan).
update public.feature_flags set enabled = false where plan_id = 'starter' and key = 'tools_pro';
update public.addons set is_active = false;
update public.addon_bundles set is_active = false;
update public.plans set description = 'Junior & Senior, Riset Web, gambar AI & PPT' where id = 'starter';
update public.plans set description = 'Junior, Senior & Head, semua Smart Tools & Markethink Agent' where id = 'pro';
update public.plans set description = 'Semua otak termasuk Director, semua Smart Tools & Markethink Agent' where id = 'promax';
