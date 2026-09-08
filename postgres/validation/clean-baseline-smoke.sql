-- Run after applying only postgres/baseline/0001_smart_edu_center_clean.sql.
-- Every query should return true or zero rows.

select to_regclass('public.app_users') is not null as app_users_exists;
select to_regclass('public.auth_password_credentials') is not null as auth_password_credentials_exists;
select to_regclass('public.auth_sessions') is not null as auth_sessions_exists;
select to_regclass('public.platform_admins') is not null as platform_admins_exists;
select to_regclass('public.staff_profiles') is not null as staff_profiles_exists;
select to_regclass('public.workspace_requests') is not null as workspace_requests_exists;
select to_regclass('public.password_reset_requests') is not null as password_reset_requests_exists;
select to_regclass('public.platform_audit_logs') is not null as platform_audit_logs_exists;
select to_regclass('public.invitations') is not null as invitations_exists;

select count(*) = 0 as no_cross_tenant_invitations
from public.invitations i
left join public.memberships m on m.tenant_id = i.tenant_id and m.user_id = i.created_by
where m.user_id is null;

select count(*) = 0 as no_orphan_memberships
from public.memberships m
left join public.app_users u on u.id = m.user_id
left join public.tenants t on t.id = m.tenant_id
where u.id is null or t.id is null;

select count(*) = 0 as no_orphan_staff_profiles
from public.staff_profiles p
left join public.memberships m on m.tenant_id = p.tenant_id and m.user_id = p.user_id
where m.user_id is null;

select count(*) = 0 as no_cross_tenant_student_branches
from public.students s
join public.branches b on b.id = s.branch_id
where s.tenant_id <> b.tenant_id;

select count(*) = 0 as no_cross_tenant_guardian_links
from public.student_guardians sg
join public.students s on s.id = sg.student_id
join public.guardians g on g.id = sg.guardian_id
where sg.tenant_id <> s.tenant_id or sg.tenant_id <> g.tenant_id;

select count(*) = 0 as no_cross_tenant_cohort_branches
from public.cohorts c
join public.branches b on b.id = c.branch_id
where c.tenant_id <> b.tenant_id;

select count(*) = 0 as no_cross_tenant_cohort_teachers
from public.cohorts c
join public.memberships m on m.user_id = c.teacher_user_id
where c.tenant_id <> m.tenant_id;

select count(*) = 0 as no_cross_tenant_enrollments
from public.enrollments e
join public.students s on s.id = e.student_id
join public.cohorts c on c.id = e.cohort_id
where e.tenant_id <> s.tenant_id or e.tenant_id <> c.tenant_id;

select count(*) = 0 as no_cross_tenant_sessions
from public.class_sessions cs
join public.cohorts c on c.id = cs.cohort_id
where cs.tenant_id <> c.tenant_id;

select count(*) = 0 as no_cross_tenant_attendance
from public.attendance a
join public.students s on s.id = a.student_id
join public.class_sessions cs on cs.id = a.session_id
where a.tenant_id <> s.tenant_id or a.tenant_id <> cs.tenant_id;

select count(*) = 0 as no_cross_tenant_invoices
from public.invoices i
join public.students s on s.id = i.student_id
where i.tenant_id <> s.tenant_id;

select count(*) = 0 as no_cross_tenant_payments
from public.payments p
join public.invoices i on i.id = p.invoice_id
where p.tenant_id <> i.tenant_id;
