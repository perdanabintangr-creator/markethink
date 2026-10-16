-- Paket Free: Riset Web (pencarian Google) dimatikan untuk menekan biaya. Baca tautan & upload file tetap ada.
update public.feature_flags set enabled = false where plan_id = 'beta' and key in ('research', 'web_search');
