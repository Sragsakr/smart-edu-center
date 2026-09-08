begin;

create type public.password_reset_status as enum (
  'pending',
  'code_ready',
  'rejected',
  'consumed',
  'expired'
);

create table public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_email text not null,
  whatsapp_phone text not null check (whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$'),
  status public.password_reset_status not null default 'pending',
  code_hash bytea,
  code_expires_at timestamptz,
  failed_attempts smallint not null default 0 check (failed_attempts between 0 and 5),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (status = 'pending' and code_hash is null and code_expires_at is null and reviewed_by is null and reviewed_at is null and consumed_at is null)
    or (status = 'code_ready' and code_hash is not null and code_expires_at is not null and reviewed_by is not null and reviewed_at is not null and consumed_at is null)
    or (status = 'rejected' and code_hash is null and code_expires_at is null and reviewed_by is not null and reviewed_at is not null and consumed_at is null)
    or (status = 'consumed' and code_hash is not null and code_expires_at is not null and reviewed_by is not null and reviewed_at is not null and consumed_at is not null)
    or (status = 'expired' and consumed_at is null)
  )
);

create unique index password_reset_one_pending_per_user_idx
  on public.password_reset_requests(user_id)
  where status = 'pending';
create index password_reset_review_queue_idx
  on public.password_reset_requests(status, created_at);
create index password_reset_user_created_idx
  on public.password_reset_requests(user_id, created_at desc);
create index password_reset_reviewer_idx
  on public.password_reset_requests(reviewed_by)
  where reviewed_by is not null;

create or replace function private.request_password_reset(email_input text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account record;
  normalized_email text := lower(btrim(email_input));
begin
  select auth_user.id as user_id,
         auth_user.email,
         workspace.whatsapp_phone
  into account
  from auth.users auth_user
  join public.workspace_requests workspace
    on workspace.user_id = auth_user.id
   and workspace.status = 'approved'
   and workspace.whatsapp_phone is not null
  join public.memberships membership
    on membership.user_id = auth_user.id
   and membership.active
  where lower(auth_user.email) = normalized_email
  limit 1;

  if account.user_id is null then
    return;
  end if;

  if exists (
    select 1
    from public.password_reset_requests recent
    where recent.user_id = account.user_id
      and recent.created_at > now() - interval '60 seconds'
  ) then
    return;
  end if;

  update public.password_reset_requests previous
  set status = 'expired'
  where previous.user_id = account.user_id
    and previous.status in ('pending', 'code_ready');

  insert into public.password_reset_requests (
    user_id,
    requested_email,
    whatsapp_phone
  ) values (
    account.user_id,
    account.email,
    account.whatsapp_phone
  );
end;
$$;

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

create or replace function private.reject_password_reset(reset_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reset_request public.password_reset_requests%rowtype;
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
  set status = 'rejected',
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = reset_request.id;

  insert into public.platform_audit_logs (
    actor_user_id, action, entity_type, entity_id, details
  ) values (
    (select auth.uid()),
    'password_reset.rejected',
    'password_reset_request',
    reset_request.id::text,
    jsonb_build_object('applicant_user_id', reset_request.user_id)
  );
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

create function public.request_password_reset(email_input text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.request_password_reset(email_input); $$;

create function public.approve_password_reset(reset_request_id uuid)
returns table (recovery_code text, whatsapp_phone text)
language sql
security invoker
set search_path = ''
as $$ select * from private.approve_password_reset(reset_request_id); $$;

create function public.reject_password_reset(reset_request_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.reject_password_reset(reset_request_id); $$;

create function public.consume_password_reset_code(email_input text, recovery_code text)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.consume_password_reset_code(email_input, recovery_code); $$;

revoke all on function private.request_password_reset(text) from public;
revoke all on function private.approve_password_reset(uuid) from public;
revoke all on function private.reject_password_reset(uuid) from public;
revoke all on function private.consume_password_reset_code(text, text) from public;
grant execute on function private.request_password_reset(text) to anon, authenticated;
grant execute on function private.approve_password_reset(uuid) to authenticated;
grant execute on function private.reject_password_reset(uuid) to authenticated;
grant execute on function private.consume_password_reset_code(text, text) to anon, authenticated;

revoke all on function public.request_password_reset(text) from public;
revoke all on function public.approve_password_reset(uuid) from public;
revoke all on function public.reject_password_reset(uuid) from public;
revoke all on function public.consume_password_reset_code(text, text) from public;
grant execute on function public.request_password_reset(text) to anon, authenticated;
grant execute on function public.approve_password_reset(uuid) to authenticated;
grant execute on function public.reject_password_reset(uuid) to authenticated;
grant execute on function public.consume_password_reset_code(text, text) to anon, authenticated;

alter table public.password_reset_requests enable row level security;
create policy password_reset_requests_platform_admin_select
on public.password_reset_requests for select to authenticated
using (private.is_platform_admin());

commit;
