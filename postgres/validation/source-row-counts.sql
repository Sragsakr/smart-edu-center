-- Source-side validation for the current Supabase PostgreSQL database.
-- Run before and immediately after export. Compare with row-counts.sql on the
-- replacement database. auth.users maps to public.app_users on the target.

select 'app_users' as table_name, count(*)::bigint as row_count from auth.users
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

-- Tenant-level source snapshot for high-risk multi-tenant entities.
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
