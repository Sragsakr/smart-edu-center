begin;

create extension if not exists pgcrypto;

create extension if not exists citext;

create type public.member_role as enum ('owner','admin','teacher','receptionist','accountant');
create type public.attendance_status as enum ('present','absent','late','excused');
create type public.invoice_status as enum ('draft','due','partial','paid','void');
create type public.workspace_request_status as enum ('pending_approval','approved','rejected');
create type public.password_reset_status as enum ('pending','code_ready','rejected','consumed','expired');
create type public.tenant_status as enum ('active','suspended');
create type public.invitation_status as enum ('pending','accepted','revoked','expired');

create table public.app_users (
  id uuid primary key,
  email citext not null unique,
  display_name text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  slug citext not null unique check (slug::text ~ '^[a-z0-9-]{3,60}$'),
  account_type text not null default 'center' check (account_type in ('center','independent_teacher')),
  status public.tenant_status not null default 'active',
  created_by uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id)
);

create table public.memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  role public.member_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invitee_email citext not null,
  role public.member_role not null,
  token_hash text not null unique,
  status public.invitation_status not null default 'pending',
  created_by uuid not null,
  accepted_by uuid references public.app_users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (tenant_id, created_by)
    references public.memberships(tenant_id, user_id) on delete restrict,
  check (expires_at > created_at),
  check (
    (status = 'pending' and accepted_by is null and accepted_at is null and revoked_at is null)
    or (status = 'accepted' and accepted_by is not null and accepted_at is not null and revoked_at is null)
    or (status = 'revoked' and accepted_at is null and revoked_at is not null)
    or (status = 'expired' and accepted_at is null)
  )
);

create unique index invitations_one_pending_email_per_tenant_idx
  on public.invitations(tenant_id, invitee_email)
  where status = 'pending';
create index invitations_lookup_idx on public.invitations(invitee_email, status, expires_at);
create index invitations_tenant_created_idx on public.invitations(tenant_id, created_at desc);

create table public.staff_profiles (
  tenant_id uuid not null,
  user_id uuid not null,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 160),
  phone text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id),
  foreign key (tenant_id, user_id)
    references public.memberships(tenant_id, user_id) on delete cascade
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid unique references public.app_users(id) on delete set null,
  branch_id uuid,
  code text not null,
  full_name text not null,
  phone text,
  grade text,
  active boolean not null default true,
  joined_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code),
  foreign key (tenant_id, branch_id)
    references public.branches(tenant_id, id) on delete set null
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid unique references public.app_users(id) on delete set null,
  full_name text not null,
  phone text not null,
  email citext,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table public.student_guardians (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null,
  guardian_id uuid not null,
  relationship text not null default 'guardian',
  primary key (student_id, guardian_id),
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete cascade,
  foreign key (tenant_id, guardian_id)
    references public.guardians(tenant_id, id) on delete cascade
);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid,
  name text not null,
  subject text,
  teacher_user_id uuid,
  capacity integer check (capacity is null or capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, branch_id)
    references public.branches(tenant_id, id) on delete set null,
  foreign key (tenant_id, teacher_user_id)
    references public.memberships(tenant_id, user_id) on delete restrict
);

create table public.enrollments (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cohort_id uuid not null,
  student_id uuid not null,
  enrolled_on date not null default current_date,
  active boolean not null default true,
  primary key (cohort_id, student_id),
  foreign key (tenant_id, cohort_id)
    references public.cohorts(tenant_id, id) on delete cascade,
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete cascade
);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cohort_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (ends_at is null or ends_at > starts_at),
  foreign key (tenant_id, cohort_id)
    references public.cohorts(tenant_id, id) on delete cascade,
  foreign key (tenant_id, created_by)
    references public.memberships(tenant_id, user_id) on delete restrict
);

create table public.attendance (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id uuid not null,
  student_id uuid not null,
  status public.attendance_status not null,
  marked_by uuid not null,
  marked_at timestamptz not null default now(),
  primary key (session_id, student_id),
  foreign key (tenant_id, session_id)
    references public.class_sessions(tenant_id, id) on delete cascade,
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete cascade,
  foreign key (tenant_id, marked_by)
    references public.memberships(tenant_id, user_id) on delete restrict
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null,
  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date,
  status public.invoice_status not null default 'due',
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete restrict
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid not null,
  amount numeric(12,2) not null check (amount > 0),
  method text not null default 'cash',
  reference text,
  received_by uuid not null,
  paid_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, invoice_id)
    references public.invoices(tenant_id, id) on delete restrict,
  foreign key (tenant_id, received_by)
    references public.memberships(tenant_id, user_id) on delete restrict
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, actor_user_id)
    references public.memberships(tenant_id, user_id) on delete restrict
);

