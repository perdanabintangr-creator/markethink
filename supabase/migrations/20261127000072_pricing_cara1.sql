-- Harga & jatah baru "Cara 1" (ACC founder 27 Nov 2026): batas bawah margin 45% pada kondisi terburuk
-- (kuota habis, bayar Virtual Account, gambar termahal). Kredit tetap memotong sesuai modal asli (1 kredit = Rp100).
-- Pelanggan yang sudah membayar tetap aktif sampai masa paketnya habis; harga baru berlaku saat beli/perpanjang.

-- Paket chat
update public.plans set monthly_credits = 30, daily_credits = 5, weekly_credits = 10 where id = 'beta';
update public.plans set monthly_price_idr = 59000, monthly_credits = 250, daily_credits = 25, weekly_credits = 60 where id = 'starter';
update public.plans set monthly_price_idr = 179000, monthly_credits = 900, daily_credits = 80, weekly_credits = 210 where id = 'pro';
update public.plans set monthly_price_idr = 259000, monthly_credits = 1350, daily_credits = 120, weekly_credits = 315 where id = 'promax';

-- Paket Autopilot Konten + jatah "ganti gambar" bulanan (menutup celah modal gambar)
alter table public.content_plans add column if not exists image_regens_per_month integer not null default 10;
update public.content_plans set price_idr = 149000, posts_per_week = 3, posts_per_month = 12, inner_visuals = 2, image_regens_per_month = 6, updated_at = now() where id = 'konten_lite';
update public.content_plans set price_idr = 229000, posts_per_week = 5, posts_per_month = 20, inner_visuals = 2, image_regens_per_month = 10, updated_at = now() where id = 'konten_pro';
update public.content_plans set price_idr = 589000, posts_per_week = 10, posts_per_month = 40, inner_visuals = 4, image_regens_per_month = 15, updated_at = now() where id = 'konten_bisnis';

-- Bundel Pro + Konten Pro (harga satuan Rp408.000)
update public.combo_offers set price_idr = 389000 where id = 'combo_pro_konten';
