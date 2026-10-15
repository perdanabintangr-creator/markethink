-- Tools Pro dikelompokkan per role marketing: 8 add-on. Harga & kuota = DRAFT (bisa diubah owner di back office → Harga).
insert into public.addons (id, name, tagline, price_idr, monthly_quota, promax_quota, trial_quota, sort_order) values
  ('strategi_pro', 'Strategi & Brand', 'Marketing plan, brand guideline, campaign brief & rencana peluncuran produk', 75000, 6, 3, 1, 1),
  ('konten_pro', 'Konten & Sosmed', 'Kalender konten bulanan, naskah video pendek & audit akun media sosial', 50000, 15, 3, 1, 3),
  ('crm_pro', 'CRM & Retensi', 'Template WhatsApp, alur follow-up otomatis & program pelanggan setia', 30000, 10, 3, 1, 6),
  ('kolpr_pro', 'KOL & PR', 'Brief KOL, laporan performa KOL & siaran pers', 50000, 10, 3, 1, 7),
  ('laporan_pro', 'Laporan Marketing', 'Laporan marketing bulanan siap presentasi ke atasan atau klien', 50000, 8, 3, 1, 8)
on conflict (id) do nothing;

update public.addons set name = 'Market Research Pro', tagline = 'Riset pasar ala konsultan: ukuran pasar, persona, kompetitor, kelayakan & survei', sort_order = 2, updated_at = now() where id = 'riset_pro';
update public.addons set name = 'Iklan & Performance', tagline = 'Bikin variasi iklan siap tayang, rapor laporan iklan & kalkulator bisnis', sort_order = 4, updated_at = now() where id = 'dokter_iklan';
update public.addons set name = 'Jualan Online', tagline = 'Listing marketplace, skrip live selling & kalender promo marketplace', sort_order = 5, updated_at = now() where id = 'jualan_kit';
