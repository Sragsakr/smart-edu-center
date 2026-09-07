-- Run against both source and replacement databases after data copy.
-- The result set is intentionally simple so counts can be compared side-by-side.

select 'app_users' as entity, count(*)::bigint as row_count from public.app_users
union all select 'tenants', count(*) from public.tenants
union all select 'memberships', count(*) from public.memberships
union all select 'branches', count(*) from public.branches
union all select 'students', count(*) from public.students
union all select 'guardians', count(*) from public.guardians
union all select 'student_guardians', count(*) from public.student_guardians
union all select 'cohorts', count(*) from public.cohorts
union all select 'enrollments', count(*) from public.enrollments
union all select 'class_sessions', count(*) from public.class_sessions
union all select 'attendance', count(*) from public.attendance
union all select 'invoices', count(*) from public.invoices
union all select 'payments', count(*) from public.payments
union all select 'audit_logs', count(*) from public.audit_logs
union all select 'platform_admins', count(*) from public.platform_admins
union all select 'workspace_requests', count(*) from public.workspace_requests
union all select 'platform_audit_logs', count(*) from public.platform_audit_logs
union all select 'password_reset_requests', count(*) from public.password_reset_requests
order by entity;

-- Tenant-scoped parity catches cases where the global total matches but rows
-- landed under the wrong tenant.
select 'students' as entity, tenant_id, count(*)::bigint as row_count
from public.students group by tenant_id
union all
select 'memberships', tenant_id, count(*) from public.memberships group by tenant_id
union all
select 'branches', tenant_id, count(*) from public.branches group by tenant_id
union all
select 'cohorts', tenant_id, count(*) from public.cohorts group by tenant_id
union all
select 'enrollments', tenant_id, count(*) from public.enrollments group by tenant_id
union all
select 'invoices', tenant_id, count(*) from public.invoices group by tenant_id
union all
select 'payments', tenant_id, count(*) from public.payments group by tenant_id
order by entity, tenant_id;
