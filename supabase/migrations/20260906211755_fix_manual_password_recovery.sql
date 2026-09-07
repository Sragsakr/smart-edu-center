begin;

-- The initial manual-password-recovery functions used `extensions.gen_random_bytes` /
-- `extensions.digest` via an unwrapped search_path, which fails because the functions
-- run with `set search_path = ''`. This corrective migration redefines the functions
-- with fully-qualified pgcrypto calls so the recovery loop works on hosted Supabase,
-- where pgcrypto lives in the `extensions` schema.

create or replace function private.approve_password_reset(reset_request_id uuid)
returns table (recovery_code text, whatsapp_phone text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  reset_request public.password_reset_requests%rowtype;
  generated_code text := upper(encode(extensions.gen_random_bytes(4), 'hex'));
begin
  if not private.is_platform_admin() then
    raise exception using errcode = '42501', message = 'platform administrator access required';
  end if;

  select * into reset_request
  from public.password_reset_requests
  where id = reset_request_id
  for update;

  if reset_request.id is null then
    raise exception using errcode = 'P0002', message = 'password reset request not found';
  end if;
  if reset_request.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'password reset request is no longer pending';
  end if;

  update public.password_reset_requests
  set status = 'code_ready',
      code_hash = extensions.digest(generated_code, 'sha256'),
      code_expires_at = now() + interval '15 minutes',
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = reset_request.id;

  insert into public.platform_audit_logs (
    actor_user_id, action, entity_type, entity_id, details
  ) values (
    (select auth.uid()),
    'password_reset.approved',
    'password_reset_request',
    reset_request.id::text,
    jsonb_build_object('applicant_user_id', reset_request.user_id)
  );

  return query select generated_code, reset_request.whatsapp_phone;
end;
$$;

create or replace function private.consume_password_reset_code(email_input text, recovery_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reset_request public.password_reset_requests%rowtype;
  normalized_email text := lower(btrim(email_input));
  normalized_code text := upper(btrim(recovery_code));
begin
  select reset.* into reset_request
  from public.password_reset_requests reset
  where lower(reset.requested_email) = normalized_email
    and reset.status = 'code_ready'
  order by reset.created_at desc
  limit 1
  for update;

  if reset_request.id is null then
    return null;
  end if;

  if reset_request.code_expires_at <= now() or reset_request.failed_attempts >= 5 then
    update public.password_reset_requests set status = 'expired' where id = reset_request.id;
    return null;
  end if;

  if extensions.digest(normalized_code, 'sha256') <> reset_request.code_hash then
    update public.password_reset_requests
    set failed_attempts = failed_attempts + 1,
        status = case when failed_attempts + 1 >= 5 then 'expired'::public.password_reset_status else status end
    where id = reset_request.id;
    return null;
  end if;

  update public.password_reset_requests
  set status = 'consumed', consumed_at = now()
  where id = reset_request.id;

  return reset_request.user_id;
end;
$$;

grant execute on function private.approve_password_reset(uuid) to authenticated;
grant execute on function private.consume_password_reset_code(text, text) to anon, authenticated;
grant execute on function public.approve_password_reset(uuid) to authenticated;
grant execute on function public.consume_password_reset_code(text, text) to anon, authenticated;

commit;