import "server-only";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PlatformAdminUser = { id: string; email: string };

export type OverviewMetrics = {
  centers: number;
  independentTeachers: number;
  totalTenants: number;
  students: number;
  memberships: number;
  pendingWorkspaceRequests: number;
  pendingPasswordResets: number;
  auditLogEntries: number;
};

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  account_type: string;
  created_by: string;
  created_at: string;
  status: "active" | "suspended";
  studentCount: number;
  memberCount: number;
};

export type UserRow = {
  id: string;
  email: string;
  created_at: string;
  memberships: { tenant_id: string; role: string; active: boolean }[];
};

export type AuditRow = {
  id: number;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

async function platformAdminUser(): Promise<PlatformAdminUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: admin, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("admin check failed");
  if (!admin) redirect("/");
  return { id: user.id, email: user.email ?? "" };
}

export async function requirePlatformAdmin(): Promise<PlatformAdminUser> {
  return platformAdminUser();
}

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  await platformAdminUser();
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
    centers: tenantRows.filter((t) => t.account_type === "center").length,
    independentTeachers: tenantRows.filter((t) => t.account_type === "independent_teacher").length,
    students: count(students.data),
    memberships: count(memberships.data),
    pendingWorkspaceRequests: (workspaceReq.data ?? []).filter(
      (r) => (r as { status: string }).status === "pending_approval",
    ).length,
    pendingPasswordResets: (resets.data ?? []).filter((r) => (r as { status: string }).status === "pending")
      .length,
    auditLogEntries: count(audit.data),
  };
}

export async function listTenants(): Promise<TenantRow[]> {
  await platformAdminUser();
  const admin = createAdminClient();

  const { data: tenants, error } = await admin
    .from("tenants")
    .select("id,name,slug,account_type,created_by,created_at,status")
    .order("created_at", { ascending: false });
  if (error) throw new Error("failed to load tenants");
  const rows = tenants ?? [];

  const tenantIds = rows.map((t) => t.id);
  if (tenantIds.length === 0) return [];

  const [studentsData, membershipsData] = await Promise.all([
    admin
      .from("students")
      .select("tenant_id")
      .in("tenant_id", tenantIds),
    admin.from("memberships").select("tenant_id").in("tenant_id", tenantIds),
  ]);

  const studentCounts = new Map<string, number>();
  for (const s of studentsData.data ?? []) {
    const t = s.tenant_id as string;
    studentCounts.set(t, (studentCounts.get(t) ?? 0) + 1);
  }
  const memberCounts = new Map<string, number>();
  for (const m of membershipsData.data ?? []) {
    const t = m.tenant_id as string;
    memberCounts.set(t, (memberCounts.get(t) ?? 0) + 1);
  }

  return rows.map((t) => ({
    id: t.id,
    name: t.name as string,
    slug: t.slug as string,
    account_type: t.account_type as string,
    created_by: t.created_by as string,
    created_at: t.created_at as string,
    status: (t.status as "active" | "suspended") ?? "active",
    studentCount: studentCounts.get(t.id) ?? 0,
    memberCount: memberCounts.get(t.id) ?? 0,
  }));
}

export async function listUsers(): Promise<UserRow[]> {
  await platformAdminUser();
  const admin = createAdminClient();

  const { data: memberships, error: mError } = await admin
    .from("memberships")
    .select("user_id,tenant_id,role,active");
  if (mError) throw new Error("failed to load memberships");

  const userLookup = new Map<string, UserRow>();
  for (const m of memberships ?? []) {
    const uid = m.user_id as string;
    const entry = userLookup.get(uid) ?? {
      id: uid,
      email: "",
      created_at: "",
      memberships: [],
    };
    entry.memberships.push({
      tenant_id: m.tenant_id as string,
      role: m.role as string,
      active: m.active as boolean,
    });
    userLookup.set(uid, entry);
  }

  const userIds = [...userLookup.keys()];
  if (userIds.length === 0) return [];

  const { data: users, error: uError } = await admin.auth.admin.listUsers();
  if (uError) throw new Error("failed to load auth users");

  const result: UserRow[] = [];
  for (const u of users?.users ?? []) {
    const entry = userLookup.get(u.id);
    if (entry) {
      entry.email = u.email ?? "";
      entry.created_at = u.created_at ?? "";
      result.push(entry);
    }
  }
  // Include any membership users not returned (defensive).
  for (const uid of userIds) {
    if (!result.find((r) => r.id === uid)) {
      result.push(userLookup.get(uid)!);
    }
  }
  return result;
}

export type PlatformReport = {
  tenantByType: { label: string; value: number }[];
  requestsByStatus: { label: string; value: number }[];
  membershipsByRole: { label: string; value: number }[];
  activeStudents: number;
  inactiveStudents: number;
};

export async function getPlatformReport(): Promise<PlatformReport> {
  await platformAdminUser();
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
    activeStudents: (students.data ?? []).filter((s) => s.active === true).length,
    inactiveStudents: (students.data ?? []).filter((s) => s.active === false).length,
  };
}

export async function listPlatformAudit(limit = 30): Promise<AuditRow[]> {
  await platformAdminUser();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_audit_logs")
    .select("id,actor_user_id,action,entity_type,entity_id,details,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("failed to load audit logs");
  return (data ?? []) as AuditRow[];
}