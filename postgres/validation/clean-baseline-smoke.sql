-- Run after applying postgres/baseline/0001 and 0002 to a disposable Saboraty database.
-- Every query below should return true / zero failures.

select to_regclass('public.users') is not null as users_exists;
select to_regclass('public.tenants') is not null as tenants_exists;
select to_regclass('public.memberships') is not null as memberships_exists;
select to_regclass('public.tenant_settings') is not null as tenant_settings_exists;
select to_regclass('public.branches') is not null as branches_exists;
select to_regclass('public.rooms') is not null as rooms_exists;
select to_regclass('public.grades') is not null as grades_exists;
select to_regclass('public.subjects') is not null as subjects_exists;
select to_regclass('public.staff_profiles') is not null as staff_profiles_exists;
select to_regclass('public.recurring_schedules') is not null as recurring_schedules_exists;
select to_regclass('public.schedule_exceptions') is not null as schedule_exceptions_exists;
select to_regclass('public.workspace_requests') is not null as workspace_requests_exists;
select to_regclass('public.invitations') is not null as invitations_exists;
select to_regclass('public.password_reset_requests') is not null as password_reset_requests_exists;

select count(*) = 0 as no_orphan_memberships
from public.memberships m
left join public.users u on u.id = m.user_id
left join public.tenants t on t.id = m.tenant_id
where u.id is null or t.id is null;

select count(*) = 0 as no_cross_tenant_student_branches
from public.students s
join public.branches b on b.id = s.branch_id
where s.branch_id is not null and s.tenant_id <> b.tenant_id;

select count(*) = 0 as no_cross_tenant_student_grades
from public.students s
join public.grades g on g.id = s.grade_id
where s.grade_id is not null and s.tenant_id <> g.tenant_id;

select count(*) = 0 as no_cross_tenant_guardian_links
from public.student_guardians sg
join public.students s on s.id = sg.student_id
join public.guardians g on g.id = sg.guardian_id
where sg.tenant_id <> s.tenant_id or sg.tenant_id <> g.tenant_id;

select count(*) = 0 as no_cross_tenant_cohort_branches
from public.cohorts c
join public.branches b on b.id = c.branch_id
where c.branch_id is not null and c.tenant_id <> b.tenant_id;

select count(*) = 0 as no_cross_tenant_cohort_grades
from public.cohorts c
join public.grades g on g.id = c.grade_id
where c.grade_id is not null and c.tenant_id <> g.tenant_id;

select count(*) = 0 as no_cross_tenant_cohort_subjects
from public.cohorts c
join public.subjects s on s.id = c.subject_id
where c.subject_id is not null and c.tenant_id <> s.tenant_id;

select count(*) = 0 as no_cross_tenant_cohort_rooms
from public.cohorts c
join public.rooms r on r.id = c.room_id
where c.room_id is not null and c.tenant_id <> r.tenant_id;

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
