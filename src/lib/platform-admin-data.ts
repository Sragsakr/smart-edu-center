import "server-only";

import { redirect } from "next/navigation";
import { platformAdminRepository } from "@/lib/repositories";

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
  tenant_type: string;
  product_level: string;
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

export type PlatformReport = {
  tenantByType: { label: string; value: number }[];
  requestsByStatus: { label: string; value: number }[];
  membershipsByRole: { label: string; value: number }[];
  activeStudents: number;
  inactiveStudents: number;
};

export type AuditTenant = {
  id: string;
  name: string;
  slug: string | null;
  accountType: string | null;
  source: "tenant" | "workspace_request" | "platform";
};

export type AuditRow = {
  id: number;
  actor_user_id: string | null;
  actorEmail: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  tenant: AuditTenant;
};

async function platformAdminUser(): Promise<PlatformAdminUser> {
  const access = await platformAdminRepository.getCurrentPlatformAdminAccess();

  if (access.status === "unauthenticated") redirect("/login");
  if (access.status === "forbidden") redirect("/");

  return access.user;
}

export async function requirePlatformAdmin(): Promise<PlatformAdminUser> {
  return platformAdminUser();
}

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  await platformAdminUser();
  return platformAdminRepository.getOverviewMetrics();
}

export async function listTenants(): Promise<TenantRow[]> {
  await platformAdminUser();
  return platformAdminRepository.listTenants();
}

export async function listUsers(): Promise<UserRow[]> {
  await platformAdminUser();
  return platformAdminRepository.listUsers();
}

export async function getPlatformReport(): Promise<PlatformReport> {
  await platformAdminUser();
  return platformAdminRepository.getPlatformReport();
}

export async function listPlatformAudit(limit = 30): Promise<AuditRow[]> {
  await platformAdminUser();
  return platformAdminRepository.listPlatformAudit(limit);
}
