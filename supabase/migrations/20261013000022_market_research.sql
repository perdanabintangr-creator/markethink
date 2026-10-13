-- Add-on "Riset Pasar Pro" menjadi "Market Research Pro": tambah tools ukuran pasar, persona, studi kelayakan & desain survei.
-- Harga & kuota tidak berubah.
update public.addons
   set name = 'Market Research Pro',
       tagline = 'Riset pasar ala konsultan: ukuran pasar, persona, kompetitor, kelayakan & survei',
       updated_at = now()
 where id = 'riset_pro' and name = 'Riset Pasar Pro';
