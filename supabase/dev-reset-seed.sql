-- Smart Edu Center — BUILD MODE ONLY
-- Rebuilds the disposable business/demo dataset while preserving real Auth users
-- and real platform_admins. Do NOT run after SCHEMA FREEZE / production data mode.
-- Canonical demo password is managed by the existing demo Auth users: DemoPass.123

begin;

-- Disposable business data.
delete from public.audit_logs;
delete from public.payments;
delete from public.invoices;
delete from public.attendance;
delete from public.class_sessions;
delete from public.enrollments;
delete from public.cohorts;
delete from public.student_guardians;
delete from public.guardians;
delete from public.students;
delete from public.branches;
delete from public.memberships;
delete from public.workspace_requests;
delete from public.password_reset_requests;
delete from public.platform_audit_logs;
delete from public.tenants;

-- Ensure the four existing demo Auth users have email identities.
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id::text, u.id,
       jsonb_build_object('sub',u.id::text,'email',u.email,'email_verified',true,'phone_verified',false),
       'email', now(), now(), now()
from auth.users u
where u.email in ('admin.demo@example.com','center.demo@example.com','teacher.demo@example.com','center.demo2@example.com')
  and not exists (select 1 from auth.identities i where i.user_id=u.id and i.provider='email');

insert into public.platform_admins(user_id)
select id from auth.users where email='admin.demo@example.com'
on conflict (user_id) do nothing;

-- One center + one owner.
insert into public.tenants(id,name,slug,created_by,account_type,status)
select '31111111-1111-4111-8111-111111111101'::uuid,
       'سنتر النور التجريبي','demo-nour-center',id,'center','active'
from auth.users where email='center.demo@example.com';

insert into public.memberships(tenant_id,user_id,role,active)
select '31111111-1111-4111-8111-111111111101'::uuid,id,'owner',true
from auth.users where email='center.demo@example.com';

insert into public.branches(id,tenant_id,name,address,phone)
values ('41111111-1111-4111-8111-111111111101'::uuid,
        '31111111-1111-4111-8111-111111111101'::uuid,
        'الفرع الرئيسي','القاهرة','01000000000');

-- Student identity and parent identity are independent from memberships.
insert into public.students(id,tenant_id,branch_id,code,full_name,phone,grade,active,user_id)
select '51111111-1111-4111-8111-111111111101'::uuid,
       '31111111-1111-4111-8111-111111111101'::uuid,
       '41111111-1111-4111-8111-111111111101'::uuid,
       'ST-001','عمر أحمد','01011111111','الصف الثالث الثانوي',true,id
from auth.users where email='teacher.demo@example.com';

insert into public.guardians(id,tenant_id,full_name,phone,email,user_id)
select '61111111-1111-4111-8111-111111111101'::uuid,
       '31111111-1111-4111-8111-111111111101'::uuid,
       'أحمد محمود','01022222222','center.demo2@example.com',id
from auth.users where email='center.demo2@example.com';

insert into public.student_guardians(tenant_id,student_id,guardian_id,relationship)
values ('31111111-1111-4111-8111-111111111101'::uuid,
        '51111111-1111-4111-8111-111111111101'::uuid,
        '61111111-1111-4111-8111-111111111101'::uuid,'father');

insert into public.cohorts(id,tenant_id,branch_id,name,subject,teacher_user_id,capacity,active)
select '71111111-1111-4111-8111-111111111101'::uuid,
       '31111111-1111-4111-8111-111111111101'::uuid,
       '41111111-1111-4111-8111-111111111101'::uuid,
       'ثانوية عامة - مجموعة A','الرياضيات',id,30,true
from auth.users where email='center.demo@example.com';

insert into public.enrollments(tenant_id,cohort_id,student_id,active)
values ('31111111-1111-4111-8111-111111111101'::uuid,
        '71111111-1111-4111-8111-111111111101'::uuid,
        '51111111-1111-4111-8111-111111111101'::uuid,true);

insert into public.class_sessions(id,tenant_id,cohort_id,starts_at,ends_at,notes,created_by)
select '81111111-1111-4111-8111-111111111101'::uuid,
       '31111111-1111-4111-8111-111111111101'::uuid,
       '71111111-1111-4111-8111-111111111101'::uuid,
       now()-interval '2 days',now()-interval '2 days'+interval '2 hours',
       'مراجعة الوحدة الأولى',id
from auth.users where email='center.demo@example.com';

insert into public.class_sessions(id,tenant_id,cohort_id,starts_at,ends_at,notes,created_by)
select '81111111-1111-4111-8111-111111111102'::uuid,
       '31111111-1111-4111-8111-111111111101'::uuid,
       '71111111-1111-4111-8111-111111111101'::uuid,
       now()+interval '1 day',now()+interval '1 day 2 hours',
       'الحصة القادمة',id
from auth.users where email='center.demo@example.com';

insert into public.attendance(tenant_id,session_id,student_id,status,marked_by)
select '31111111-1111-4111-8111-111111111101'::uuid,
       '81111111-1111-4111-8111-111111111101'::uuid,
       '51111111-1111-4111-8111-111111111101'::uuid,
       'present',id
from auth.users where email='center.demo@example.com';

insert into public.invoices(id,tenant_id,student_id,title,amount,due_date,status)
values
('91111111-1111-4111-8111-111111111101'::uuid,'31111111-1111-4111-8111-111111111101'::uuid,'51111111-1111-4111-8111-111111111101'::uuid,'اشتراك شهر سبتمبر',600,current_date+7,'partial'),
('91111111-1111-4111-8111-111111111102'::uuid,'31111111-1111-4111-8111-111111111101'::uuid,'51111111-1111-4111-8111-111111111101'::uuid,'مذكرة المراجعة',150,current_date+14,'due');

insert into public.payments(tenant_id,invoice_id,amount,method,reference,received_by)
select '31111111-1111-4111-8111-111111111101'::uuid,
       '91111111-1111-4111-8111-111111111101'::uuid,
       300,'cash','DEMO-PAY-001',id
from auth.users where email='center.demo@example.com';

commit;
