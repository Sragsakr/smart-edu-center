import "server-only";

import { redirect } from "next/navigation";

import { getPostgresCurrentUser } from "@/lib/auth/postgres-auth";
import { capabilityDecision, type MemberRole, type TenantCapability } from "@/lib/authorization/policy";
import { applicationSql } from "@/lib/database/application-sql";
import type { SqlExecutor } from "@/lib/database/sql-executor";

export type AuthorizedTenantContext = {
  sql: SqlExecutor;
  user: { id: string; email: string };
  tenantId: string;
  role: MemberRole;
};

export class AuthorizationError extends Error {
  constructor(message = "ليس لديك صلاحية لتنفيذ هذه العملية") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getTenantAuthorizationContext(tenantId: string): Promise<AuthorizedTenantContext> {
  if (!tenantId) throw new AuthorizationError("مساحة العمل غير محددة");
  const sql = applicationSql();
  const user = await getPostgresCurrentUser(sql);
  if (!user) redirect("/login");

  const result = await sql.query<{ role: MemberRole }>(
    `select m.role::text as role
     from public.memberships m
     join public.tenants t on t.id = m.tenant_id
     where m.tenant_id = $1 and m.user_id = $2 and m.active = true and t.status = 'active'
     limit 1`,
    [tenantId, user.id],
  );
  const membership = result.rows[0];
  if (!membership) throw new AuthorizationError("ليس لديك وصول إلى مساحة العمل المطلوبة");
  return { sql, user, tenantId, role: membership.role };
}

export async function requireTenantCapability(tenantId: string, capability: TenantCapability): Promise<AuthorizedTenantContext> {
  const context = await getTenantAuthorizationContext(tenantId);
  const decision = capabilityDecision(context.role, capability);
  if (decision === "deny") throw new AuthorizationError();
  if (decision === "scoped") throw new AuthorizationError("هذه الصلاحية تحتاج تحققًا إضافيًا من نطاق المورد");
  return context;
}

export async function requireTenantCapabilityWithScope(
  tenantId: string,
  capability: TenantCapability,
  scopeCheck: (context: AuthorizedTenantContext) => Promise<boolean>,
): Promise<AuthorizedTenantContext> {
  const context = await getTenantAuthorizationContext(tenantId);
  const decision = capabilityDecision(context.role, capability);
  if (decision === "deny") throw new AuthorizationError();
  if (decision === "allow") return context;
  if (!(await scopeCheck(context))) throw new AuthorizationError("المورد المطلوب خارج نطاق صلاحيتك");
  return context;
}
