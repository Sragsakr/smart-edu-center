begin;

create type public.workspace_request_status as enum ('pending_approval','approved','rejected');
create type public.invitation_status as enum ('pending','accepted','revoked','expired');
create type public.password_reset_status as enum ('pending','code_ready','rejected','consumed','expired');

create table public.platform_admins (
  user_id uuid primary key references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workspace_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  email citext not null,
  account_type public.account_type not null,
  workspace_name text not null check (char_length(btrim(workspace_name)) between 2 and 120),
  slug citext not null check (slug::text ~ '^[a-z0-9-]{3,60}$'),
  mobile_phone text check (mobile_phone is null or mobile_phone ~ '^\+[1-9][0-9]{7,14}$'),
  whatsapp_phone text check (whatsapp_phone is null or whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$'),
  status public.workspace_request_status not null default 'pending_approval',
  rejection_reason text check (rejection_reason is null or char_length(btrim(rejection_reason)) between 3 and 500),
  reviewed_by uuid references public.users(id) on delete set null,
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

create unique index workspace_requests_one_open_per_user_idx
  on public.workspace_requests(user_id)
  where status = 'pending_approval';
create unique index workspace_requests_active_slug_idx
  on public.workspace_requests(slug)
  where status in ('pending_approval','approved');
create index workspace_requests_queue_idx
  on public.workspace_requests(status,created_at);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email citext not null,
  role public.member_role not null,
  token_hash bytea not null unique,
  status public.invitation_status not null default 'pending',
  invited_by uuid not null references public.users(id) on delete restrict,
  accepted_by uuid references public.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (
    (status = 'pending' and accepted_by is null and accepted_at is null and revoked_at is null)
    or (status = 'accepted' and accepted_by is not null and accepted_at is not null and revoked_at is null)
    or (status = 'revoked' and accepted_at is null and revoked_at is not null)
    or (status = 'expired' and accepted_at is null)
  )
);

create unique index invitations_one_pending_email_per_tenant_idx
  on public.invitations(tenant_id,email)
  where status = 'pending';
create index invitations_lookup_idx on public.invitations(email,status,expires_at);
create index invitations_tenant_created_idx on public.invitations(tenant_id,created_at desc);

create table public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  requested_email citext not null,
  whatsapp_phone text not null check (whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$'),
  status public.password_reset_status not null default 'pending',
  code_hash bytea,
  code_expires_at timestamptz,
  failed_attempts smallint not null default 0 check (failed_attempts between 0 and 5),
  reviewed_by uuid references public.users(id) on delete set null,
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
create index password_reset_queue_idx on public.password_reset_requests(status,created_at);
create index password_reset_user_created_idx on public.password_reset_requests(user_id,created_at desc);

create table public.platform_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index platform_audit_created_idx on public.platform_audit_logs(created_at desc);
create index platform_audit_actor_idx on public.platform_audit_logs(actor_user_id,created_at desc);

commit;
