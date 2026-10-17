-- Personalisasi jawaban (Pengaturan → Personalisasi): gaya jawaban & instruksi khusus user.
alter table public.profiles
  add column if not exists response_style text not null default 'seimbang',
  add column if not exists custom_instructions text not null default '';

alter table public.profiles
  drop constraint if exists profiles_response_style_check,
  add constraint profiles_response_style_check check (response_style in ('seimbang', 'santai', 'profesional', 'singkat')),
  drop constraint if exists profiles_custom_instructions_len,
  add constraint profiles_custom_instructions_len check (char_length(custom_instructions) <= 1500);
