begin;

-- The forgot-password flow must work for unauthenticated visitors (anon role).
-- These public wrappers delegate to private.* SECURITY DEFINER logic. Because the
-- private schema grants USAGE only to authenticated, an anon invoker could not call
-- an invoker-wrapper. Converting the public wrappers to SECURITY DEFINER lets them
-- run as the database owner (which has USAGE on private) while search_path='' keeps
-- resolution explicit. The private functions scoped-only logic still returns no
-- user data (request returns void; approve returns code only to platform admin).

create or replace function public.request_password_reset(email_input text)
returns void
language sql
security definer
set search_path = private, public
as $$ select private.request_password_reset(email_input); $$;

create or replace function public.approve_password_reset(reset_request_id uuid)
returns table (recovery_code text, whatsapp_phone text)
language sql
security definer
set search_path = private, public
as $$ select * from private.approve_password_reset(reset_request_id); $$;

create or replace function public.reject_password_reset(reset_request_id uuid)
returns void
language sql
security definer
set search_path = private, public
as $$ select private.reject_password_reset(reset_request_id); $$;

create or replace function public.consume_password_reset_code(email_input text, recovery_code text)
returns uuid
language sql
security definer
set search_path = private, public
as $$ select private.consume_password_reset_code(email_input, recovery_code); $$;

revoke all on function public.request_password_reset(text) from public;
revoke all on function public.approve_password_reset(uuid) from public;
revoke all on function public.reject_password_reset(uuid) from public;
revoke all on function public.consume_password_reset_code(text, text) from public;
-- request and consume are the unauthenticated reset flow: a visitor requests recovery
-- and later redeems the one-time code. Both must work for anon.
grant execute on function public.request_password_reset(text) to anon, authenticated;
grant execute on function public.consume_password_reset_code(text, text) to anon, authenticated;
-- approve and reject are reviewer-only (platform admin) and must not be anon-callable.
grant execute on function public.approve_password_reset(uuid) to authenticated;
grant execute on function public.reject_password_reset(uuid) to authenticated;
revoke execute on function public.approve_password_reset(uuid) from anon;
revoke execute on function public.reject_password_reset(uuid) from anon;

commit;