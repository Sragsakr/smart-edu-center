begin;

create type public.workspace_request_status as enum (
  'pending_approval',
  'approved',
  'rejected'
);

-- Platform-scoped security tables intentionally have no tenant_id. They govern
-- access before a tenant exists and are isolated from tenant-owned data.
create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workspace_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  account_type text not null check (account_type in ('center', 'independent_teacher')),
  workspace_name text not null check (char_length(workspace_name) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9-]{3,60}$'),
  status public.workspace_request_status not null default 'pending_approval',
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) between 3 and 500),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  tenant_id uuid unique references public.tenants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'pending_approval' and reviewed_by is null and reviewed_at is null and tenant_id is null and rejection_reason is null)
    or (status = 'approved' and reviewed_by is not null and reviewed_at is not null and tenant_id is not null and rejection_reason is null)
    or (status = 'rejected' and reviewed_by is not null and reviewed_at is not null and tenant_id is null and rejection_reason is not null)
  )
);

create unique index workspace_requests_active_slug_idx
  on public.workspace_requests(slug)
  where status in ('pending_approval', 'approved');
create index workspace_requests_review_queue_idx
  on public.workspace_requests(status, created_at);

create table public.platform_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index platform_audit_created_idx
  on public.platform_audit_logs(created_at desc);

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admins admin
    where admin.user_id = (select auth.uid())
  );
$$;

create or replace function private.ensure_workspace_slug_available()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.tenants tenant where tenant.slug = new.slug) then
    raise exception using errcode = '23505', message = 'workspace slug is already in use';
  end if;
  return new;
end;
$$;

create trigger ensure_workspace_request_slug_available
before insert or update of slug on public.workspace_requests
for each row execute function private.ensure_workspace_slug_available();

create or replace function public.approve_workspace_request(request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.workspace_requests%rowtype;
  new_tenant_id uuid;
begin
  if not private.is_platform_admin() then
    raise exception using errcode = '42501', message = 'platform administrator access required';
  end if;

  select * into request
  from public.workspace_requests
  where id = request_id
  for update;

  if request.id is null then
    raise exception using errcode = 'P0002', message = 'workspace request not found';
  end if;

  if request.status <> 'pending_approval' then
    raise exception using errcode = 'P0001', message = 'workspace request is no longer pending';
  end if;

  insert into public.tenants (name, slug, account_type, created_by)
  values (request.workspace_name, request.slug, request.account_type, request.user_id)
  returning id into new_tenant_id;

  insert into public.memberships (tenant_id, user_id, role)
  values (new_tenant_id, request.user_id, 'owner');

  update public.workspace_requests
  set status = 'approved',
      tenant_id = new_tenant_id,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      updated_at = now()
  where id = request.id;

  insert into public.platform_audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    (select auth.uid()),
    'workspace_request.approved',
    'workspace_request',
    request.id::text,
    jsonb_build_object('tenant_id', new_tenant_id, 'applicant_user_id', request.user_id)
  );

  return new_tenant_id;
end;
$$;

create or replace function public.reject_workspace_request(request_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.workspace_requests%rowtype;
  clean_reason text := btrim(reason);
begin
  if not private.is_platform_admin() then
    raise exception using errcode = '42501', message = 'platform administrator access required';
  end if;

  if char_length(clean_reason) not between 3 and 500 then
    raise exception using errcode = '22023', message = 'rejection reason must be between 3 and 500 characters';
  end if;

  select * into request
  from public.workspace_requests
  where id = request_id
  for update;

  if request.id is null then
    raise exception using errcode = 'P0002', message = 'workspace request not found';
  end if;

  if request.status <> 'pending_approval' then
    raise exception using errcode = 'P0001', message = 'workspace request is no longer pending';
  end if;

  update public.workspace_requests
  set status = 'rejected',
      rejection_reason = clean_reason,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      updated_at = now()
  where id = request.id;

  insert into public.platform_audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    (select auth.uid()),
    'workspace_request.rejected',
    'workspace_request',
    request.id::text,
    jsonb_build_object('applicant_user_id', request.user_id, 'reason', clean_reason)
  );
end;
$$;

revoke all on function public.approve_workspace_request(uuid) from public;
revoke all on function public.reject_workspace_request(uuid, text) from public;
grant execute on function public.approve_workspace_request(uuid) to authenticated;
grant execute on function public.reject_workspace_request(uuid, text) to authenticated;
grant execute on function private.is_platform_admin() to authenticated;

-- Workspace creation is now exclusively performed by the reviewed approval RPC.
-- Removing this policy closes the previous self-service tenant creation path.
drop policy tenants_insert on public.tenants;

alter table public.platform_admins enable row level security;
alter table public.workspace_requests enable row level security;
alter table public.platform_audit_logs enable row level security;

create policy platform_admins_select_own
on public.platform_admins for select to authenticated
using (user_id = (select auth.uid()));

create policy workspace_requests_select
on public.workspace_requests for select to authenticated
using (user_id = (select auth.uid()) or private.is_platform_admin());

create policy workspace_requests_insert_own
on public.workspace_requests for insert to authenticated
with check (
  user_id = (select auth.uid())
  and email = (select auth.jwt() ->> 'email')
  and status = 'pending_approval'
  and reviewed_by is null
  and reviewed_at is null
  and tenant_id is null
  and rejection_reason is null
);

create policy workspace_requests_resubmit_own
on public.workspace_requests for update to authenticated
using (user_id = (select auth.uid()) and status = 'rejected')
with check (
  user_id = (select auth.uid())
  and email = (select auth.jwt() ->> 'email')
  and status = 'pending_approval'
  and reviewed_by is null
  and reviewed_at is null
  and tenant_id is null
  and rejection_reason is null
);

create policy platform_audit_logs_select
on public.platform_audit_logs for select to authenticated
using (private.is_platform_admin());

commit;
