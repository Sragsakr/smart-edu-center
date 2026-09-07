BEGIN;

-- ============================================================================
-- DEMO / TEST SEED DATA
-- ----------------------------------------------------------------------------
-- Clearly-labelled demo records so the platform-admin dashboards display real,
-- query-backed data. All demo Auth users use an email containing "+demo" and
-- the fixed known password DemoPass.123 so they can be signed into for testing.
-- Insertions are idempotent and reversible by removing the +demo rows.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Demo Auth users (owners + staff).
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change, email_change_token_current, email_change_token_new, reauthentication_token,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  (select instance_id from auth.users limit 1),
  d.id,
  'authenticated', 'authenticated',
  d.email,
  extensions.crypt('DemoPass.123', extensions.gen_salt('bf', 10)),
  now(),
  '', '', '', '', '', '',
  jsonb_build_object('provider','email','providers',array['email']),
  jsonb_build_object('full_name', d.full_name),
  d.created_at, now()
from (values
  ('11111111-1111-4111-8111-111111111101'::uuid, 'center.demo@example.com',      'سنتر النور',            now() - interval '90 days'),
  ('11111111-1111-4111-8111-111111111102'::uuid, 'center.demo2@example.com',     'أكاديمية التفوق',       now() - interval '45 days'),
  ('11111111-1111-4111-8111-111111111103'::uuid, 'teacher.demo@example.com',     'مدرس الرياضيات',        now() - interval '30 days'),
  ('11111111-1111-4111-8111-111111111104'::uuid, 'teacher.demo2@example.com',    'مدرس الفيزياء',         now() - interval '12 days'),
  ('11111111-1111-4111-8111-111111111105'::uuid, 'admin.demo@example.com',       'مدير السنتر',           now() - interval '60 days'),
  ('11111111-1111-4111-8111-111111111106'::uuid, 'pending.demo@example.com',     'سنتر قيد المراجعة',     now() - interval '2 days'),
  ('11111111-1111-4111-8111-111111111107'::uuid, 'rejected.demo@example.com',    'سنتر مرفوض',            now() - interval '5 days')
) as d(id, email, full_name, created_at)
where not exists (select 1 from auth.users u where u.id = d.id)
  and not exists (select 1 from auth.users u where u.email = d.email);

-- ---------------------------------------------------------------------------
-- 2) Demo tenants.
-- ---------------------------------------------------------------------------
insert into public.tenants (id, name, slug, account_type, created_by, created_at, updated_at)
select * from (values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, 'سنتر النور',           'demo-nour-center',    'center',              '11111111-1111-4111-8111-111111111101'::uuid, now() - interval '85 days', now() - interval '85 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid, 'أكاديمية التفوق',      'demo-tafawoq-academy', 'center',              '11111111-1111-4111-8111-111111111102'::uuid, now() - interval '40 days', now() - interval '40 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid, 'مدرس الرياضيات',       'demo-math-teacher',   'independent_teacher', '11111111-1111-4111-8111-111111111103'::uuid, now() - interval '28 days', now() - interval '28 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'::uuid, 'مدرس الفيزياء',        'demo-physics-teacher', 'independent_teacher','11111111-1111-4111-8111-111111111104'::uuid, now() - interval '10 days', now() - interval '10 days')
) as d(id, name, slug, account_type, created_by, created_at, updated_at)
where not exists (select 1 from public.tenants t where t.id = d.id);

-- Owner memberships (skips if already present).
insert into public.memberships (tenant_id, user_id, role, active, created_at)
select tenant.id, tenant.created_by, 'owner', true, tenant.created_at
from public.tenants tenant
where not exists (select 1 from public.memberships m where m.tenant_id=tenant.id and m.user_id=tenant.created_by);

-- Center admin staff on the first center.
insert into public.memberships (tenant_id, user_id, role, active, created_at)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, '11111111-1111-4111-8111-111111111105'::uuid, 'admin', true, now() - interval '55 days'
where not exists (select 1 from public.memberships m where m.tenant_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid and m.user_id='11111111-1111-4111-8111-111111111105'::uuid);

