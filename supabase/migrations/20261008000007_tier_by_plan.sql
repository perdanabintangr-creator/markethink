-- Paket gratis hanya Markethink Junior; Senior & Associate untuk paket Pro.
update public.feature_flags set enabled = false where plan_id = 'beta' and key in ('tier.senior','tier.associate');
update public.plans set name = 'Gratis', description = 'Akses gratis dengan Markethink Junior dan kuota harian' where id = 'beta';
update public.plans set description = 'Semua otak marketing: Junior, Senior, Associate' where id = 'pro';
