begin;

create extension if not exists pgcrypto;

create type public.member_role as enum ('owner','admin','teacher','receptionist','accountant');
create type public.attendance_status as enum ('present','absent','late','excused');
create type public.invoice_status as enum ('draft','due','partial','paid','void');

-- Application-owned user identities. During the database migration this table
-- receives the UUIDs currently stored in Supabase auth.users so foreign keys stay stable.
create table public.app_users (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  role public.member_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (tenant_id,user_id)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  code text not null,
  full_name text not null,
  phone text,
  grade text,
  active boolean not null default true,
  joined_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique(tenant_id,code)
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  created_at timestamptz not null default now()
);

create table public.student_guardians (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  relationship text not null default 'guardian',
  primary key(student_id,guardian_id)
);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  subject text,
  teacher_user_id uuid references public.app_users(id),
  capacity integer check(capacity is null or capacity>0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  enrolled_on date not null default current_date,
  active boolean not null default true,
  primary key(cohort_id,student_id)
);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  notes text,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  check(ends_at is null or ends_at>starts_at)
);

create table public.attendance (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status public.attendance_status not null,
  marked_by uuid not null references public.app_users(id),
  marked_at timestamptz not null default now(),
  primary key(session_id,student_id)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  title text not null,
  amount numeric(12,2) not null check(amount>=0),
  due_date date,
  status public.invoice_status not null default 'due',
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount numeric(12,2) not null check(amount>0),
  method text not null default 'cash',
  reference text,
  received_by uuid not null references public.app_users(id),
  paid_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_user_id uuid references public.app_users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index memberships_user_idx on public.memberships(user_id) where active;
create index students_tenant_name_idx on public.students(tenant_id,full_name);
create index sessions_cohort_starts_idx on public.class_sessions(cohort_id,starts_at desc);
create index invoices_student_status_idx on public.invoices(student_id,status);
create index audit_tenant_created_idx on public.audit_logs(tenant_id,created_at desc);

-- Supabase auth.uid(), authenticated grants and RLS policies intentionally do
-- not live in the portable schema. Authorization is being centralized in the
-- application layer before Supabase is removed.

commit;