-- ---------------------------------------------------------------------------
-- 3) Workspace requests (approved / pending / rejected).
--    The slug-trigger prevents inserting a request whose slug matches an
--    existing tenant. Approved demo requests intentionally share the tenant
--    slug, so the trigger is temporarily disabled for this provisioning block.
-- ---------------------------------------------------------------------------
alter table public.workspace_requests disable trigger ensure_workspace_request_slug_available;

insert into public.workspace_requests (
  user_id, email, account_type, workspace_name, slug, mobile_phone, whatsapp_phone,
  status, reviewed_by, reviewed_at, tenant_id, created_at, updated_at
)
select * from (values
  ('11111111-1111-4111-8111-111111111101'::uuid, 'center.demo@example.com',   'center',              'سنتر النور',        'demo-nour-center',    '+201001111111', '+201001111111', 'approved'::public.workspace_request_status, '11111111-1111-4111-8111-111111111105'::uuid, now() - interval '84 days', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, now() - interval '85 days', now() - interval '84 days'),
  ('11111111-1111-4111-8111-111111111102'::uuid, 'center.demo2@example.com',  'center',              'أكاديمية التفوق',   'demo-tafawoq-academy', '+201002222222', '+201002222222', 'approved'::public.workspace_request_status, '11111111-1111-4111-8111-111111111105'::uuid, now() - interval '39 days', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid, now() - interval '40 days', now() - interval '39 days'),
  ('11111111-1111-4111-8111-111111111103'::uuid, 'teacher.demo@example.com',  'independent_teacher', 'مدرس الرياضيات',    'demo-math-teacher',    '+201003333333', '+201003333333', 'approved'::public.workspace_request_status, '11111111-1111-4111-8111-111111111105'::uuid, now() - interval '27 days', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid, now() - interval '28 days', now() - interval '27 days'),
  ('11111111-1111-4111-8111-111111111104'::uuid, 'teacher.demo2@example.com', 'independent_teacher', 'مدرس الفيزياء',     'demo-physics-teacher', '+201004444444', '+201004444444', 'approved'::public.workspace_request_status, '11111111-1111-4111-8111-111111111105'::uuid, now() - interval '9 days',  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'::uuid, now() - interval '10 days', now() - interval '9 days')
) as d(user_id, email, account_type, workspace_name, slug, mobile_phone, whatsapp_phone, status, reviewed_by, reviewed_at, tenant_id, created_at, updated_at)
where not exists (select 1 from public.workspace_requests wr where wr.slug = d.slug);

-- Pending workspace request.
insert into public.workspace_requests (
  user_id, email, account_type, workspace_name, slug, mobile_phone, whatsapp_phone, status, created_at, updated_at
)
select * from (values
  ('11111111-1111-4111-8111-111111111106'::uuid, 'pending.demo@example.com', 'center', 'سنتر قيد المراجعة', 'demo-pending-center', '+201005555555', '+201005555555', 'pending_approval'::public.workspace_request_status, now() - interval '2 days', now() - interval '2 days')
) as d(user_id, email, account_type, workspace_name, slug, mobile_phone, whatsapp_phone, status, created_at, updated_at)
where not exists (select 1 from public.workspace_requests wr where wr.slug = d.slug);

-- Rejected workspace request.
insert into public.workspace_requests (
  user_id, email, account_type, workspace_name, slug, mobile_phone, whatsapp_phone,
  status, rejection_reason, reviewed_by, reviewed_at, created_at, updated_at
)
select * from (values
  ('11111111-1111-4111-8111-111111111107'::uuid, 'rejected.demo@example.com', 'center', 'سنتر مرفوض', 'demo-rejected-center', '+201006666666', '+201006666666', 'rejected'::public.workspace_request_status, 'بيانات النشاط غير مكتملة', '11111111-1111-4111-8111-111111111105'::uuid, now() - interval '4 days', now() - interval '5 days', now() - interval '4 days')
) as d(user_id, email, account_type, workspace_name, slug, mobile_phone, whatsapp_phone, status, rejection_reason, reviewed_by, reviewed_at, created_at, updated_at)
where not exists (select 1 from public.workspace_requests wr where wr.slug = d.slug);

alter table public.workspace_requests enable trigger ensure_workspace_request_slug_available;

-- ---------------------------------------------------------------------------
-- 4) Demo students.
-- ---------------------------------------------------------------------------
insert into public.students (tenant_id, code, full_name, phone, grade, active, joined_on, created_at)
select * from (values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, 'D001', 'عمر أحمد',      '+20100000001', 'الصف الثالث الثانوي', true,  now() - interval '70 days', now() - interval '70 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, 'D002', 'مريم محمد',     '+20100000002', 'الصف الثاني الثانوي', true,  now() - interval '65 days', now() - interval '65 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, 'D003', 'يوسف علي',      '+20100000003', 'الصف الثالث الثانوي', true,  now() - interval '60 days', now() - interval '60 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, 'D004', 'سارة محمود',    '+20100000004', 'الصف الأول الثانوي',  true,  now() - interval '55 days', now() - interval '55 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, 'D005', 'خالد حسن',      '+20100000005', 'الصف الثالث الثانوي', false, now() - interval '80 days', now() - interval '80 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid, 'D006', 'نور إبراهيم',   '+20100000006', 'الصف الثاني الثانوي', true,  now() - interval '35 days', now() - interval '35 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid, 'D007', 'عبد الرحمن',    '+20100000007', 'الصف الثالث الثانوي', true,  now() - interval '30 days', now() - interval '30 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid, 'D008', 'أحمد سمير',     '+20100000008', 'الصف الثاني الثانوي', true,  now() - interval '25 days', now() - interval '25 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid, 'D009', 'فاطمة عادل',    '+20100000009', 'الصف الأول الثانوي',  true,  now() - interval '20 days', now() - interval '20 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'::uuid, 'D010', 'محمود كامل',    '+20100000010', 'الصف الثالث الثانوي', true,  now() - interval '8 days',  now() - interval '8 days')
) as d(tenant_id, code, full_name, phone, grade, active, joined_on, created_at)
where not exists (select 1 from public.students s where s.tenant_id=d.tenant_id and s.code=d.code);

