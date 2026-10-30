-- Id tagihan di gateway (mis. id "payment request" Mayar) untuk cek status & mencocokkan webhook.
alter table public.payments add column if not exists gateway_ref text;
create index if not exists payments_gateway_ref_idx on public.payments (gateway_ref) where gateway_ref is not null;
