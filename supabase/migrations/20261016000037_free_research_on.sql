-- Riset Web dibuka lagi untuk paket Free (biaya ±Rp17/pencarian), tetap dibatasi 5 pencarian/hari (feature_flags web_search per_day).
update public.feature_flags set enabled = true where plan_id = 'beta' and key in ('research', 'web_search');
