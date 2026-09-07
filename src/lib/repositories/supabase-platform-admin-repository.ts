import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  PlatformAdminRepository,
  RepositoryOverviewMetrics,
  RepositoryPlatformAdminUser,
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
}

export const platformAdminRepository: PlatformAdminRepository = new SupabasePlatformAdminRepository();
