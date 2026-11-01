-- Nomor WhatsApp pengguna (wajib diisi saat onboarding; format 62xxxxxxxxx).
alter table public.profiles add column if not exists whatsapp text;
alter table public.profiles drop constraint if exists profiles_whatsapp_format;
alter table public.profiles add constraint profiles_whatsapp_format check (whatsapp is null or whatsapp ~ '^628[0-9]{7,12}$');
grant update (whatsapp) on public.profiles to authenticated;
