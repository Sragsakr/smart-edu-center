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
create type public.tenant_type as enum ('teacher','center');
create type public.product_level as enum ('operations','management_platform','learning_platform');
create type public.capability_kind as enum ('feature','addon','limit');
create type public.entitlement_state as enum ('active','pending','expired','revoked');
create type public.entitlement_source as enum ('plan','addon','trial','manual','promotion');
create type public.domain_kind as enum ('subdomain','custom');
create type public.domain_status as enum ('pending','verified','active','failed');
create type public.theme_mode as enum ('light','dark','system');
create type public.offering_mode as enum ('onsite','online','hybrid');

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
  tenant_type public.tenant_type not null,
  product_level public.product_level not null default 'operations',
  currency char(3) not null default 'EGP' check (currency::text ~ '^[A-Z]{3}$'),
  timezone text not null default 'Africa/Cairo' check (char_length(btrim(timezone)) between 3 and 64),
  locale text not null default 'ar' check (locale ~ '^[a-z]{2}(-[A-Za-z]{2,4})?$'),
  status public.tenant_status not null default 'active',
  created_by uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id)
);

-- كتالوج القدرات: نطاق المنصة (بلا tenant_id)، ويُشتق من src/lib/entitlements/capability-catalog.json
create table public.capability_catalog (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  kind public.capability_kind not null,
  included_from_level public.product_level,
  title_ar text not null check (char_length(btrim(title_ar)) between 2 and 160),
  description_ar text not null check (char_length(btrim(description_ar)) between 2 and 500),
  sort_order integer not null default 0,
  check ((kind = 'feature') = (included_from_level is not null))
);

-- حالة كل قدرة لكل مساحة: مصدر الحقيقة التجاري الفعلي
create table public.tenant_entitlements (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  capability_key text not null references public.capability_catalog(key) on delete restrict,
  state public.entitlement_state not null default 'active',
  source public.entitlement_source not null default 'plan',
  source_ref text,
  limits jsonb not null default '{}'::jsonb check (jsonb_typeof(limits) = 'object'),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  granted_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, capability_key),
  check (effective_to is null or effective_to > effective_from),
  check (source = 'plan' or source_ref is not null)
);

-- هوية المساحة: إعدادات بيانات لا fork ولا بناء منفصل
create table public.tenant_branding (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  public_name text check (public_name is null or char_length(btrim(public_name)) between 2 and 120),
  tagline text check (tagline is null or char_length(btrim(tagline)) between 2 and 200),
  logo_ref text,
  favicon_ref text,
  primary_color text not null default '#6547d9' check (primary_color ~* '^#[0-9a-f]{6}$'),
  secondary_color text check (secondary_color is null or secondary_color ~* '^#[0-9a-f]{6}$'),
  theme_mode public.theme_mode not null default 'light',
  support_email citext,
  support_phone text check (support_phone is null or support_phone ~ '^\+[1-9][0-9]{7,14}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- الدومينات: الـHost مدخل غير موثوق، ولا يُخمَّن منه الـTenant
create table public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  hostname citext not null unique check (
    hostname::text ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  ),
  kind public.domain_kind not null,
  status public.domain_status not null default 'pending',
  is_primary boolean not null default false,
  ssl_status text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  check ((status in ('verified','active')) = (verified_at is not null)),
  check (is_primary = false or status = 'active')
);

create unique index tenant_domains_one_primary_per_tenant_idx
  on public.tenant_domains(tenant_id)
  where is_primary;

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

-- ============================================================================
-- الكتالوج الأكاديمي: Subject وTeacher وCourse وCourse Offering مفاهيم منفصلة.
-- لا يوجد hard-link واحد بين Subject وTeacher؛ الربط عبر course_teachers.
-- المرجع: docs/adr/0003
-- ============================================================================

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  capacity integer check (capacity is null or capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, branch_id)
    references public.branches(tenant_id, id) on delete set null
);

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  order_index integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, name)
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  stage_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  order_index integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, stage_id, name),
  foreign key (tenant_id, stage_id)
    references public.stages(tenant_id, id) on delete cascade
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, name)
);

-- سجل مدرس مستقل عن memberships: يمكن وجوده بلا حساب دخول، ويُربط لاحقًا عند منحه عضوية.
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  membership_user_id uuid,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 160),
  phone text,
  bio text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, display_name),
  foreign key (tenant_id, membership_user_id)
    references public.memberships(tenant_id, user_id) on delete set null
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subject_id uuid not null,
  grade_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, grade_id, subject_id, title),
  foreign key (tenant_id, subject_id)
    references public.subjects(tenant_id, id) on delete restrict,
  foreign key (tenant_id, grade_id)
    references public.grades(tenant_id, id) on delete restrict
);