-- ---------------------------------------------------------------------------
-- 5) Demo pending password-reset requests.
-- ---------------------------------------------------------------------------
insert into public.password_reset_requests (user_id, requested_email, whatsapp_phone, status, created_at)
select * from (values
  ('11111111-1111-4111-8111-111111111103'::uuid, 'teacher.demo@example.com', '+201003333333', 'pending'::public.password_reset_status, now() - interval '3 hours'),
  ('11111111-1111-4111-8111-111111111101'::uuid, 'center.demo@example.com',  '+201001111111', 'pending'::public.password_reset_status, now() - interval '1 hour')
) as d(user_id, requested_email, whatsapp_phone, status, created_at)
where not exists (select 1 from public.password_reset_requests pr where pr.user_id=d.user_id and pr.status='pending');

-- ---------------------------------------------------------------------------
-- 6) Demo platform audit trail.
-- ---------------------------------------------------------------------------
insert into public.platform_audit_logs (actor_user_id, action, entity_type, entity_id, details, created_at)
select * from (values
  ('11111111-1111-4111-8111-111111111105'::uuid, 'workspace_request.approved', 'workspace_request', '1',
   jsonb_build_object('tenant_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid), now() - interval '84 days'),
  ('11111111-1111-4111-8111-111111111105'::uuid, 'workspace_request.approved', 'workspace_request', '2',
   jsonb_build_object('tenant_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid), now() - interval '39 days'),
  ('11111111-1111-4111-8111-111111111105'::uuid, 'workspace_request.approved', 'workspace_request', '3',
   jsonb_build_object('tenant_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid), now() - interval '27 days'),
  ('11111111-1111-4111-8111-111111111105'::uuid, 'workspace_request.approved', 'workspace_request', '4',
   jsonb_build_object('tenant_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'::uuid), now() - interval '9 days'),
  ('11111111-1111-4111-8111-111111111105'::uuid, 'workspace_request.rejected', 'workspace_request', '5',
   jsonb_build_object('reason','بيانات النشاط غير مكتملة'), now() - interval '4 days')
) as d(actor_user_id, action, entity_type, entity_id, details, created_at)
where not exists (select 1 from public.platform_audit_logs p where p.entity_id=d.entity_id);

COMMIT;