create table public.platform_admins (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workspace_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users(id) on delete cascade,
  email citext not null,
  account_type text not null check (account_type in ('center', 'independent_teacher')),
  workspace_name text not null check (char_length(btrim(workspace_name)) between 2 and 120),
  slug citext not null check (slug::text ~ '^[a-z0-9-]{3,60}$'),
  mobile_phone text check (mobile_phone is null or mobile_phone ~ '^\+[1-9][0-9]{7,14}$'),
  whatsapp_phone text check (whatsapp_phone is null or whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$'),
  status public.workspace_request_status not null default 'pending_approval',
  rejection_reason text check (rejection_reason is null or char_length(btrim(rejection_reason)) between 3 and 500),
  reviewed_by uuid references public.app_users(id) on delete set null,
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

create table public.platform_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.app_users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  requested_email citext not null,
  whatsapp_phone text not null check (whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$'),
  status public.password_reset_status not null default 'pending',
  code_hash bytea,
  code_expires_at timestamptz,
  failed_attempts smallint not null default 0 check (failed_attempts between 0 and 5),
  reviewed_by uuid references public.app_users(id) on delete set null,
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

create table public.auth_password_credentials (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  password_digest text not null,
  password_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_digest text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  user_agent text,
  ip_address inet,
  check (expires_at > created_at),
  check (revoked_at is null or revoked_at >= created_at)
);

create index memberships_user_idx on public.memberships(user_id) where active;
create index tenants_account_type_idx on public.tenants(account_type);
create index tenants_status_idx on public.tenants(status);
create index tenants_created_by_idx on public.tenants(created_by);
create index staff_profiles_tenant_idx on public.staff_profiles(tenant_id);
create index branches_tenant_idx on public.branches(tenant_id);
create index students_tenant_name_idx on public.students(tenant_id, full_name);
create index students_user_idx on public.students(user_id) where user_id is not null;
create index guardians_tenant_idx on public.guardians(tenant_id);
create index guardians_user_idx on public.guardians(user_id) where user_id is not null;
create index student_guardians_tenant_idx on public.student_guardians(tenant_id);
create index cohorts_tenant_idx on public.cohorts(tenant_id);
create index cohorts_teacher_idx on public.cohorts(tenant_id, teacher_user_id);
create index enrollments_tenant_idx on public.enrollments(tenant_id);
create index sessions_cohort_starts_idx on public.class_sessions(tenant_id, cohort_id, starts_at desc);
create index attendance_tenant_idx on public.attendance(tenant_id);
create index invoices_student_status_idx on public.invoices(tenant_id, student_id, status);
create index payments_invoice_idx on public.payments(tenant_id, invoice_id);
create index audit_tenant_created_idx on public.audit_logs(tenant_id, created_at desc);
create index platform_audit_created_idx on public.platform_audit_logs(created_at desc);
create index platform_audit_actor_idx on public.platform_audit_logs(actor_user_id);
create index workspace_requests_queue_idx on public.workspace_requests(status, created_at);
create index workspace_requests_reviewed_by_idx on public.workspace_requests(reviewed_by) where reviewed_by is not null;
create index password_reset_queue_idx on public.password_reset_requests(status, created_at);
create index password_reset_user_created_idx on public.password_reset_requests(user_id, created_at desc);
create index password_reset_reviewer_idx on public.password_reset_requests(reviewed_by) where reviewed_by is not null;
create index auth_sessions_user_active_idx on public.auth_sessions(user_id, expires_at) where revoked_at is null;
create index auth_sessions_expiry_idx on public.auth_sessions(expires_at) where revoked_at is null;

revoke all on public.auth_password_credentials from public;
revoke all on public.auth_sessions from public;

comment on table public.auth_password_credentials is
  'Application-owned password credentials; password_digest contains a versioned salted KDF output.';
comment on table public.auth_sessions is
  'Application-owned opaque sessions; only token digests are persisted.';

-- Authorization is enforced by the application layer for this self-managed PostgreSQL target.

commit;
