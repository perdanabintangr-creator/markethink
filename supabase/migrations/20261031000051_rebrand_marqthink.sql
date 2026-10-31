-- Rebranding Markethink → Marqthink (keputusan founder 31 Okt 2026): teks deskripsi paket.
update public.plans set description = replace(description, 'Markethink', 'Marqthink') where description like '%Markethink%';
