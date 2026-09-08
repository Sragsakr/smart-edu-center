BEGIN;

create type public.tenant_status as enum ('active', 'suspended');

alter table public.tenants
  add column status public.tenant_status not null default 'active';

create index tenants_status_idx on public.tenants(status);

create or replace function private.set_tenant_status(target_tenant_id uuid, next_status public.tenant_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status public.tenant_status;
begin
  if not private.is_platform_admin() then
    raise exception using errcode = '42501', message = 'platform administrator access required';
  end if;

  select status into current_status
  from public.tenants
  where id = target_tenant_id
  for update;

  if current_status is null then
    raise exception using errcode = 'P0002', message = 'tenant not found';
  end if;

  if current_status = next_status then
    return;
  end if;

  update public.tenants
  set status = next_status, updated_at = now()
  where id = target_tenant_id;

  update public.memberships
  set active = (next_status = 'active')
  where tenant_id = target_tenant_id;

  insert into public.platform_audit_logs (
    actor_user_id, action, entity_type, entity_id, details
  ) values (
    (select auth.uid()),
    case when next_status = 'active' then 'tenant.activated' else 'tenant.suspended' end,
    'tenant',
    target_tenant_id::text,
    jsonb_build_object('from', current_status, 'to', next_status)
  );
end;
$$;

create function public.set_tenant_status(target_tenant_id uuid, next_status public.tenant_status)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_tenant_status(target_tenant_id, next_status); $$;

revoke all on function private.set_tenant_status(uuid, public.tenant_status) from public, anon;
revoke all on function public.set_tenant_status(uuid, public.tenant_status) from public, anon;
grant execute on function private.set_tenant_status(uuid, public.tenant_status) to authenticated;
grant execute on function public.set_tenant_status(uuid, public.tenant_status) to authenticated;

COMMIT;