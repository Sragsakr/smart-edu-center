import "server-only";

import type { CurrentUserProvider } from "@/lib/auth/current-user-provider";
import type { SqlExecutor } from "@/lib/database/sql-executor";
import type {
  PlatformAdminRepository,
  RepositoryAuditRow,
  RepositoryOverviewMetrics,
  RepositoryPlatformAdminAccess,
  RepositoryPlatformReport,
  RepositoryTenantRow,
  RepositoryUserRow,
} from "@/lib/repositories/platform-admin-repository";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  tenant_type: string;
  product_level: string;
  created_by: string;
  created_at: string;
  status: "active" | "suspended";
  student_count: number;
  member_count: number;
};

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  memberships: { tenant_id: string; role: string; active: boolean }[] | null;
};

type AuditRow = {
  id: number;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string | null;
  tenant_type: string | null;
  tenant_source: "tenant" | "workspace_request" | "platform";
};

export class PostgresPlatformAdminRepository implements PlatformAdminRepository {
  constructor(
    private readonly sql: SqlExecutor,
    private readonly currentUserProvider: CurrentUserProvider,
  ) {}

  async getCurrentPlatformAdminAccess(): Promise<RepositoryPlatformAdminAccess> {
    const user = await this.currentUserProvider.getCurrentUser();
    if (!user) return { status: "unauthenticated" };

    const admin = await this.sql.query<{ user_id: string }>(
      "select user_id from public.platform_admins where user_id = $1 limit 1",
      [user.id],
    );
    if (admin.rowCount === 0) return { status: "forbidden" };

    return { status: "authorized", user };
  }

  async getOverviewMetrics(): Promise<RepositoryOverviewMetrics> {
    const result = await this.sql.query<{
      centers: number;
      independent_teachers: number;
      total_tenants: number;
      students: number;
      memberships: number;
      pending_workspace_requests: number;
      pending_password_resets: number;
      audit_log_entries: number;
    }>(`
      select
        count(*) filter (where tenant_type = 'center')::int as centers,
        count(*) filter (where tenant_type = 'teacher')::int as independent_teachers,
        count(*)::int as total_tenants,
        (select count(*)::int from public.students) as students,
        (select count(*)::int from public.memberships) as memberships,
        (select count(*)::int from public.workspace_requests where status = 'pending_approval') as pending_workspace_requests,
        (select count(*)::int from public.password_reset_requests where status = 'pending') as pending_password_resets,
        (select count(*)::int from public.platform_audit_logs) as audit_log_entries
      from public.tenants
    `);

    const row = result.rows[0];
    return {
      centers: row?.centers ?? 0,
      independentTeachers: row?.independent_teachers ?? 0,
      totalTenants: row?.total_tenants ?? 0,
      students: row?.students ?? 0,
      memberships: row?.memberships ?? 0,
      pendingWorkspaceRequests: row?.pending_workspace_requests ?? 0,
      pendingPasswordResets: row?.pending_password_resets ?? 0,
      auditLogEntries: row?.audit_log_entries ?? 0,
    };
  }

