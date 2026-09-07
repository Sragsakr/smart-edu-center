-- Replacement PostgreSQL validation. Run after the data copy and compare the
-- output with postgres/validation/source-row-counts.sql before cutover.

select 'app_users' as table_name, count(*)::bigint as row_count from public.app_users
union all select 'tenants', count(*)::bigint from public.tenants
union all select 'memberships', count(*)::bigint from public.memberships
union all select 'branches', count(*)::bigint from public.branches
union all select 'students', count(*)::bigint from public.students
union all select 'guardians', count(*)::bigint from public.guardians
union all select 'student_guardians', count(*)::bigint from public.student_guardians
union all select 'cohorts', count(*)::bigint from public.cohorts
union all select 'enrollments', count(*)::bigint from public.enrollments
union all select 'class_sessions', count(*)::bigint from public.class_sessions
union all select 'attendance', count(*)::bigint from public.attendance
union all select 'invoices', count(*)::bigint from public.invoices
union all select 'payments', count(*)::bigint from public.payments
union all select 'audit_logs', count(*)::bigint from public.audit_logs
union all select 'platform_admins', count(*)::bigint from public.platform_admins
union all select 'workspace_requests', count(*)::bigint from public.workspace_requests
union all select 'platform_audit_logs', count(*)::bigint from public.platform_audit_logs
union all select 'password_reset_requests', count(*)::bigint from public.password_reset_requests
order by table_name;

-- Referential-integrity spot checks. Every query must return zero.
select 'memberships_without_user' as check_name, count(*)::bigint as invalid_rows
from public.memberships m left join public.app_users u on u.id = m.user_id where u.id is null
union all
select 'tenants_without_creator', count(*)::bigint
from public.tenants t left join public.app_users u on u.id = t.created_by where u.id is null
union all
select 'workspace_requests_without_user', count(*)::bigint
from public.workspace_requests r left join public.app_users u on u.id = r.user_id where u.id is null
union all
select 'students_without_tenant', count(*)::bigint
from public.students s left join public.tenants t on t.id = s.tenant_id where t.id is null
union all
select 'memberships_without_tenant', count(*)::bigint
from public.memberships m left join public.tenants t on t.id = m.tenant_id where t.id is null;

-- Tenant-level comparison for the highest-risk multi-tenant entities.
select
  t.id as tenant_id,
  t.slug,
  count(distinct m.user_id) as memberships,
  count(distinct s.id) as students,
  count(distinct b.id) as branches,
  count(distinct c.id) as cohorts
from public.tenants t
left join public.memberships m on m.tenant_id = t.id
left join public.students s on s.tenant_id = t.id
left join public.branches b on b.tenant_id = t.id
left join public.cohorts c on c.tenant_id = t.id
group by t.id, t.slug
order by t.slug;
