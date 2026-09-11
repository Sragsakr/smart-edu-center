import "server-only";

import { redirect } from "next/navigation";

import { getPostgresCurrentUser } from "@/lib/auth/postgres-auth";
import type { MemberRole, TenantCapability } from "@/lib/authorization/policy";
import {
  accessDenialMessage,
  evaluateAccess,
  isAllowed,
  type AccessSubject,
  type AccessVerdict,
} from "@/lib/authorization/access-contract";
import { activeEntitlementKeys } from "@/lib/entitlements/entitlement-service";
import { applicationSql } from "@/lib/database/application-sql";
import type { SqlExecutor } from "@/lib/database/sql-executor";

export type AuthorizedTenantContext = {
  sql: SqlExecutor;
  user: { id: string; email: string };
  tenantId: string;
  role: MemberRole;
  entitlements: Set<string>;
};

/** رفض عام لا يكشف أي تفصيل داخلي. */
export class AuthorizationError extends Error {
  constructor(message = "ليس لديك صلاحية لتنفيذ هذه العملية") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * رفض بسبب غياب الاشتراك، لا بسبب الصلاحية.
 *
 * مفصول عن `AuthorizationError` لأن الواجهة تعرضه كحالة منتج تشرح الترقية،
 * لا كخطأ صلاحية. المرجع: docs/PRODUCT_VISION.md §6.
 */
export class EntitlementError extends AuthorizationError {
  constructor(
    readonly missingEntitlement: string,
    message = "هذه الميزة غير مفعّلة في مساحة العمل الحالية",
  ) {
    super(message);
    this.name = "EntitlementError";
  }
}

/** يقرأ حالة المساحة ودور العضو والاستحقاقات في قراءتين محدودتين. */
async function loadAccessSubject(sql: SqlExecutor, tenantId: string, userId: string): Promise<AccessSubject> {
  const tenant = await sql.query<{ status: string }>(
    `select status::text as status from public.tenants where id = $1 limit 1`,
    [tenantId],
  );
  const tenantRow = tenant.rows[0];
  if (!tenantRow) return { tenantStatus: "missing", membership: null, entitlements: [] };

  const membership = await sql.query<{ role: MemberRole; active: boolean }>(
    `select role::text as role, active
     from public.memberships
     where tenant_id = $1 and user_id = $2
     limit 1`,
    [tenantId, userId],
  );

  return {
    tenantStatus: tenantRow.status as "active" | "suspended",
    membership: membership.rows[0] ?? null,
    entitlements: await activeEntitlementKeys(sql, tenantId),
  };
}

/**
 * سياق مصرّح به لتشغيل عملية واحدة داخل مساحة عمل.
 *
 * يتحقق من المساحة والعضوية والاستحقاقات، ثم يترك قرار الفعل نفسه لكل capability
 * عبر `requireTenantCapability` حتى لا يُقرأ الاشتراك مرتين في العملية الواحدة.
 */
export async function getTenantAuthorizationContext(tenantId: string): Promise<AuthorizedTenantContext> {
  if (!tenantId) throw new AuthorizationError("مساحة العمل غير محددة");
  const sql = applicationSql();
  const user = await getPostgresCurrentUser(sql);
  if (!user) redirect("/login");

  const subject = await loadAccessSubject(sql, tenantId, user.id);
  if (subject.tenantStatus === "missing") throw new AuthorizationError("مساحة العمل غير موجودة");
  if (subject.tenantStatus === "suspended") throw new AuthorizationError("مساحة العمل موقوفة حاليًا");
  if (!subject.membership) throw new AuthorizationError("ليس لديك وصول إلى مساحة العمل المطلوبة");
  if (!subject.membership.active) throw new AuthorizationError("عضويتك في مساحة العمل غير مفعّلة");

  return {
    sql,
    user,
    tenantId,
    role: subject.membership.role,
    entitlements: subject.entitlements as Set<string>,
  };
}

function enforce(verdict: AccessVerdict): void {
  if (verdict.decision !== "deny") return;
  if (verdict.reason === "no_entitlement" && verdict.missingEntitlement) {
    throw new EntitlementError(verdict.missingEntitlement, accessDenialMessage(verdict));
  }
  throw new AuthorizationError(accessDenialMessage(verdict));
}

/**
 * يفرض الطبقات الثلاث على قدرة دور.
 *
 * القرار يأتي من `evaluateAccess` وحده، فلا تتكرر شروط الصلاحية في مواضع مختلفة.
 */
export async function requireTenantCapability(
  tenantId: string,
  capability: TenantCapability,
): Promise<AuthorizedTenantContext> {
  const context = await getTenantAuthorizationContext(tenantId);
  const verdict = evaluateAccess({
    subject: {
      tenantStatus: "active",
      membership: { role: context.role, active: true },
      entitlements: context.entitlements,
    },
    capability,
  });
  if (verdict.reason === "scope_required") {
    throw new AuthorizationError("هذه الصلاحية تحتاج تحققًا إضافيًا من نطاق المورد");
  }
  enforce(verdict);
  return context;
}

/**
 * كالسابق، لكن يسمح بقدرة ذات نطاق إذا نجح فحص المورد نفسه.
 */
export async function requireTenantCapabilityWithScope(
  tenantId: string,
  capability: TenantCapability,
  scopeCheck: (context: AuthorizedTenantContext) => Promise<boolean>,
): Promise<AuthorizedTenantContext> {
  const context = await getTenantAuthorizationContext(tenantId);
  const verdict = evaluateAccess({
    subject: {
      tenantStatus: "active",
      membership: { role: context.role, active: true },
      entitlements: context.entitlements,
    },
    capability,
  });
  enforce(verdict);
  if (verdict.decision === "allow") return context;
  if (!(await scopeCheck(context))) throw new AuthorizationError("المورد المطلوب خارج نطاق صلاحيتك");
  return context;
}

/** تقرير كامل للقدرات محسوب بـ`evaluateAccess` — يُستخدم في الواجهة للعرض والتعطيل فقط. */
export async function tenantCapabilityReport(
  tenantId: string,
  capabilities: readonly TenantCapability[],
): Promise<Record<string, { allowed: boolean; reason: string }>> {
  const context = await getTenantAuthorizationContext(tenantId);
  const subject: AccessSubject = {
    tenantStatus: "active",
    membership: { role: context.role, active: true },
    entitlements: context.entitlements,
  };
  const report: Record<string, { allowed: boolean; reason: string }> = {};
  for (const capability of capabilities) {
    const verdict = evaluateAccess({ subject, capability });
    report[capability] = { allowed: isAllowed(verdict), reason: verdict.reason };
  }
  return report;
}
