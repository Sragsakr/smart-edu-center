import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  PlatformAdminRepository,
  RepositoryOverviewMetrics,
  RepositoryPlatformAdminUser,
  RepositoryTenantRow,
  RepositoryUserRow,
} from "@/lib/repositories/platform-admin-repository";

export class SupabasePlatformAdminRepository implements PlatformAdminRepository {
  async getCurrentPlatformAdmin(): Promise<RepositoryPlatformAdminUser | null> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: admin, error } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw new Error("admin check failed");
    if (!admin) return null;

    return { id: user.id, email: user.email ?? "" };
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
}

export const platformAdminRepository: PlatformAdminRepository = new SupabasePlatformAdminRepository();
