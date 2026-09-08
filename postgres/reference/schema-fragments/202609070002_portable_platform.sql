begin;

create type public.workspace_request_status as enum (
  'pending_approval',
  'approved',
  'rejected'
);

create type public.password_reset_status as enum (
  'pending',
  'code_ready',
  'rejected',
  'consumed',
  'expired'
);

create type public.tenant_status as enum ('active', 'suspended');

alter table public.tenants
  add column account_type text not null default 'center'
    check (account_type in ('center', 'independent_teacher')),
  add column status public.tenant_status not null default 'active';

create index tenants_account_type_idx on public.tenants(account_type);
create index tenants_status_idx on public.tenants(status);
create index tenants_created_by_idx on public.tenants(created_by);

create table public.platform_admins (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workspace_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users(id) on delete cascade,
  email text not null,
  account_type text not null check (account_type in ('center', 'independent_teacher')),
  workspace_name text not null check (char_length(workspace_name) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9-]{3,60}$'),
  mobile_phone text check (mobile_phone is null or mobile_phone ~ '^\+[1-9][0-9]{7,14}$'),
  whatsapp_phone text check (whatsapp_phone is null or whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$'),
  status public.workspace_request_status not null default 'pending_approval',
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) between 3 and 500),
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
create index workspace_requests_review_queue_idx
  on public.workspace_requests(status, created_at);
create index workspace_requests_reviewed_by_idx
  on public.workspace_requests(reviewed_by)
  where reviewed_by is not null;

create table public.platform_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.app_users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index platform_audit_created_idx on public.platform_audit_logs(created_at desc);
create index platform_audit_actor_idx on public.platform_audit_logs(actor_user_id);

create table public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  requested_email text not null,
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
create index password_reset_review_queue_idx
  on public.password_reset_requests(status, created_at);
create index password_reset_user_created_idx
  on public.password_reset_requests(user_id, created_at desc);
create index password_reset_reviewer_idx
  on public.password_reset_requests(reviewed_by)
  where reviewed_by is not null;

create index attendance_tenant_idx on public.attendance(tenant_id);
create index attendance_student_idx on public.attendance(student_id);
create index attendance_marked_by_idx on public.attendance(marked_by);
create index audit_actor_user_idx on public.audit_logs(actor_user_id);
create index branches_tenant_idx on public.branches(tenant_id);
create index class_sessions_tenant_idx on public.class_sessions(tenant_id);
create index class_sessions_created_by_idx on public.class_sessions(created_by);
create index cohorts_tenant_idx on public.cohorts(tenant_id);
create index cohorts_branch_idx on public.cohorts(branch_id);
create index cohorts_teacher_user_idx on public.cohorts(teacher_user_id);
create index enrollments_tenant_idx on public.enrollments(tenant_id);
create index enrollments_student_idx on public.enrollments(student_id);
create index guardians_tenant_idx on public.guardians(tenant_id);
create index invoices_tenant_idx on public.invoices(tenant_id);
create index payments_tenant_idx on public.payments(tenant_id);
create index payments_invoice_idx on public.payments(invoice_id);
create index payments_received_by_idx on public.payments(received_by);
create index student_guardians_tenant_idx on public.student_guardians(tenant_id);
create index student_guardians_guardian_idx on public.student_guardians(guardian_id);
create index students_branch_idx on public.students(branch_id);

-- Supabase-only RPCs, auth.uid()/auth.jwt() checks, authenticated/anon grants and
-- RLS policies intentionally stay out of the portable schema. Equivalent checks
-- move to the application authorization layer before PostgreSQL becomes primary.

commit;