  async listTenants(): Promise<RepositoryTenantRow[]> {
    const result = await this.sql.query<TenantRow>(`
      select
        t.id,
        t.name,
        t.slug::text as slug,
        t.tenant_type::text as tenant_type,
        t.product_level::text as product_level,
        t.created_by,
        t.created_at::text as created_at,
        t.status::text as status,
        count(distinct s.id)::int as student_count,
        count(distinct m.user_id)::int as member_count
      from public.tenants t
      left join public.students s on s.tenant_id = t.id
      left join public.memberships m on m.tenant_id = t.id
      group by t.id
      order by t.created_at desc
    `);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      tenant_type: row.tenant_type,
      product_level: row.product_level,
      created_by: row.created_by,
      created_at: row.created_at,
      status: row.status,
      studentCount: row.student_count,
      memberCount: row.member_count,
    }));
  }

  async listUsers(): Promise<RepositoryUserRow[]> {
    const result = await this.sql.query<UserRow>(`
      select
        u.id,
        u.email::text as email,
        u.created_at::text as created_at,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'tenant_id', m.tenant_id,
              'role', m.role::text,
              'active', m.active
            )
            order by m.created_at
          ) filter (where m.user_id is not null),
          '[]'::jsonb
        ) as memberships
      from public.app_users u
      left join public.memberships m on m.user_id = u.id
      group by u.id
      order by u.created_at desc
    `);

    return result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      created_at: row.created_at,
      memberships: row.memberships ?? [],
    }));
  }

  async getPlatformReport(): Promise<RepositoryPlatformReport> {
    const [tenantTypes, requestStatuses, membershipRoles, studentStatus] = await Promise.all([
      this.sql.query<{ label: string; value: number }>(`
        select tenant_type::text as label, count(*)::int as value
        from public.tenants
        group by tenant_type
      `),
      this.sql.query<{ label: string; value: number }>(`
        select status::text as label, count(*)::int as value
        from public.workspace_requests
        group by status
      `),
      this.sql.query<{ label: string; value: number }>(`
        select role::text as label, count(*)::int as value
        from public.memberships
        group by role
      `),
      this.sql.query<{ active_students: number; inactive_students: number }>(`
        select
          count(*) filter (where active = true)::int as active_students,
          count(*) filter (where active = false)::int as inactive_students
        from public.students
      `),
    ]);

    const tenantMap = new Map(tenantTypes.rows.map((row) => [row.label, row.value]));
    const requestMap = new Map(requestStatuses.rows.map((row) => [row.label, row.value]));
    const student = studentStatus.rows[0];

    return {
      tenantByType: [
        { label: "سناتر", value: tenantMap.get("center") ?? 0 },
        { label: "مدرسون مستقلون", value: tenantMap.get("teacher") ?? 0 },
      ],
      requestsByStatus: [
        { label: "معلقة", value: requestMap.get("pending_approval") ?? 0 },
        { label: "معتمدة", value: requestMap.get("approved") ?? 0 },
        { label: "مرفوضة", value: requestMap.get("rejected") ?? 0 },
      ],
      membershipsByRole: membershipRoles.rows,
      activeStudents: student?.active_students ?? 0,
      inactiveStudents: student?.inactive_students ?? 0,
    };
  }

  async listPlatformAudit(limit = 30): Promise<RepositoryAuditRow[]> {
    const result = await this.sql.query<AuditRow>(
      `
        select
          a.id,
          a.actor_user_id,
          u.email::text as actor_email,
          a.action,
          a.entity_type,
          a.entity_id,
          a.details,
          a.created_at::text as created_at,
          coalesce(t.id::text, 'platform') as tenant_id,
          coalesce(t.name, wr.workspace_name, 'أحداث عامة للمنصة') as tenant_name,
          t.slug::text as tenant_slug,
          coalesce(t.tenant_type::text, wr.tenant_type::text) as tenant_type,
          case
            when t.id is not null then 'tenant'
            when wr.id is not null then 'workspace_request'
            else 'platform'
          end as tenant_source
        from public.platform_audit_logs a
        left join public.app_users u on u.id = a.actor_user_id
        left join public.tenants t
          on t.id::text = a.entity_id
          and a.entity_type = 'tenant'
        left join public.workspace_requests wr
          on wr.id::text = a.entity_id
          and a.entity_type = 'workspace_request'
        order by a.created_at desc
        limit $1
      `,
      [limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      actor_user_id: row.actor_user_id,
      actorEmail: row.actor_email,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      details: row.details,
      created_at: row.created_at,
      tenant: {
        id: row.tenant_id,
        name: row.tenant_name,
        slug: row.tenant_slug,
        accountType: row.tenant_type,
        source: row.tenant_source,
      },
    }));
  }
}