-- علاقة N:N بين المقرر والمدرس — لا ربط مباشر بين المادة والمدرس.
create table public.course_teachers (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  course_id uuid not null,
  teacher_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (course_id, teacher_id),
  -- مفتاح مركّب يسمح للعرض بالإشارة إلى الإسناد نفسه، فلا يقبل عرضًا بمدرس غير مسند للمقرر.
  unique (tenant_id, course_id, teacher_id),
  foreign key (tenant_id, course_id)
    references public.courses(tenant_id, id) on delete cascade,
  foreign key (tenant_id, teacher_id)
    references public.teachers(tenant_id, id) on delete cascade
);

-- الوحدة القابلة للبيع والتسجيل: مقرر + مدرس + فرع + قاعة + نمط + سعة + سعر.
create table public.course_offerings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  course_id uuid not null,
  teacher_id uuid not null,
  branch_id uuid,
  room_id uuid,
  mode public.offering_mode not null default 'onsite',
  capacity integer check (capacity is null or capacity > 0),
  price_amount numeric(12,2) not null default 0 check (price_amount >= 0),
  currency char(3) check (currency is null or currency::text ~ '^[A-Z]{3}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  -- الإسناد نفسه: لا يمكن بيع عرض بمدرس غير مسند للمقرر.
  foreign key (tenant_id, course_id, teacher_id)
    references public.course_teachers(tenant_id, course_id, teacher_id) on delete restrict,
  foreign key (tenant_id, branch_id)
    references public.branches(tenant_id, id) on delete set null,
  foreign key (tenant_id, room_id)
    references public.rooms(tenant_id, id) on delete set null
);

-- منع تكرار نفس العرض داخل نفس الفرع، مع السماح بعروض بلا فرع.
create unique index course_offerings_branch_identity_idx
  on public.course_offerings(tenant_id, course_id, teacher_id, branch_id)
  where branch_id is not null;
create unique index course_offerings_unassigned_branch_identity_idx
  on public.course_offerings(tenant_id, course_id, teacher_id)
  where branch_id is null;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete set null,
  branch_id uuid,
  grade_id uuid,
  code text not null,
  full_name text not null,
  phone text,
  active boolean not null default true,
  joined_on date not null default current_date,
  created_at timestamptz not null default now(),
  -- سجل الطالب قابل للتعديل مثل سجل ولي الأمر، فوجود `updated_at` هنا شرط
  -- لاتساق المخطط وتتبّع آخر تغيير على السجل.
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code),
  unique (tenant_id, user_id),
  foreign key (tenant_id, branch_id)
    references public.branches(tenant_id, id) on delete set null,
  foreign key (tenant_id, grade_id)
    references public.grades(tenant_id, id) on delete set null
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete set null,
  full_name text not null,
  phone text not null,
  email citext,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, user_id)
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

-- وحدة التسليم/الجدولة: تشير إلى العرض القابل للبيع، ولا تحمل مادة أو مدرسًا مباشرة.
create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  course_offering_id uuid not null,
  branch_id uuid,
  room_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  capacity integer check (capacity is null or capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, course_offering_id)
    references public.course_offerings(tenant_id, id) on delete restrict,
  foreign key (tenant_id, branch_id)
    references public.branches(tenant_id, id) on delete set null,
  foreign key (tenant_id, room_id)
    references public.rooms(tenant_id, id) on delete set null
);

-- التسجيل التجاري على العرض القابل للبيع.
create table public.enrollments (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  course_offering_id uuid not null,
  student_id uuid not null,
  enrolled_on date not null default current_date,
  active boolean not null default true,
  primary key (course_offering_id, student_id),
  foreign key (tenant_id, course_offering_id)
    references public.course_offerings(tenant_id, id) on delete cascade,
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete cascade
);

