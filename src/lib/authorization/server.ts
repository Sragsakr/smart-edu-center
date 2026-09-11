import "server-only";

import { redirect } from "next/navigation";

import { withSessionUser } from "@/lib/auth/session-context";
import type { MemberRole, TenantCapability } from "@/lib/authorization/policy";
import {
  accessDenialMessage,
  evaluateAccess,
  isAllowed,
  type AccessSubject,
  type AccessVerdict,
} from "@/lib/authorization/access-contract";
import { activeEntitlementKeys } from "@/lib/entitlements/entitlement-service";
import type { AccessScopedSqlExecutor } from "@/lib/database/sql-executor";

/**
 * فرض قرار الوصول على الخادم.
 *
 * **كل الدوال هنا تأخذ عملية (callback) لا تُرجع مُنفّذًا.** السبب تقني لا تنظيمي:
 * سياق الوصول يُضبط بـ`set_config(..., true)` أي `LOCAL`، فتُصفَّر قيمه مع نهاية
 * المعاملة. أي استعلام بعد رجوع الدالة يعمل بلا سياق — ومع دور التطبيق
 * (`NOSUPERUSER NOBYPASSRLS`) يرجع **صفر صفوف**. تمرير العملية يجعل هذا الخطأ
 * غير قابل للوقوع أصلًا.
 *
 * المرجع: docs/adr/0007 و docs/RBAC_MATRIX.md §0.
 */

export type AuthorizedTenantContext = {
  /** مُنفّذ داخل معاملة تحمل سياق المساحة — صالح فقط داخل العملية المُمرَّرة. */
  sql: AccessScopedSqlExecutor;
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
 * رفض بسبب غياب الاشتراك لا الصلاحية.
 *
 * مفصول عن `AuthorizationError` لأن الواجهة تعرضه كحالة منتج تشرح الترقية، لا كخطأ.
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

/** يقرأ حالة المساحة ودور العضو والاستحقاقات داخل المعاملة الحالية. */
async function loadAccessSubject(
  sql: AccessScopedSqlExecutor,
  tenantId: string,
  userId: string,
): Promise<AccessSubject> {
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
 * ينفّذ عملية داخل سياق مساحة مصرّح به.
 *
 * الشروط: المساحة موجودة ونشطة، والعضوية نشطة. أما الفعل نفسه فيقرره
 * `requireTenantCapability` أدناه.
 */
export async function withTenantContext<Result>(
  tenantId: string,
  operation: (context: AuthorizedTenantContext) => Promise<Result>,
): Promise<Result> {
  if (!tenantId) throw new AuthorizationError("مساحة العمل غير محددة");

  // العملية تُنفَّذ **داخل** callback الجلسة. تنفيذها بعد رجوعه كان يعني أن الـcommit
  // قد وقع وأن سياق المساحة صُفِّر، فأي قراءة لاحقة ترجع صفر صفوف — وهذا بالضبط
  // ما يرفضه المُنفّذ بخطأ صريح.
  // الغلاف ضروري: العملية قد تُعيد `null` فعلًا، فلا يصلح ذلك كعلامة على غياب
  // الجلسة. الفرق بين «لا جلسة» و«نتيجة فارغة» يجب أن يكون صريحًا.
  const wrapped = await withSessionUser(async ({ sql, user }) => {
    const subject = await loadAccessSubject(sql, tenantId, user.id);

    if (subject.tenantStatus === "missing") throw new AuthorizationError("مساحة العمل غير موجودة");
    if (subject.tenantStatus === "suspended") throw new AuthorizationError("مساحة العمل موقوفة حاليًا");
    if (!subject.membership) throw new AuthorizationError("ليس لديك وصول إلى مساحة العمل المطلوبة");
    if (!subject.membership.active) throw new AuthorizationError("عضويتك في مساحة العمل غير مفعّلة");

    // الدخول إلى المساحة النشطة: به تصبح جداولها مرئية لبقية العملية.
    await sql.enterTenantScope(tenantId);

    return {
      value: await operation({
        sql,
        user,
        tenantId,
        role: subject.membership.role,
        entitlements: subject.entitlements as Set<string>,
      }),
    };
  });
  if (!wrapped) redirect("/login");
  return wrapped.value;
}

function enforce(verdict: AccessVerdict): void {
  if (verdict.decision !== "deny") return;
  if (verdict.reason === "no_entitlement" && verdict.missingEntitlement) {
    throw new EntitlementError(verdict.missingEntitlement, accessDenialMessage(verdict));
  }
  throw new AuthorizationError(accessDenialMessage(verdict));
}

function decide(context: AuthorizedTenantContext, capability: TenantCapability): AccessVerdict {
  return evaluateAccess({
    subject: {
      tenantStatus: "active",
      membership: { role: context.role, active: true },
      entitlements: context.entitlements,
    },
    capability,
  });
}

/**
 * يفرض الطبقات الثلاث على قدرة دور، ثم ينفّذ العملية داخل نفس المعاملة.
 *
 * القرار يأتي من `evaluateAccess` وحده، فلا تتكرر شروط الصلاحية في مواضع مختلفة.
 */
export async function requireTenantCapability<Result>(
  tenantId: string,
  capability: TenantCapability,
  operation: (context: AuthorizedTenantContext) => Promise<Result>,
): Promise<Result> {
  return withTenantContext(tenantId, async (context) => {
    const verdict = decide(context, capability);
    if (verdict.reason === "scope_required") {
      throw new AuthorizationError("هذه الصلاحية تحتاج تحققًا إضافيًا من نطاق المورد");
    }
    enforce(verdict);
    return operation(context);
  });
}

/**
 * كالسابق، لكن يسمح بقدرة ذات نطاق بعد نجاح فحص المورد.
 *
 * فحص النطاق يعمل **داخل المعاملة نفسها**: لولا ذلك لقرأ جداول المساحة بلا سياق
 * فأرجع صفر صفوف دائمًا، أي رفض كل شيء بصمت.
 */
export async function requireTenantCapabilityWithScope<Result>(
  tenantId: string,
  capability: TenantCapability,
  scopeCheck: (context: AuthorizedTenantContext) => Promise<boolean>,
  operation: (context: AuthorizedTenantContext) => Promise<Result>,
): Promise<Result> {
  return withTenantContext(tenantId, async (context) => {
    const verdict = decide(context, capability);
    enforce(verdict);
    if (verdict.decision === "scoped" && !(await scopeCheck(context))) {
      throw new AuthorizationError("المورد المطلوب خارج نطاق صلاحيتك");
    }
    return operation(context);
  });
}

/** تقرير كامل للقدرات محسوب بـ`evaluateAccess` — للعرض والتعطيل في الواجهة فقط. */
export async function tenantCapabilityReport(
  tenantId: string,
  capabilities: readonly TenantCapability[],
): Promise<Record<string, { allowed: boolean; reason: string }>> {
  return withTenantContext(tenantId, (context) => {
    const report: Record<string, { allowed: boolean; reason: string }> = {};
    for (const capability of capabilities) {
      const verdict = decide(context, capability);
      report[capability] = { allowed: isAllowed(verdict), reason: verdict.reason };
    }
    return Promise.resolve(report);
  });
}
