begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.account_type as enum ('center','independent_teacher');
create type public.tenant_status as enum ('active','suspended');
create type public.member_role as enum ('owner','admin','teacher','receptionist','accountant');
create type public.attendance_status as enum ('present','absent','late','excused');
create type public.invoice_status as enum ('draft','due','partial','paid','void');
create type public.schedule_exception_kind as enum ('cancelled','rescheduled','holiday');

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  display_name text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = btrim(email))
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  slug citext not null unique check (slug::text ~ '^[a-z0-9-]{3,60}$'),
  account_type public.account_type not null,
  status public.tenant_status not null default 'active',
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  timezone text not null default 'Africa/Cairo' check (char_length(btrim(timezone)) between 1 and 64),
  currency char(3) not null default 'EGP' check (currency = upper(currency)),
  locale text not null default 'ar-EG' check (char_length(btrim(locale)) between 2 and 16),
  logo_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.member_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id,user_id)
);

create table public.staff_profiles (
  tenant_id uuid not null,
  user_id uuid not null,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 160),
  phone text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id,user_id),
  foreign key (tenant_id,user_id) references public.memberships(tenant_id,user_id) on delete cascade
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  address text,
  phone text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,id),
  unique (tenant_id,name)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  branch_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  capacity integer check (capacity is null or capacity > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,id),
  unique (tenant_id,branch_id,name),
  foreign key (tenant_id,branch_id) references public.branches(tenant_id,id) on delete restrict
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  sort_order integer not null default 0 check (sort_order >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,id),
  unique (tenant_id,name)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  code text,
  sort_order integer not null default 0 check (sort_order >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,id),
  unique (tenant_id,name)
);
create unique index subjects_tenant_code_uidx on public.subjects(tenant_id,code) where code is not null;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid,
  grade_id uuid,
  code text not null check (char_length(btrim(code)) between 1 and 64),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 160),
  phone text,
  joined_on date not null default current_date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,id),
  unique (tenant_id,code),
  foreign key (tenant_id,branch_id) references public.branches(tenant_id,id) on delete restrict,
  foreign key (tenant_id,grade_id) references public.grades(tenant_id,id) on delete restrict
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 160),
  phone text not null,
  normalized_phone text not null,
  email citext,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,id),
  unique (tenant_id,normalized_phone)
);

create table public.student_guardians (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null,
  guardian_id uuid not null,
  relationship text not null default 'guardian',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (tenant_id,student_id,guardian_id),
  foreign key (tenant_id,student_id) references public.students(tenant_id,id) on delete cascade,
  foreign key (tenant_id,guardian_id) references public.guardians(tenant_id,id) on delete cascade
);
create unique index student_guardians_one_primary_idx on public.student_guardians(tenant_id,student_id) where is_primary;

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid,
  grade_id uuid,
  subject_id uuid,
  room_id uuid,
  teacher_user_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  capacity integer check (capacity is null or capacity > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,id),
  foreign key (tenant_id,branch_id) references public.branches(tenant_id,id) on delete restrict,
  foreign key (tenant_id,grade_id) references public.grades(tenant_id,id) on delete restrict,
  foreign key (tenant_id,subject_id) references public.subjects(tenant_id,id) on delete restrict,
  foreign key (tenant_id,room_id) references public.rooms(tenant_id,id) on delete restrict,
  foreign key (tenant_id,teacher_user_id) references public.memberships(tenant_id,user_id) on delete restrict
);

create table public.enrollments (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cohort_id uuid not null,
  student_id uuid not null,
  enrolled_on date not null default current_date,
  ended_on date,
  end_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id,cohort_id,student_id),
  foreign key (tenant_id,cohort_id) references public.cohorts(tenant_id,id) on delete cascade,
  foreign key (tenant_id,student_id) references public.students(tenant_id,id) on delete cascade,
  check (ended_on is null or ended_on >= enrolled_on),
  check ((ended_on is null and end_reason is null) or ended_on is not null)
);

create table public.recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cohort_id uuid not null,
  branch_id uuid,
  room_id uuid,
  teacher_user_id uuid,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  valid_from date not null,
  valid_until date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,id),
  foreign key (tenant_id,cohort_id) references public.cohorts(tenant_id,id) on delete cascade,
  foreign key (tenant_id,branch_id) references public.branches(tenant_id,id) on delete restrict,
  foreign key (tenant_id,room_id) references public.rooms(tenant_id,id) on delete restrict,
  foreign key (tenant_id,teacher_user_id) references public.memberships(tenant_id,user_id) on delete restrict,
  check (ends_at > starts_at),
  check (valid_until is null or valid_until >= valid_from)
);