-- عضوية التسليم/الحضور داخل مجموعة، منفصلة عن التسجيل التجاري على العرض.
create table public.cohort_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cohort_id uuid not null,
  student_id uuid not null,
  joined_on date not null default current_date,
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
  tenant_type public.tenant_type not null,
  requested_product_level public.product_level not null default 'operations',
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
create index tenants_tenant_type_idx on public.tenants(tenant_type);
create index tenants_product_level_idx on public.tenants(product_level);
create index tenant_entitlements_tenant_state_idx on public.tenant_entitlements(tenant_id, state);
create index tenant_domains_tenant_idx on public.tenant_domains(tenant_id);
create index tenants_status_idx on public.tenants(status);
create index tenants_created_by_idx on public.tenants(created_by);
create index staff_profiles_tenant_idx on public.staff_profiles(tenant_id);
create index branches_tenant_idx on public.branches(tenant_id);
create index students_tenant_name_idx on public.students(tenant_id, full_name);
create index students_user_idx on public.students(user_id) where user_id is not null;
create index students_grade_idx on public.students(tenant_id, grade_id) where grade_id is not null;
create index guardians_tenant_idx on public.guardians(tenant_id);
create index guardians_user_idx on public.guardians(user_id) where user_id is not null;
create index student_guardians_tenant_idx on public.student_guardians(tenant_id);
create index rooms_tenant_branch_idx on public.rooms(tenant_id, branch_id);
create index stages_tenant_order_idx on public.stages(tenant_id, order_index);
create index grades_tenant_stage_idx on public.grades(tenant_id, stage_id, order_index);
create index subjects_tenant_idx on public.subjects(tenant_id);
create index teachers_tenant_idx on public.teachers(tenant_id, display_name);
create index teachers_membership_idx on public.teachers(tenant_id, membership_user_id) where membership_user_id is not null;
create index courses_tenant_grade_idx on public.courses(tenant_id, grade_id, subject_id);
create index course_teachers_teacher_idx on public.course_teachers(tenant_id, teacher_id);
create index course_offerings_tenant_course_idx on public.course_offerings(tenant_id, course_id);
create index course_offerings_teacher_idx on public.course_offerings(tenant_id, teacher_id);
create index cohorts_tenant_idx on public.cohorts(tenant_id);
create index cohorts_offering_idx on public.cohorts(tenant_id, course_offering_id);
create index enrollments_tenant_idx on public.enrollments(tenant_id);
create index enrollments_student_idx on public.enrollments(tenant_id, student_id) where active;
create index cohort_members_tenant_idx on public.cohort_members(tenant_id);
create index cohort_members_student_idx on public.cohort_members(tenant_id, student_id) where active;
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
comment on table public.capability_catalog is
  'Platform-scope capability definitions. Source of truth is src/lib/entitlements/capability-catalog.json; this table is the reference copy used for reporting and entitlement integrity.';
comment on table public.tenant_entitlements is
  'Commercial capability state per tenant. Effective access requires an active row here in addition to RBAC and resource scope.';
comment on table public.tenant_branding is
  'Tenant branding configuration. Branding is tenant data, never a separate deployment or codebase.';
comment on table public.tenant_domains is
  'Verified hostnames per tenant. The Host header is untrusted: resolve the tenant from this table, never by guessing.';

-- ============================================================================
-- عزل الـTenants بـRow-Level Security
--
-- كل مسار DAL يجب أن ينفّذ عمليته داخل معاملة تحمل سياقًا:
--   app.app_user_id        الهوية الموثقة
--   app.current_tenant_id  المساحة النشطة
--   app.platform_scope     'on' لمسار Control Plane المصرّح به فقط
--
-- تُضبط بـset_config(..., true) أي LOCAL، فتُصفَّر مع نهاية المعاملة ولا تتسرّب
-- بين الطلبات عبر اتصال الـpool المُعاد استخدامه.
--
-- النطاق: RLS يضمن **عزل المساحات** حصرًا. تقييد الدور والمورد يبقى في DAL عبر
-- Entitlement AND RBAC AND Scope. المرجع: docs/adr/0007
-- ============================================================================

create schema if not exists private;

create or replace function private.current_app_user_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.app_user_id', true), '')::uuid
$$;

create or replace function private.current_tenant_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.current_tenant_id', true), '')::uuid
$$;

create or replace function private.has_platform_scope() returns boolean
language sql stable as $$
  select coalesce(current_setting('app.platform_scope', true), '') = 'on'
$$;

