import "server-only";

import { getPostgresAccountAccess } from "@/lib/auth/postgres-auth";
import { listPostgresWorkspaceRequests } from "@/lib/auth/postgres-workspace-requests";
import { withPlatformScope, withSessionUser } from "@/lib/auth/session-context";
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

const workspaceRequestFields =
  "id,email::text as email,tenant_type::text as tenant_type,requested_product_level::text as requested_product_level,workspace_name,slug::text as slug,mobile_phone,whatsapp_phone,status::text as status,rejection_reason,created_at::text as created_at,reviewed_at::text as reviewed_at";

export type PortalAccess = {
  user: { id: string; email: string } | null;
  membership: { tenant_id: string; role: string } | null;
  student: { id: string; tenant_id: string; full_name: string } | null;
  guardian: { id: string; tenant_id: string; full_name: string } | null;
  request: WorkspaceRequest | null;
  isPlatformAdmin: boolean;
};

const emptyAccess: PortalAccess = {
  user: null,
  membership: null,
  student: null,
  guardian: null,
  request: null,
  isPlatformAdmin: false,
};

/**
 * يحل كل الوصول المحتمل للهوية الموثقة: عضوية إدارة، أو علاقة طالب، أو علاقة ولي أمر.
 *
 * تُنفَّذ كل القراءات داخل معاملة واحدة تحمل الهوية، فتُقرأ من لحظة واحدة متسقة.
 * القراءات متسلسلة لا متوازية لأنها على اتصال واحد، وهذا شرط أن تكون خاضعة للسياسات.
 *
 * العلاقة المحلولة لا تفتح بوابة بذاتها: البوابة تحتاج استحقاقًا في طبقة المنتج.
 */
export async function getCurrentAccountAccess(): Promise<PortalAccess> {
  const access = await withSessionUser(async ({ sql, user }) => {
    const membership = await sql.query<{ tenant_id: string; role: string }>(
      `select tenant_id, role::text as role
       from public.memberships
       where user_id = $1 and active = true
       order by created_at
       limit 1`,
      [user.id],
    );
    const student = await sql.query<{ id: string; tenant_id: string; full_name: string }>(
      `select id, tenant_id, full_name
       from public.students
       where user_id = $1 and active = true
       limit 1`,
      [user.id],
    );
    const guardian = await sql.query<{ id: string; tenant_id: string; full_name: string }>(
      `select id, tenant_id, full_name
       from public.guardians
       where user_id = $1 and active = true
       limit 1`,
      [user.id],
    );
    const request = await sql.query<WorkspaceRequest>(
      `select ${workspaceRequestFields} from public.workspace_requests where user_id = $1 limit 1`,
      [user.id],
    );
    const account = await getPostgresAccountAccess(sql, user.id);

    return {
      user,
      membership: membership.rows[0] ?? null,
      student: student.rows[0] ?? null,
      guardian: guardian.rows[0] ?? null,
      request: request.rows[0] ?? null,
      isPlatformAdmin: account.isPlatformAdmin,
    };
  });

  return access ?? emptyAccess;
}

export function getPortalCount(access: PortalAccess): number {
  return Number(Boolean(access.membership)) + Number(Boolean(access.student)) + Number(Boolean(access.guardian));
}

export type PasswordResetRequest = {
  id: string;
  requested_email: string;
  whatsapp_phone: string;
  status: "pending" | "code_ready" | "rejected" | "consumed" | "expired";
  created_at: string;
};

/** طلبات استعادة كلمة المرور المعلّقة — لنطاق المنصة فقط. */
export async function listPendingPasswordResetRequests(): Promise<PasswordResetRequest[] | null> {
  const outcome = await withPlatformScope(async ({ sql }) => {
    const result = await sql.query<PasswordResetRequest>(
      `select id, requested_email::text as requested_email, whatsapp_phone,
              status::text as status, created_at::text as created_at
       from public.password_reset_requests
       where status = 'pending'
       order by created_at asc`,
    );
    return result.rows;
  });
  return outcome.status === "authorized" ? outcome.value : null;
}

/** طلبات إنشاء المساحات المعلّقة — لنطاق المنصة فقط. */
export async function listPendingWorkspaceRequests(): Promise<WorkspaceRequest[] | null> {
  const outcome = await withPlatformScope(({ sql }) => listPostgresWorkspaceRequests(sql));
  return outcome.status === "authorized" ? outcome.value : null;
}