create table public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  schedule_id uuid,
  exception_date date not null,
  kind public.schedule_exception_kind not null,
  replacement_starts_at timestamptz,
  replacement_ends_at timestamptz,
  reason text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  foreign key (tenant_id,schedule_id) references public.recurring_schedules(tenant_id,id) on delete cascade,
  foreign key (tenant_id,created_by) references public.memberships(tenant_id,user_id) on delete restrict,
  check (
    (kind = 'rescheduled' and replacement_starts_at is not null and replacement_ends_at is not null and replacement_ends_at > replacement_starts_at)
    or (kind <> 'rescheduled' and replacement_starts_at is null and replacement_ends_at is null)
  )
);
create unique index schedule_exceptions_scoped_uidx on public.schedule_exceptions(tenant_id,schedule_id,exception_date,kind) where schedule_id is not null;
create unique index schedule_exceptions_tenant_holiday_uidx on public.schedule_exceptions(tenant_id,exception_date,kind) where schedule_id is null;

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cohort_id uuid not null,
  branch_id uuid,
  room_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz,
  notes text,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,id),
  foreign key (tenant_id,cohort_id) references public.cohorts(tenant_id,id) on delete cascade,
  foreign key (tenant_id,branch_id) references public.branches(tenant_id,id) on delete restrict,
  foreign key (tenant_id,room_id) references public.rooms(tenant_id,id) on delete restrict,
  foreign key (tenant_id,created_by) references public.memberships(tenant_id,user_id) on delete restrict,
  check (ends_at is null or ends_at > starts_at),
  check ((cancelled_at is null and cancellation_reason is null) or cancelled_at is not null)
);

create table public.attendance (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id uuid not null,
  student_id uuid not null,
  status public.attendance_status not null,
  marked_by uuid not null,
  marked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id,session_id,student_id),
  foreign key (tenant_id,session_id) references public.class_sessions(tenant_id,id) on delete cascade,
  foreign key (tenant_id,student_id) references public.students(tenant_id,id) on delete cascade,
  foreign key (tenant_id,marked_by) references public.memberships(tenant_id,user_id) on delete restrict
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
  updated_at timestamptz not null default now(),
  unique (tenant_id,id),
  foreign key (tenant_id,student_id) references public.students(tenant_id,id) on delete restrict
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
  created_at timestamptz not null default now(),
  foreign key (tenant_id,invoice_id) references public.invoices(tenant_id,id) on delete restrict,
  foreign key (tenant_id,received_by) references public.memberships(tenant_id,user_id) on delete restrict
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid references public.tenants(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index memberships_user_active_idx on public.memberships(user_id) where active;
create index staff_profiles_active_idx on public.staff_profiles(tenant_id) where archived_at is null;
create index branches_tenant_active_idx on public.branches(tenant_id) where archived_at is null;
create index rooms_branch_active_idx on public.rooms(tenant_id,branch_id) where archived_at is null;
create index grades_tenant_order_idx on public.grades(tenant_id,sort_order) where archived_at is null;
create index subjects_tenant_order_idx on public.subjects(tenant_id,sort_order) where archived_at is null;
create index students_tenant_name_idx on public.students(tenant_id,full_name);
create index students_branch_active_idx on public.students(tenant_id,branch_id) where archived_at is null;
create index students_grade_active_idx on public.students(tenant_id,grade_id) where archived_at is null;
create index guardians_tenant_phone_idx on public.guardians(tenant_id,normalized_phone);
create index student_guardians_guardian_idx on public.student_guardians(tenant_id,guardian_id);
create index cohorts_tenant_active_idx on public.cohorts(tenant_id) where archived_at is null;
create index cohorts_teacher_active_idx on public.cohorts(tenant_id,teacher_user_id) where archived_at is null;
create index cohorts_academic_idx on public.cohorts(tenant_id,grade_id,subject_id) where archived_at is null;
create index cohorts_room_active_idx on public.cohorts(tenant_id,room_id) where archived_at is null;
create index enrollments_student_active_idx on public.enrollments(tenant_id,student_id) where ended_on is null;
create index recurring_schedules_cohort_idx on public.recurring_schedules(tenant_id,cohort_id,weekday) where archived_at is null;
create index recurring_schedules_teacher_idx on public.recurring_schedules(tenant_id,teacher_user_id,weekday) where archived_at is null;
create index recurring_schedules_room_idx on public.recurring_schedules(tenant_id,room_id,weekday) where archived_at is null;
create index schedule_exceptions_date_idx on public.schedule_exceptions(tenant_id,exception_date);
create index sessions_cohort_starts_idx on public.class_sessions(tenant_id,cohort_id,starts_at desc);
create index attendance_student_idx on public.attendance(tenant_id,student_id);
create index invoices_tenant_status_due_idx on public.invoices(tenant_id,status,due_date);
create index invoices_student_status_idx on public.invoices(tenant_id,student_id,status);
create index payments_invoice_paid_idx on public.payments(tenant_id,invoice_id,paid_at desc);
create index audit_tenant_created_idx on public.audit_logs(tenant_id,created_at desc);

commit;