-- ---------------------------------------------------------------------------
-- ربط هوية بحساب طالب أو ولي أمر — مسار موثوق لا كتابة مباشرة.
--
-- القاعدة الأمنية: العمود `students.user_id` و`guardians.user_id` يمثّل «من يدخل
-- البوابة باسم هذا الشخص». كتابته بلا تحقق تعني انتحال صفة. لذلك لا يُكتب إلا
-- عبر قبول دعوة تحمل ثلاثة قيود معًا: حيازة الرمز، ومطابقة البريد الموثّق للبريد
-- المدعو، وأن يكون السجل غير مربوط أصلًا.
-- ---------------------------------------------------------------------------

create type public.portal_subject as enum ('student','guardian');
create type public.portal_invitation_status as enum ('pending','accepted','revoked','expired');

create table public.portal_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subject_type public.portal_subject not null,
  -- عمودان لا عمود واحد: المفتاح الأجنبي لا يشير إلى جدولين، ففصلهما يحفظ سلامة
  -- المرجعية لكل نوع بدل إسقاط القيد عند الدعم المتعدد. والفحص يضمن أن العمود
  -- المملوء يطابق `subject_type` بالضبط.
  student_id uuid,
  guardian_id uuid,
  invitee_email citext not null,
  token_hash text not null unique,
  status public.portal_invitation_status not null default 'pending',
  created_by uuid not null,
  accepted_by uuid references public.app_users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, created_by)
    references public.memberships(tenant_id, user_id) on delete restrict,
  check (expires_at > created_at),
  check (invitee_email::text ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  check (
    (status = 'pending' and accepted_by is null and accepted_at is null and revoked_at is null)
    or (status = 'accepted' and accepted_by is not null and accepted_at is not null and revoked_at is null)
    or (status = 'revoked' and accepted_at is null and revoked_at is not null)
    or (status = 'expired' and accepted_at is null)
  ),
  check (
    (subject_type = 'student' and student_id is not null and guardian_id is null)
    or (subject_type = 'guardian' and guardian_id is not null and student_id is null)
  ),
  -- لا قيد فريد على العمودين منفردين: PostgreSQL يعدّ NULL قيمًا متمايزة، فعمود
  -- النوع الآخر الفارغ كان سيسمح بدعوتين متزامنتين لنفس السجل. الفهرس التعبيري
  -- أدناه يجمع العمودين في مفتاح واحد فيمنع التكرار فعلًا.
  foreign key (tenant_id, student_id)
    references public.students(tenant_id, id) on delete cascade,
  foreign key (tenant_id, guardian_id)
    references public.guardians(tenant_id, id) on delete cascade
);

-- دعوة معلّقة واحدة لكل سجل: المفتاح يجمع العمودين الفعليين في تعبير واحد.
create unique index portal_invitations_subject_unique_idx
  on public.portal_invitations(tenant_id, coalesce(student_id, guardian_id));

