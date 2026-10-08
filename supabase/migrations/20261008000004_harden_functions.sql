-- Temuan Supabase security advisor.
alter function public.credit_day_start() set search_path = public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
