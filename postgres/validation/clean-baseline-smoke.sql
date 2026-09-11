-- Run after applying only postgres/baseline/0001_smart_edu_center_clean.sql.
-- Every query should return true or zero rows.

select to_regclass('public.app_users') is not null as app_users_exists;
select to_regclass('public.capability_catalog') is not null as capability_catalog_exists;
select to_regclass('public.tenant_entitlements') is not null as tenant_entitlements_exists;
select to_regclass('public.tenant_branding') is not null as tenant_branding_exists;
select to_regclass('public.tenant_domains') is not null as tenant_domains_exists;
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

select count(*) = 0 as no_cross_tenant_cohort_offerings
from public.cohorts c
join public.course_offerings o on o.id = c.course_offering_id
where c.tenant_id <> o.tenant_id;

select count(*) = 0 as no_cross_tenant_enrollments
from public.enrollments e
join public.students s on s.id = e.student_id
join public.course_offerings o on o.id = e.course_offering_id
where e.tenant_id <> s.tenant_id or e.tenant_id <> o.tenant_id;

select count(*) = 0 as no_cross_tenant_cohort_members
from public.cohort_members cm
join public.students s on s.id = cm.student_id
join public.cohorts c on c.id = cm.cohort_id
where cm.tenant_id <> s.tenant_id or cm.tenant_id <> c.tenant_id;

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

-- Commercial foundation integrity (P01-06)

select count(*) = 0 as no_orphan_entitlements
from public.tenant_entitlements e
left join public.tenants t on t.id = e.tenant_id
left join public.capability_catalog c on c.key = e.capability_key
where t.id is null or c.key is null;

select count(*) = 0 as no_feature_without_level
from public.capability_catalog
where kind = 'feature' and included_from_level is null;

select count(*) = 0 as no_non_feature_with_level
from public.capability_catalog
where kind <> 'feature' and included_from_level is not null;

select count(*) = 0 as no_unverified_active_domain
from public.tenant_domains
where status in ('verified', 'active') and verified_at is null;

select count(*) = 0 as no_orphan_branding
from public.tenant_branding b
left join public.tenants t on t.id = b.tenant_id
where t.id is null;

select count(*) = 0 as no_addon_without_source_ref
from public.tenant_entitlements
where source <> 'plan' and source_ref is null;

select count(*) = 0 as no_plan_entitlement_outside_catalog
from public.tenant_entitlements e
join public.capability_catalog c on c.key = e.capability_key
where e.source = 'plan' and c.included_from_level is null;

-- Academic catalog integrity (P01-07)

select to_regclass('public.stages') is not null as stages_exists;
select to_regclass('public.grades') is not null as grades_exists;
select to_regclass('public.subjects') is not null as subjects_exists;
select to_regclass('public.teachers') is not null as teachers_exists;
select to_regclass('public.courses') is not null as courses_exists;
select to_regclass('public.course_teachers') is not null as course_teachers_exists;
select to_regclass('public.course_offerings') is not null as course_offerings_exists;
select to_regclass('public.rooms') is not null as rooms_exists;
select to_regclass('public.cohort_members') is not null as cohort_members_exists;

-- لا يوجد عمود مدرس أو مادة مباشرة على المجموعة
select count(*) = 0 as cohorts_carry_no_subject_or_teacher
from information_schema.columns
where table_schema = 'public' and table_name = 'cohorts'
  and column_name in ('subject', 'teacher_user_id');

-- لا يوجد عمود grade نصي على الطالب
select count(*) = 0 as students_carry_no_text_grade
from information_schema.columns
where table_schema = 'public' and table_name = 'students' and column_name = 'grade';

select count(*) = 0 as no_cross_tenant_grades
from public.grades g
join public.stages st on st.id = g.stage_id
where g.tenant_id <> st.tenant_id;

select count(*) = 0 as no_cross_tenant_courses
from public.courses c
join public.subjects s on s.id = c.subject_id
join public.grades g on g.id = c.grade_id
where c.tenant_id <> s.tenant_id or c.tenant_id <> g.tenant_id;

select count(*) = 0 as no_cross_tenant_course_teachers
from public.course_teachers ct
join public.courses c on c.id = ct.course_id
join public.teachers t on t.id = ct.teacher_id
where ct.tenant_id <> c.tenant_id or ct.tenant_id <> t.tenant_id;

select count(*) = 0 as no_cross_tenant_offerings
from public.course_offerings o
join public.courses c on c.id = o.course_id
join public.teachers t on t.id = o.teacher_id
where o.tenant_id <> c.tenant_id or o.tenant_id <> t.tenant_id;

select count(*) = 0 as no_cross_tenant_rooms
from public.rooms r
join public.branches b on b.id = r.branch_id
where r.tenant_id <> b.tenant_id;

select count(*) = 0 as no_cross_tenant_student_grades
from public.students s
join public.grades g on g.id = s.grade_id
where s.tenant_id <> g.tenant_id;

select count(*) = 0 as no_offering_teacher_outside_course
from public.course_offerings o
where not exists (
  select 1
  from public.course_teachers ct
  where ct.tenant_id = o.tenant_id and ct.course_id = o.course_id and ct.teacher_id = o.teacher_id
);
