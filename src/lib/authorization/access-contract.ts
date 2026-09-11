import { capabilityDecision, type MemberRole, type TenantCapability } from "@/lib/authorization/policy";

/**
 * العقد المركزي لقرار الوصول.
 *
 * القرار الواحد يجمع ثلاث طبقات مستقلة، ولا تحل إحداها محل الأخرى:
 *
 * ```text
 * Effective Access = Entitlement(tenant, capability) AND RBAC(role, action) AND Scope(resource)
 * ```
 *
 * سبب الرفض جزء من النتيجة، لا تفصيل لاحق، لأن كل سبب يقابل تجربة مختلفة:
 * - `no_entitlement` → حالة منتج مقصودة تشرح الترقية.
 * - `role_denied` → الخطأ لا يخص الاشتراك بل صلاحية الدور.
 * - `scope_required` → الصلاحية موجودة لكن المورد نفسه خارج النطاق.
 *
 * المرجع: docs/PRODUCT_VISION.md §3 و docs/RBAC_MATRIX.md §0.
 */

export const accessReasons = [
  "granted",
  "tenant_missing",
  "tenant_inactive",
  "membership_missing",
  "membership_inactive",
  "no_entitlement",
  "role_denied",
  "scope_required",
] as const;

export type AccessReason = (typeof accessReasons)[number];
export type AccessDecision = "allow" | "scoped" | "deny";

export type AccessVerdict = {
  decision: AccessDecision;
  reason: AccessReason;
  /** المفتاح التجاري الناقص عند `no_entitlement` — يُستخدم في رسالة الترقية. */
  missingEntitlement?: string;
};

/**
 * القدرة التجارية التي يجب أن تكون نشطة حتى تُفعّل قدرة الدور.
 *
 * كل قدرات التشغيل الحالية تنتمي إلى `ops.core`. تُضاف مفاتيح `platform.*`
 * و`learning.*` عند تنفيذ ميزاتها، ولا تُعلن هنا قبل ذلك.
 */
export const entitlementForTenantCapability: Record<TenantCapability, string> = {
  "tenant.read": "ops.core",
  "tenant.update": "ops.core",
  "team.read": "ops.core",
  "team.invite": "ops.core",
  "team.manage": "ops.core",
  "invitations.read": "ops.core",
  "invitations.create": "ops.core",
  "invitations.resend": "ops.core",
  "invitations.revoke": "ops.core",
  "branches.read": "ops.core",
  "branches.manage": "ops.core",
  "rooms.read": "ops.core",
  "rooms.manage": "ops.core",
  "catalog.read": "ops.core",
  "catalog.manage": "ops.core",
  "teachers.read": "ops.core",
  "teachers.manage": "ops.core",
  "courses.read": "ops.core",
  "courses.manage": "ops.core",
  "offerings.read": "ops.core",
  "offerings.manage": "ops.core",
  "students.read": "ops.core",
  "students.create": "ops.core",
  "students.update": "ops.core",
  "guardians.read": "ops.core",
  "guardians.create": "ops.core",
  "guardians.update": "ops.core",
  "cohorts.read": "ops.core",
  "cohorts.create": "ops.core",
  "cohorts.update": "ops.core",
  "enrollments.read": "ops.core",
  "enrollments.create": "ops.core",
  "enrollments.update": "ops.core",
  "sessions.read": "ops.core",
  "sessions.create": "ops.core",
  "sessions.update": "ops.core",
  "attendance.read": "ops.core",
  "attendance.mark": "ops.core",
  "attendance.correct": "ops.core",
  "invoices.read": "ops.core",
  "invoices.create": "ops.core",
  "invoices.update": "ops.core",
  "payments.read": "ops.core",
  "payments.record": "ops.core",
  "payments.correct": "ops.core",
  "audit.read": "ops.core",
};

export function entitlementRequiredFor(capability: TenantCapability): string {
  return entitlementForTenantCapability[capability];
}

export type AccessSubject = {
  /** حالة المساحة كما هي في قاعدة البيانات. */
  tenantStatus: "active" | "suspended" | "missing";
  /** العضوية النشطة داخل المساحة، أو `null` إن لم توجد. */
  membership: { role: MemberRole; active: boolean } | null;
  /** مفاتيح القدرات النشطة الآن لهذه المساحة. */
  entitlements: Iterable<string>;
};

