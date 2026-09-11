import "server-only";

import { getPostgresAccountAccess, getPostgresCurrentUser } from "@/lib/auth/postgres-auth";
import { listPostgresWorkspaceRequests } from "@/lib/auth/postgres-workspace-requests";
import { applicationSql } from "@/lib/database/application-sql";
import type { ProductLevel } from "@/lib/tenant/product-level";
import type { TenantType } from "@/lib/tenant/tenant-type";

export type WorkspaceRequestStatus = "pending_approval" | "approved" | "rejected";
export type WorkspaceRequest = {
  id: string;
  email: string;
  tenant_type: TenantType;
  requested_product_level: ProductLevel;
  workspace_name: string;
  slug: string;
  mobile_phone: string | null;
  whatsapp_phone: string | null;
  status: WorkspaceRequestStatus;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const workspaceRequestFields = "id,email::text as email,tenant_type::text as tenant_type,requested_product_level::text as requested_product_level,workspace_name,slug::text as slug,mobile_phone,whatsapp_phone,status::text as status,rejection_reason,created_at::text as created_at,reviewed_at::text as reviewed_at";

type PortalAccess = {
  user: { id: string; email: string } | null;
  membership: { tenant_id: string; role: string } | null;
  student: { id: string; tenant_id: string; full_name: string } | null;
  guardian: { id: string; tenant_id: string; full_name: string } | null;
  request: WorkspaceRequest | null;
  isPlatformAdmin: boolean;
};

export async function getCurrentAccountAccess(): Promise<PortalAccess> {
  const sql = applicationSql();
  const user = await getPostgresCurrentUser(sql);
  if (!user) return { user: null, membership: null, student: null, guardian: null, request: null, isPlatformAdmin: false };

  const [membership, student, guardian, request, account] = await Promise.all([
    sql.query<{ tenant_id: string; role: string }>("select tenant_id, role::text as role from public.memberships where user_id = $1 and active = true order by created_at limit 1", [user.id]),
    sql.query<{ id: string; tenant_id: string; full_name: string }>("select id, tenant_id, full_name from public.students where user_id = $1 and active = true limit 1", [user.id]),
    sql.query<{ id: string; tenant_id: string; full_name: string }>("select id, tenant_id, full_name from public.guardians where user_id = $1 and active = true limit 1", [user.id]),
    sql.query<WorkspaceRequest>(`select ${workspaceRequestFields} from public.workspace_requests where user_id = $1 limit 1`, [user.id]),
    getPostgresAccountAccess(sql, user.id),
  ]);
  return {
    user,
    membership: membership.rows[0] ?? null,
    student: student.rows[0] ?? null,
    guardian: guardian.rows[0] ?? null,
    request: request.rows[0] ?? null,
    isPlatformAdmin: account.isPlatformAdmin,
  };
}

export function getPortalCount(access: Awaited<ReturnType<typeof getCurrentAccountAccess>>) {
  return Number(Boolean(access.membership)) + Number(Boolean(access.student)) + Number(Boolean(access.guardian));
}

export type PasswordResetRequest = {
  id: string;
  requested_email: string;
  whatsapp_phone: string;
  status: "pending" | "code_ready" | "rejected" | "consumed" | "expired";
  created_at: string;
};

async function requireCurrentPlatformAdmin() {
  const sql = applicationSql();
  const user = await getPostgresCurrentUser(sql);
  if (!user || !(await getPostgresAccountAccess(sql, user.id)).isPlatformAdmin) return null;
  return sql;
}

export async function listPendingPasswordResetRequests(): Promise<PasswordResetRequest[] | null> {
  const sql = await requireCurrentPlatformAdmin();
  if (!sql) return null;
  return (await sql.query<PasswordResetRequest>(
    `select id, requested_email::text as requested_email, whatsapp_phone, status::text as status, created_at::text as created_at
     from public.password_reset_requests where status = 'pending' order by created_at asc`,
  )).rows;
}

export async function listPendingWorkspaceRequests(): Promise<WorkspaceRequest[] | null> {
  const sql = await requireCurrentPlatformAdmin();
  if (!sql) return null;
  return listPostgresWorkspaceRequests(sql);
}
