begin;

create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  timezone text not null default 'Africa/Cairo' check (char_length(btrim(timezone)) between 1 and 64),
  currency char(3) not null default 'EGP' check (currency = upper(currency)),
  locale text not null default 'ar-EG' check (char_length(btrim(locale)) between 2 and 16),
  logo_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  capacity integer check (capacity is null or capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,id),
  unique (tenant_id,branch_id,name),
  foreign key (tenant_id,branch_id) references public.branches(tenant_id,id) on delete cascade
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  sort_order integer not null default 0 check (sort_order >= 0),
  active boolean not null default true,
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
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,id),
  unique (tenant_id,name),
  unique nulls not distinct (tenant_id,code)
);

create table public.staff_profiles (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 160),
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id,user_id),
  foreign key (tenant_id,user_id) references public.memberships(tenant_id,user_id) on delete cascade
);

alter table public.branches
  add constraint branches_tenant_id_id_key unique (tenant_id,id);

alter table public.students
  add column grade_id uuid,
  add constraint students_tenant_branch_fk
    foreign key (tenant_id,branch_id) references public.branches(tenant_id,id) on delete restrict,
  add constraint students_tenant_grade_fk
    foreign key (tenant_id,grade_id) references public.grades(tenant_id,id) on delete restrict;

alter table public.cohorts
  add column grade_id uuid,
  add column subject_id uuid,
  add column room_id uuid,
  add constraint cohorts_tenant_id_id_key unique (tenant_id,id),
  add constraint cohorts_tenant_branch_fk
    foreign key (tenant_id,branch_id) references public.branches(tenant_id,id) on delete restrict,
  add constraint cohorts_tenant_grade_fk
    foreign key (tenant_id,grade_id) references public.grades(tenant_id,id) on delete restrict,
  add constraint cohorts_tenant_subject_fk
    foreign key (tenant_id,subject_id) references public.subjects(tenant_id,id) on delete restrict,
  add constraint cohorts_tenant_room_fk
    foreign key (tenant_id,room_id) references public.rooms(tenant_id,id) on delete restrict,
  add constraint cohorts_tenant_teacher_fk
    foreign key (tenant_id,teacher_user_id) references public.memberships(tenant_id,user_id) on delete restrict;

alter table public.enrollments
  add constraint enrollments_tenant_cohort_fk
    foreign key (tenant_id,cohort_id) references public.cohorts(tenant_id,id) on delete cascade,
  add constraint enrollments_tenant_student_fk
    foreign key (tenant_id,student_id) references public.students(tenant_id,id) on delete cascade;

alter table public.students
  add constraint students_tenant_id_id_key unique (tenant_id,id);

alter table public.class_sessions
  add column branch_id uuid,
  add column room_id uuid,
  add constraint class_sessions_tenant_cohort_fk
    foreign key (tenant_id,cohort_id) references public.cohorts(tenant_id,id) on delete cascade,
  add constraint class_sessions_tenant_branch_fk
    foreign key (tenant_id,branch_id) references public.branches(tenant_id,id) on delete restrict,
  add constraint class_sessions_tenant_room_fk
    foreign key (tenant_id,room_id) references public.rooms(tenant_id,id) on delete restrict,
  add constraint class_sessions_tenant_creator_fk
    foreign key (tenant_id,created_by) references public.memberships(tenant_id,user_id) on delete restrict,
  add constraint class_sessions_tenant_id_id_key unique (tenant_id,id);

alter table public.attendance
  add constraint attendance_tenant_session_fk
    foreign key (tenant_id,session_id) references public.class_sessions(tenant_id,id) on delete cascade,
  add constraint attendance_tenant_student_fk
    foreign key (tenant_id,student_id) references public.students(tenant_id,id) on delete cascade,
  add constraint attendance_tenant_marker_fk
    foreign key (tenant_id,marked_by) references public.memberships(tenant_id,user_id) on delete restrict;

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
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (valid_until is null or valid_until >= valid_from),
  unique (tenant_id,id),
  foreign key (tenant_id,cohort_id) references public.cohorts(tenant_id,id) on delete cascade,
  foreign key (tenant_id,branch_id) references public.branches(tenant_id,id) on delete restrict,
  foreign key (tenant_id,room_id) references public.rooms(tenant_id,id) on delete restrict,
  foreign key (tenant_id,teacher_user_id) references public.memberships(tenant_id,user_id) on delete restrict
);

create type public.schedule_exception_kind as enum ('cancelled','rescheduled','holiday');

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
  unique nulls not distinct (tenant_id,schedule_id,exception_date,kind),
  foreign key (tenant_id,schedule_id) references public.recurring_schedules(tenant_id,id) on delete cascade,
  foreign key (tenant_id,created_by) references public.memberships(tenant_id,user_id) on delete restrict,
  check (
    (kind = 'rescheduled' and replacement_starts_at is not null and replacement_ends_at is not null and replacement_ends_at > replacement_starts_at)
    or (kind <> 'rescheduled' and replacement_starts_at is null and replacement_ends_at is null)
  )
);

create index rooms_branch_active_idx on public.rooms(tenant_id,branch_id) where active;
create index grades_tenant_order_idx on public.grades(tenant_id,sort_order) where active;
create index subjects_tenant_order_idx on public.subjects(tenant_id,sort_order) where active;
create index staff_profiles_active_idx on public.staff_profiles(tenant_id) where active;
create index students_grade_active_idx on public.students(tenant_id,grade_id) where active;
create index cohorts_academic_idx on public.cohorts(tenant_id,grade_id,subject_id) where active;
create index cohorts_room_active_idx on public.cohorts(tenant_id,room_id) where active;
create index recurring_schedules_cohort_idx on public.recurring_schedules(tenant_id,cohort_id,weekday) where active;
create index recurring_schedules_teacher_idx on public.recurring_schedules(tenant_id,teacher_user_id,weekday) where active;
create index recurring_schedules_room_idx on public.recurring_schedules(tenant_id,room_id,weekday) where active;
create index schedule_exceptions_date_idx on public.schedule_exceptions(tenant_id,exception_date);

-- Legacy text columns students.grade and cohorts.subject remain temporarily for
-- seed transformation only. They are removed after the reset/seed path maps
-- their values into grades/subjects IDs.

commit;