/**
 * يقرر الوصول. الترتيب مقصود:
 * المساحة → العضوية → **الاستحقاق** → الدور → النطاق.
 *
 * الاستحقاق قبل الدور حتى يظهر `no_entitlement` بدل `role_denied` عندما تكون
 * الميزة غير مشتراة أصلًا، فالرسالة الصحيحة هي رسالة ترقية لا رسالة صلاحية.
 */
export function evaluateAccess({
  subject,
  capability,
  requireScope = false,
}: {
  subject: AccessSubject;
  capability: TenantCapability;
  /** هل يحتاج هذا الفعل تحققًا إضافيًا من نطاق المورد؟ */
  requireScope?: boolean;
}): AccessVerdict {
  if (subject.tenantStatus === "missing") return { decision: "deny", reason: "tenant_missing" };
  if (subject.tenantStatus === "suspended") return { decision: "deny", reason: "tenant_inactive" };
  if (!subject.membership) return { decision: "deny", reason: "membership_missing" };
  if (!subject.membership.active) return { decision: "deny", reason: "membership_inactive" };

  const required = entitlementRequiredFor(capability);
  if (!hasKey(subject.entitlements, required)) {
    return { decision: "deny", reason: "no_entitlement", missingEntitlement: required };
  }

  const roleDecision = capabilityDecision(subject.membership.role, capability);
  if (roleDecision === "deny") return { decision: "deny", reason: "role_denied" };
  if (roleDecision === "scoped") return { decision: "scoped", reason: "scope_required" };
  if (requireScope) return { decision: "scoped", reason: "scope_required" };
  return { decision: "allow", reason: "granted" };
}

function hasKey(keys: Iterable<string>, required: string): boolean {
  for (const key of keys) if (key === required) return true;
  return false;
}

/**
 * تقرير قدرات كامل لطبقة العرض.
 *
 * يُستخدم لتعطيل الأزرار وتوضيح السبب، **ولا يُستخدم كحماية**: الخادم يعيد الفحص
 * عبر `requireTenantCapability` عند كل إجراء. الغرض هنا أن يعرف المستخدم لماذا
 * الزر غير متاح قبل أن يضغطه، وأن يفرّق بين صلاحية ناقصة واشتراك ناقص.
 */
export function capabilityReport({
  role,
  entitlements,
  capabilities,
}: {
  role: MemberRole;
  entitlements: Iterable<string>;
  capabilities: readonly TenantCapability[];
}): CapabilityReport {
  const subject: AccessSubject = {
    tenantStatus: "active",
    membership: { role, active: true },
    entitlements,
  };
  const report: CapabilityReport = {};
  for (const capability of capabilities) {
    const verdict = evaluateAccess({ subject, capability });
    report[capability] = {
      allowed: isAllowed(verdict),
      reason: verdict.reason,
      missingEntitlement: verdict.missingEntitlement,
    };
  }
  return report;
}

export type CapabilityReportEntry = {
  allowed: boolean;
  reason: AccessReason;
  missingEntitlement?: string;
};

export type CapabilityReport = Partial<Record<TenantCapability, CapabilityReportEntry>>;

/** هل الرفض سببه غياب الاشتراك؟ تُستخدم لاختيار الرسالة المناسبة في الواجهة. */
export function isEntitlementBlocked(entry: CapabilityReportEntry | undefined): boolean {
  return entry?.reason === "no_entitlement";
}

/** هل الرفض سببه صلاحية الدور؟ */
export function isRoleBlocked(entry: CapabilityReportEntry | undefined): boolean {
  return entry?.reason === "role_denied";
}

/** هل القرار يسمح بالمتابعة؟ `scoped` يسمح، بشرط تحقق النطاق لاحقًا. */
export function isAllowed(verdict: AccessVerdict): boolean {
  return verdict.decision !== "deny";
}

/** رسالة عربية واضحة لكل سبب رفض، بلا تفاصيل داخلية. */
export const accessDenialMessages: Record<AccessReason, string> = {
  granted: "",
  tenant_missing: "مساحة العمل غير موجودة",
  tenant_inactive: "مساحة العمل موقوفة حاليًا",
  membership_missing: "ليس لديك وصول إلى مساحة العمل المطلوبة",
  membership_inactive: "عضويتك في مساحة العمل غير مفعّلة",
  no_entitlement: "هذه الميزة غير مفعّلة في مساحة العمل الحالية",
  role_denied: "ليس لديك صلاحية لتنفيذ هذه العملية",
  scope_required: "المورد المطلوب خارج نطاق صلاحيتك",
};

export function accessDenialMessage(verdict: AccessVerdict): string {
  return accessDenialMessages[verdict.reason];
}
