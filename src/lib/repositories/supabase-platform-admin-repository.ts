import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  PlatformAdminRepository,
  RepositoryAuditRow,
  RepositoryAuditTenant,
  RepositoryOverviewMetrics,
  RepositoryPlatformAdminAccess,
  RepositoryPlatformReport,
  RepositoryTenantRow,
  RepositoryUserRow,
} from "@/lib/repositories/platform-admin-repository";

export class SupabasePlatformAdminRepository implements PlatformAdminRepository {
  async getCurrentPlatformAdminAccess(): Promise<RepositoryPlatformAdminAccess> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { status: "unauthenticated" };

    const { data: admin, error } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw new Error("admin check failed");
    if (!admin) return { status: "forbidden" };

    return {
      status: "authorized",
      user: { id: user.id, email: user.email ?? "" },
    };
  }

  async getOverviewMetrics(): Promise<RepositoryOverviewMetrics> {
    const admin = createAdminClient();

    const [tenants, students, memberships, workspaceReq, resets, audit] = await Promise.all([
      admin.from("tenants").select("id,account_type"),
      admin.from("students").select("id"),
      admin.from("memberships").select("tenant_id"),
      admin.from("workspace_requests").select("id,status"),
      admin.from("password_reset_requests").select("id,status"),
      admin.from("platform_audit_logs").select("id"),
    ]);

    const lookupError =
      tenants.error ?? students.error ?? memberships.error ?? workspaceReq.error ?? resets.error ?? audit.error;
    if (lookupError) throw new Error("failed to load platform overview");

    const count = (data: unknown[] | null) => data?.length ?? 0;
    const tenantRows = (tenants.data ?? []) as { account_type: string }[];

    return {
      totalTenants: tenantRows.length,
      centers: tenantRows.filter((tenant) => tenant.account_type === "center").length,
      independentTeachers: tenantRows.filter((tenant) => tenant.account_type === "independent_teacher").length,
      students: count(students.data),
      memberships: count(memberships.data),
      pendingWorkspaceRequests: (workspaceReq.data ?? []).filter(
        (request) => (request as { status: string }).status === "pending_approval",
      ).length,
      pendingPasswordResets: (resets.data ?? []).filter(
        (request) => (request as { status: string }).status === "pending",
      ).length,
      auditLogEntries: count(audit.data),
    };
  }

  async listTenants(): Promise<RepositoryTenantRow[]> {
    const admin = createAdminClient();
    const { data: tenants, error } = await admin
      .from("tenants")
      .select("id,name,slug,account_type,created_by,created_at,status")
      .order("created_at", { ascending: false });
    if (error) throw new Error("failed to load tenants");

    const rows = tenants ?? [];
    const tenantIds = rows.map((tenant) => tenant.id);
    if (tenantIds.length === 0) return [];

    const [studentsData, membershipsData] = await Promise.all([
      admin.from("students").select("tenant_id").in("tenant_id", tenantIds),
      admin.from("memberships").select("tenant_id").in("tenant_id", tenantIds),
    ]);
    if (studentsData.error ?? membershipsData.error) throw new Error("failed to load tenant counts");

    const studentCounts = new Map<string, number>();
    for (const student of studentsData.data ?? []) {
      const tenantId = student.tenant_id as string;
      studentCounts.set(tenantId, (studentCounts.get(tenantId) ?? 0) + 1);
    }

    const memberCounts = new Map<string, number>();
    for (const membership of membershipsData.data ?? []) {
      const tenantId = membership.tenant_id as string;
      memberCounts.set(tenantId, (memberCounts.get(tenantId) ?? 0) + 1);
    }

    return rows.map((tenant) => ({
      id: tenant.id,
      name: tenant.name as string,
      slug: tenant.slug as string,
      account_type: tenant.account_type as string,
      created_by: tenant.created_by as string,
      created_at: tenant.created_at as string,
      status: (tenant.status as "active" | "suspended") ?? "active",
      studentCount: studentCounts.get(tenant.id) ?? 0,
      memberCount: memberCounts.get(tenant.id) ?? 0,
    }));
  }

  async listUsers(): Promise<RepositoryUserRow[]> {
    const admin = createAdminClient();
    const { data: memberships, error: membershipsError } = await admin
      .from("memberships")
      .select("user_id,tenant_id,role,active");
    if (membershipsError) throw new Error("failed to load memberships");

    const userLookup = new Map<string, RepositoryUserRow>();
    for (const membership of memberships ?? []) {
      const userId = membership.user_id as string;
      const entry = userLookup.get(userId) ?? {
        id: userId,
        email: "",
        created_at: "",
        memberships: [],
      };
      entry.memberships.push({
        tenant_id: membership.tenant_id as string,
        role: membership.role as string,
        active: membership.active as boolean,
      });
      userLookup.set(userId, entry);
    }

    const userIds = [...userLookup.keys()];
    if (userIds.length === 0) return [];

    const { data: users, error: usersError } = await admin.auth.admin.listUsers();
    if (usersError) throw new Error("failed to load auth users");

    const result: RepositoryUserRow[] = [];
    for (const user of users?.users ?? []) {
      const entry = userLookup.get(user.id);
      if (!entry) continue;
      entry.email = user.email ?? "";
      entry.created_at = user.created_at ?? "";
      result.push(entry);
    }

    for (const userId of userIds) {
      if (!result.find((row) => row.id === userId)) result.push(userLookup.get(userId)!);
    }

    return result;
  }

  async getPlatformReport(): Promise<RepositoryPlatformReport> {
    const admin = createAdminClient();
    const [tenants, requests, memberships, students] = await Promise.all([
      admin.from("tenants").select("account_type"),
      admin.from("workspace_requests").select("status"),
      admin.from("memberships").select("role"),
      admin.from("students").select("active"),
    ]);
    const lookupError = tenants.error ?? requests.error ?? memberships.error ?? students.error;
    if (lookupError) throw new Error("failed to load platform reports");

    const countBy = (rows: Record<string, unknown>[] | null, key: string) => {
      const counts = new Map<string, number>();
      for (const row of rows ?? []) {
        const value = String(row[key] ?? "unknown");
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      return counts;
    };

    const tenantCounts = countBy(tenants.data, "account_type");
    const requestCounts = countBy(requests.data, "status");
    const roleCounts = countBy(memberships.data, "role");

    return {
      tenantByType: [
        { label: "سناتر", value: tenantCounts.get("center") ?? 0 },
        { label: "مدرسون مستقلون", value: tenantCounts.get("independent_teacher") ?? 0 },
      ],
      requestsByStatus: [
        { label: "معلقة", value: requestCounts.get("pending_approval") ?? 0 },
        { label: "معتمدة", value: requestCounts.get("approved") ?? 0 },
        { label: "مرفوضة", value: requestCounts.get("rejected") ?? 0 },
      ],
      membershipsByRole: [...roleCounts].map(([label, value]) => ({ label, value })),
      activeStudents: (students.data ?? []).filter((student) => student.active === true).length,
      inactiveStudents: (students.data ?? []).filter((student) => student.active === false).length,
    };
  }

  async listPlatformAudit(limit = 30): Promise<RepositoryAuditRow[]> {
    const admin = createAdminClient();
    const [auditResponse, tenantsResponse, requestsResponse, membershipsResponse, usersResponse] = await Promise.all([
      admin
        .from("platform_audit_logs")
        .select("id,actor_user_id,action,entity_type,entity_id,details,created_at")
        .order("created_at", { ascending: false })
        .limit(limit),
      admin.from("tenants").select("id,name,slug,account_type"),
      admin.from("workspace_requests").select("id,workspace_name,account_type,tenant_id,user_id"),
      admin.from("memberships").select("user_id,tenant_id").eq("active", true),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const lookupError =
      auditResponse.error ?? tenantsResponse.error ?? requestsResponse.error ?? membershipsResponse.error ?? usersResponse.error;
    if (lookupError) throw new Error("failed to load audit logs");

    const tenants = new Map<string, RepositoryAuditTenant>();
    for (const tenant of tenantsResponse.data ?? []) {
      tenants.set(tenant.id, {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        accountType: tenant.account_type,
        source: "tenant",
      });
    }

    const requests = new Map<string, RepositoryAuditTenant>();
    for (const request of requestsResponse.data ?? []) {
      requests.set(
        request.id,
        request.tenant_id && tenants.has(request.tenant_id)
          ? tenants.get(request.tenant_id)!
          : {
              id: `request:${request.id}`,
              name: request.workspace_name,
              slug: null,
              accountType: request.account_type,
              source: "workspace_request",
            },
      );
    }

    const userTenants = new Map<string, RepositoryAuditTenant>();
    for (const membership of membershipsResponse.data ?? []) {
      const tenant = tenants.get(membership.tenant_id);
      if (tenant && !userTenants.has(membership.user_id)) userTenants.set(membership.user_id, tenant);
    }
    for (const request of requestsResponse.data ?? []) {
      const tenant = requests.get(request.id);
      if (tenant && !userTenants.has(request.user_id)) userTenants.set(request.user_id, tenant);
    }

    const actorEmails = new Map(
      (usersResponse.data.users ?? []).flatMap((user) => (user.email ? [[user.id, user.email] as const] : [])),
    );

    const platformTenant: RepositoryAuditTenant = {
      id: "platform",
      name: "أحداث عامة للمنصة",
      slug: null,
      accountType: null,
      source: "platform",
    };

    return (auditResponse.data ?? []).map((entry) => {
      const details = (entry.details ?? {}) as Record<string, unknown>;
      const detailTenantId = typeof details.tenant_id === "string" ? details.tenant_id : null;
      const applicantId = typeof details.applicant_user_id === "string" ? details.applicant_user_id : null;

      let tenant = platformTenant;
      if (detailTenantId && tenants.has(detailTenantId)) tenant = tenants.get(detailTenantId)!;
      else if (entry.entity_type === "tenant" && entry.entity_id && tenants.has(entry.entity_id)) {
        tenant = tenants.get(entry.entity_id)!;
      } else if (entry.entity_type === "workspace_request" && entry.entity_id && requests.has(entry.entity_id)) {
        tenant = requests.get(entry.entity_id)!;
      } else if (applicantId && userTenants.has(applicantId)) {
        tenant = userTenants.get(applicantId)!;
      }

      return {
        id: entry.id,
        actor_user_id: entry.actor_user_id,
        actorEmail: entry.actor_user_id ? actorEmails.get(entry.actor_user_id) ?? null : null,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        details,
        created_at: entry.created_at,
        tenant,
      };
    });
  }
}