create index portal_invitations_lookup_idx on public.portal_invitations(invitee_email, status, expires_at);
create index portal_invitations_tenant_idx on public.portal_invitations(tenant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- ضمان بقاء مالك نشط لكل مساحة.
--
-- هذا الضمان invariant عابر للصفوف: «عدد المالكين النشطين ≥ 1». لا يعبّر عنه قيد
-- عادي (CHECK يرى الصف وحده، والقيد الفريد يمنع التكرار لا الغياب)، فالحل trigger
-- مؤجّل يُفحص عند commit: حتى لو أخطأ استعلام مستقبلي، لا يمكن ترك مساحة بلا مالك.
--
-- التأجيل مقصود: نقل الملكية يمرّ بلحظة وسيطة بلا مالك (تخفيض القائم ورفع الجديد)،
-- والفحص عند commit يرى الحالة النهائية فقط.
-- ---------------------------------------------------------------------------

create or replace function private.assert_tenant_has_active_owner() returns trigger
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  v_tenant_id uuid;
  v_owner_count integer;
begin
  v_tenant_id := coalesce(new.tenant_id, old.tenant_id);

  -- مساحة محذوفة: لا معنى للفحص، وصفوف العضوية تُحذف بالـcascade معها.
  if not exists (select 1 from public.tenants where id = v_tenant_id) then
    return null;
  end if;

  select count(*) into v_owner_count
  from public.memberships
  where tenant_id = v_tenant_id and role = 'owner' and active = true;

  if v_owner_count = 0 then
    raise exception 'tenant % must keep at least one active owner', v_tenant_id
      using errcode = 'check_violation',
            hint = 'transfer ownership to another active member first';
  end if;

  return null;
end $$;

create constraint trigger memberships_require_active_owner
  after insert or update or delete on public.memberships
  deferrable initially deferred
  for each row
  execute function private.assert_tenant_has_active_owner();

-- ---------------------------------------------------------------------------
-- تحديد معدّل المحاولات لمسارات المصادقة.
--
-- الجدول في مخطط `private` عمدًا: لا يُمنح للتطبيق أي وصول مباشر له، والوحيد
-- المتاح هو الدوال أدناه. والمخزَّن مجرد مفاتيح مُبصَّمة (sha256) بلا أي بريد أو
-- IP خام، فلا يحتاج الجدول سياسات RLS ولا يحمل بيانات شخصية.
-- ---------------------------------------------------------------------------

create table private.auth_attempts (
  id bigint generated always as identity primary key,
  bucket_key text not null check (bucket_key ~ '^[0-9a-f]{64}$'),
  scope text not null check (char_length(scope) between 3 and 40),
  occurred_at timestamptz not null default now()
);

create index auth_attempts_bucket_idx on private.auth_attempts(bucket_key, occurred_at desc);
create index auth_attempts_occurred_idx on private.auth_attempts(occurred_at);

/**
 * يسجّل محاولة ويقرر في نداء واحد.
 *
 * التسجيل والعدّ داخل نداء واحد يمنع سباق «كل الطلبات ترى العدّ ما قبل الزيادة».
 * وقفل استشاري لكل مفتاح يُسلسل المحاولات المتزامنة على نفس المفتاح فقط، فلا
 * يتأثر أي مفتاح آخر.
 *
 * يعيد عدد المحاولات داخل النافذة، وهل يُسمح بالمتابعة، وكم ثانية يجب الانتظار
 * قبل المحاولة التالية عند الرفض.
 */
create or replace function private.record_auth_attempt(
  p_bucket_key text,
  p_scope text,
  p_window_seconds integer,
  p_limit integer
) returns table (attempts integer, allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = private, pg_temp as $$
declare
  v_attempts integer;
  v_oldest timestamptz;
begin
  if p_window_seconds < 1 or p_limit < 1 then
    raise exception 'rate limit window and limit must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_bucket_key));

  insert into private.auth_attempts (bucket_key, scope) values (p_bucket_key, p_scope);

  select count(*)::integer, min(occurred_at)
    into v_attempts, v_oldest
    from private.auth_attempts
   where bucket_key = p_bucket_key
     and occurred_at > now() - make_interval(secs => p_window_seconds);

  -- التقليم: صفوف أقدم من يوم كامل لا تفيد أي نافذة، وإبقاؤها يضخّم الجدول فقط.
  delete from private.auth_attempts where occurred_at < now() - interval '1 day';

  attempts := v_attempts;
  allowed := v_attempts <= p_limit;
  retry_after_seconds := case
    when v_attempts <= p_limit then 0
    else greatest(1, ceil(extract(epoch from (v_oldest + make_interval(secs => p_window_seconds) - now())))::integer)
  end;
  return next;
end $$;

/** يمسح محاولات مفتاح بعد نجاح العملية، فلا يُعاقَب مستخدم نجح دخوله. */
create or replace function private.clear_auth_attempts(p_bucket_key text)
returns void
language sql security definer set search_path = private, pg_temp as $$
  delete from private.auth_attempts where bucket_key = p_bucket_key
$$;

revoke all on table private.auth_attempts from public;
revoke all on function private.record_auth_attempt(text, text, integer, integer) from public;
revoke all on function private.clear_auth_attempts(text) from public;

-- ---------------------------------------------------------------------------
-- دوال bootstrap محدودة: تعمل بصلاحية المالك لعمليتين لا يمكن التعبير عنهما
-- بسياسة عادية، لأن كلتيهما تحدث قبل وجود هوية معروفة.
-- كلتاهما `security definer` مع `search_path` مثبّت، ومُسحوبة من public.
-- ---------------------------------------------------------------------------

-- تُرجع هوية صاحب الجلسة من بصمة الرمز. حيازة الرمز هي إثبات الهوية.
create or replace function private.session_user_id(p_token_digest text) returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select s.user_id
  from public.auth_sessions s
  join public.app_users u on u.id = s.user_id and u.active = true
  where s.token_digest = p_token_digest
    and s.revoked_at is null
    and s.expires_at > now()
  limit 1
$$;

-- تُرجع بصمة كلمة المرور لمحاولة دخول واحدة. لا تكشف أكثر من صف مطابق واحد.
create or replace function private.login_lookup(p_email citext)
returns table (user_id uuid, email citext, password_digest text)
language sql stable security definer set search_path = public, pg_temp as $$
  select u.id, u.email, c.password_digest
  from public.app_users u
  join public.auth_password_credentials c on c.user_id = u.id
  where lower(u.email::text) = lower(p_email::text)
    and u.active = true
  limit 1
$$;

-- إنشاء أول مساحة: مقدّم الطلب يسجّل بنفسه ثم يُنشئ طلب مساحة بلا عضوية أو مساحة.
create or replace function private.workspace_request_owner(p_request_id uuid) returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select user_id from public.workspace_requests where id = p_request_id limit 1
$$;

-- تُرجع الدعوة من بصمة رمزها بلا سياق مساحة، لأن قبول الدعوة يسبق معرفة المساحة.
-- لا تكشف شيئًا يتجاوز صف الدعوة المطابق للرمز.
create or replace function private.portal_invitation_by_token(p_token_digest text)
returns table (
  id uuid,
  tenant_id uuid,
  subject_type public.portal_subject,
  student_id uuid,
  guardian_id uuid,
  invitee_email citext,
  status public.portal_invitation_status,
  expires_at timestamptz
)
language sql stable security definer set search_path = public, pg_temp as $$
  select i.id, i.tenant_id, i.subject_type, i.student_id, i.guardian_id,
         i.invitee_email, i.status, i.expires_at
  from public.portal_invitations i
  where i.token_hash = p_token_digest
  limit 1
$$;

revoke all on function private.portal_invitation_by_token(text) from public;

-- تُرجع دعوة الموظفين من بصمة رمزها بلا سياق مساحة، لأن صفحة الدعوة يفتحها زائر
-- لا عضوية له بعد. سياسات `invitations` كلها مشروطة بسياق مساحة، فقراءة الجدول
-- مباشرة من هذه اللحظة ترجع صفر صفوف — والدالة المحدودة تكسر الحلقة بلا توسيع
-- أي سياسة: لا تكشف إلا الصف المطابق للرمز، وبالأعمدة اللازمة وحدها.
create or replace function private.invitation_by_token(p_token_digest text)
returns table (
  id uuid,
  tenant_id uuid,
  invitee_email citext,
  role public.member_role,
  status public.invitation_status,
  expires_at timestamptz,
  account_exists boolean
)
language sql stable security definer set search_path = public, pg_temp as $$
  select i.id, i.tenant_id, i.invitee_email, i.role, i.status, i.expires_at,
         exists(select 1 from public.app_users u where lower(u.email::text) = lower(i.invitee_email::text))
  from public.invitations i
  where i.token_hash = p_token_digest
  limit 1
$$;

revoke all on function private.invitation_by_token(text) from public;

revoke all on function private.session_user_id(text) from public;
revoke all on function private.login_lookup(citext) from public;
revoke all on function private.workspace_request_owner(uuid) from public;

-- جداول الأعمال التي تحمل tenant_id: سياسة موحّدة مشتقة من نفس الشرط.
do $$
declare
  table_name text;
  tenant_scoped_tables text[] := array[
    'memberships','invitations','staff_profiles','branches','rooms','stages','grades','subjects',
    'teachers','courses','course_teachers','course_offerings','students','guardians','student_guardians',
    'cohorts','enrollments','cohort_members','class_sessions','attendance','invoices','payments',
    'audit_logs','tenant_entitlements','tenant_branding','tenant_domains'
  ];
begin
  foreach table_name in array tenant_scoped_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);

    execute format(
      'create policy %I on public.%I for select using (private.has_platform_scope() or tenant_id = private.current_tenant_id())',
      table_name || '_tenant_read', table_name);
    execute format(
      'create policy %I on public.%I for insert with check (private.has_platform_scope() or tenant_id = private.current_tenant_id())',
      table_name || '_tenant_insert', table_name);
    execute format(
      'create policy %I on public.%I for update using (private.has_platform_scope() or tenant_id = private.current_tenant_id()) with check (private.has_platform_scope() or tenant_id = private.current_tenant_id())',
      table_name || '_tenant_update', table_name);
    execute format(
      'create policy %I on public.%I for delete using (private.has_platform_scope() or tenant_id = private.current_tenant_id())',
      table_name || '_tenant_delete', table_name);
  end loop;
end $$;

-- سياسات bootstrap: يقرأ المستخدم علاقته الخاصة قبل أن تُعرف مساحته، وهي الخطوة
-- التي منها تُكتشف المساحة النشطة ثم تُضبط داخل نفس المعاملة.
create policy memberships_bootstrap_read on public.memberships
  for select using (user_id = private.current_app_user_id());
create policy students_bootstrap_read on public.students
  for select using (user_id = private.current_app_user_id());
create policy guardians_bootstrap_read on public.guardians
  for select using (user_id = private.current_app_user_id());

-- `tenants` نفسها مفتاحها `id` لا `tenant_id`.
alter table public.tenants enable row level security;
alter table public.tenants force row level security;
-- العضو يقرأ صف المساحة التي ينتمي إليها فعليًا.
-- هذا هو حل الدائرة المغلقة: لمعرفة المساحة النشطة يجب أولًا قراءة العضوية،
-- ولتسمية المساحة في الواجهة يجب قراءة صفها. الاستعلام الفرعي على `memberships`
-- مسموح بسياسة `memberships_bootstrap_read` نفسها، فلا recursion بين الجدولين.
create policy tenants_member_read on public.tenants
  for select using (
    private.has_platform_scope()
    or id = private.current_tenant_id()
    or exists (
      select 1
      from public.memberships m
      where m.tenant_id = tenants.id
        and m.user_id = private.current_app_user_id()
        and m.active = true
    )
  );
create policy tenants_tenant_insert on public.tenants
  for insert with check (private.has_platform_scope());
create policy tenants_tenant_update on public.tenants
  for update using (private.has_platform_scope() or id = private.current_tenant_id())
  with check (private.has_platform_scope() or id = private.current_tenant_id());
create policy tenants_tenant_delete on public.tenants
  for delete using (private.has_platform_scope());

-- `app_users`: صف المستخدم نفسه متاح للهوية الموثقة (لازم لحل الجلسة والعلاقات)،
-- وتُفتح بقية الصفوف لنطاق المنصة فقط.
alter table public.app_users enable row level security;
alter table public.app_users force row level security;
create policy app_users_own_row on public.app_users
  for select using (
    private.has_platform_scope()
    or id = private.current_app_user_id()
    -- مسار bootstrap: من يحمل رمز جلسة صالح يقرأ صفّه قبل أن تُعرف هويته بعد.
    or id = private.session_user_id(nullif(current_setting('app.session_digest', true), ''))
  );

-- الزملاء في نفس المساحة يقرأون هوية بعضهم الأساسية.
-- لولا هذه السياسة لعرضت قائمة الفريق صف المستخدم وحده، لأن `app_users` محمي
-- بسياسة الصف الشخصي. النطاق مضبوط: نفس المساحة وعضوية نشطة في الطرفين،
-- ولا تكشف شيئًا خارج نطاق العمل المشترك.
-- لا recursion: سياسات `memberships` تقرأ السياق فقط ولا تقرأ `app_users`.
create policy app_users_colleague_read on public.app_users
  for select using (
    exists (
      select 1
      from public.memberships theirs
      join public.memberships mine on mine.tenant_id = theirs.tenant_id
      where theirs.user_id = app_users.id
        and mine.user_id = private.current_app_user_id()
        and theirs.active = true
        and mine.active = true
    )
  );
-- التسجيل الجديد عملية غير موثقة بطبيعتها (لا جلسة بعد)، فالسياسة تسمح بالإضافة
-- فقط. ولا تمنح أي قراءة لصف موجود، فالمستخدم الجديد لا يرى شيئًا قبل إنشاء جلسة.
create policy app_users_self_signup on public.app_users
  for insert with check (private.has_platform_scope() or private.session_user_id(nullif(current_setting('app.session_digest', true), '')) is null);
create policy app_users_own_update on public.app_users
  for update using (private.has_platform_scope() or id = private.current_app_user_id())
  with check (private.has_platform_scope() or id = private.current_app_user_id());
create policy app_users_platform_delete on public.app_users
  for delete using (private.has_platform_scope());

-- `platform_admins`: يقرأ المستخدم صفّه فقط ليعرف صلاحيته، والإدارة لنطاق المنصة.
alter table public.platform_admins enable row level security;
alter table public.platform_admins force row level security;
create policy platform_admins_own_row on public.platform_admins
  for select using (private.has_platform_scope() or user_id = private.current_app_user_id());
create policy platform_admins_platform_write on public.platform_admins
  for insert with check (private.has_platform_scope());
create policy platform_admins_platform_delete on public.platform_admins
  for delete using (private.has_platform_scope());

-- `workspace_requests`: مقدّم الطلب يرى طلبه، والمراجعة لنطاق المنصة.
alter table public.workspace_requests enable row level security;
alter table public.workspace_requests force row level security;
create policy workspace_requests_own_row on public.workspace_requests
  for select using (private.has_platform_scope() or user_id = private.current_app_user_id());
create policy workspace_requests_own_insert on public.workspace_requests
  for insert with check (private.has_platform_scope() or user_id = private.current_app_user_id());
create policy workspace_requests_own_update on public.workspace_requests
  for update using (private.has_platform_scope() or user_id = private.current_app_user_id())
  with check (private.has_platform_scope() or user_id = private.current_app_user_id());
create policy workspace_requests_platform_delete on public.workspace_requests
  for delete using (private.has_platform_scope());

-- `password_reset_requests`: صاحب الحساب يرى طلبه، والمراجعة لنطاق المنصة.
alter table public.password_reset_requests enable row level security;
alter table public.password_reset_requests force row level security;
create policy password_reset_own_row on public.password_reset_requests
  for select using (private.has_platform_scope() or user_id = private.current_app_user_id());
create policy password_reset_own_insert on public.password_reset_requests
  for insert with check (private.has_platform_scope() or user_id = private.current_app_user_id());
create policy password_reset_platform_update on public.password_reset_requests
  for update using (private.has_platform_scope() or user_id = private.current_app_user_id())
  with check (private.has_platform_scope() or user_id = private.current_app_user_id());
create policy password_reset_platform_delete on public.password_reset_requests
  for delete using (private.has_platform_scope());

-- `portal_invitations`: مديرو المساحة يديرون دعوات بوابتها، والمدعو يقرأ دعوته.
alter table public.portal_invitations enable row level security;
alter table public.portal_invitations force row level security;

create policy portal_invitations_tenant_read on public.portal_invitations
  for select using (private.has_platform_scope() or tenant_id = private.current_tenant_id());
-- المدعو يقرأ دعوته ببصمة الرمز قبل أن يُعرف أي شيء عنه — مسار bootstrap مثل الجلسة.
create policy portal_invitations_token_read on public.portal_invitations
  for select using (
    token_hash = nullif(current_setting('app.portal_invite_digest', true), '')
  );
create policy portal_invitations_tenant_insert on public.portal_invitations
  for insert with check (private.has_platform_scope() or tenant_id = private.current_tenant_id());
create policy portal_invitations_tenant_update on public.portal_invitations
  for update using (private.has_platform_scope() or tenant_id = private.current_tenant_id())
  with check (private.has_platform_scope() or tenant_id = private.current_tenant_id());
create policy portal_invitations_tenant_delete on public.portal_invitations
  for delete using (private.has_platform_scope() or tenant_id = private.current_tenant_id());

-- `platform_audit_logs`: سجل المنصة كله لنطاق المنصة فقط.
alter table public.platform_audit_logs enable row level security;
alter table public.platform_audit_logs force row level security;
create policy platform_audit_platform_read on public.platform_audit_logs
  for select using (private.has_platform_scope());
create policy platform_audit_platform_insert on public.platform_audit_logs
  for insert with check (private.has_platform_scope() or actor_user_id = private.current_app_user_id());

-- `capability_catalog`: بيانات مرجعية بلا بيانات أعمال ولا أسرار، فقراءتها عامة
-- لأي هوية موثقة، وتعديلها لنطاق المنصة.
alter table public.capability_catalog enable row level security;
alter table public.capability_catalog force row level security;
create policy capability_catalog_read on public.capability_catalog
  for select using (true);
create policy capability_catalog_platform_write on public.capability_catalog
  for insert with check (private.has_platform_scope());
create policy capability_catalog_platform_update on public.capability_catalog
  for update using (private.has_platform_scope()) with check (private.has_platform_scope());
create policy capability_catalog_platform_delete on public.capability_catalog
  for delete using (private.has_platform_scope());

-- جداول المصادقة (`auth_sessions`, `auth_password_credentials`) خارج RLS عمدًا:
-- لا تحمل tenant_id ولا بيانات أعمال، ومحتواها بصمات فقط، وقراءتها مبنية على
-- حيازة الرمز لا على هوية معروفة. تبقى محميّة بـrevoke وبالبحث بالبصمة.
-- المرجع: docs/adr/0007

-- Authorization is enforced by the application layer for this self-managed PostgreSQL target.

commit;
