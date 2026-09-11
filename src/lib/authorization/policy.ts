export const memberRoles = ["owner", "admin", "teacher", "receptionist", "accountant"] as const;
export type MemberRole = (typeof memberRoles)[number];

/**
 * قدرات الأدوار داخل مساحة عمل.
 *
 * القائمة هي الترجمة التنفيذية لجدول `docs/RBAC_MATRIX.md` §4. عمدًا مفصولة
 * `read` عن `manage` لكل مورد بدل CRUD رباعي: الحذف النهائي ليس مسارًا معروضًا
 * في المنتج أصلًا (الأرشفة هي السلوك المقصود)، فإضافة `delete` منفصلة كانت ستوثّق
 * قدرة لا وجود لها في الواجهة ولا في الـDAL.
 */
export const tenantCapabilities = [
  "tenant.read", "tenant.update", "team.read", "team.invite", "team.manage",
  "invitations.read", "invitations.create", "invitations.resend", "invitations.revoke",
  "branches.read", "branches.manage",
  "rooms.read", "rooms.manage",
  "catalog.read", "catalog.manage",
  "teachers.read", "teachers.manage",
  "courses.read", "courses.manage",
  "offerings.read", "offerings.manage",
  "students.read", "students.create", "students.update", "guardians.read", "guardians.create", "guardians.update",
  "cohorts.read", "cohorts.create", "cohorts.update", "enrollments.read", "enrollments.create", "enrollments.update",
  "sessions.read", "sessions.create", "sessions.update", "attendance.read", "attendance.mark", "attendance.correct",
  "invoices.read", "invoices.create", "invoices.update", "payments.read", "payments.record", "payments.correct", "audit.read",
] as const;

export type TenantCapability = (typeof tenantCapabilities)[number];
export type CapabilityDecision = "allow" | "scoped" | "deny";
export type CapabilityMap = Record<TenantCapability, CapabilityDecision>;

const fullAccess = Object.fromEntries(tenantCapabilities.map((capability) => [capability, "allow"])) as Partial<Record<TenantCapability, CapabilityDecision>>;

const policy: Record<MemberRole, Partial<Record<TenantCapability, CapabilityDecision>>> = {
  owner: fullAccess,
  admin: fullAccess,
  teacher: {
    "tenant.read": "allow", "team.read": "scoped", "students.read": "scoped", "guardians.read": "scoped",
    // قراءة الكتالوج عامة للمدرس: يحتاج معرفة الصفوف والمواد والمقررات للتنقل.
    "branches.read": "allow", "rooms.read": "allow", "catalog.read": "allow",
    // أما المدرس والمقرر والعرض فمقيّدة بما هو مسند إليه فعلًا.
    "teachers.read": "scoped", "courses.read": "scoped", "offerings.read": "scoped",
    "cohorts.read": "scoped", "enrollments.read": "scoped", "sessions.read": "scoped", "sessions.create": "scoped",
    "sessions.update": "scoped", "attendance.read": "scoped", "attendance.mark": "scoped", "attendance.correct": "scoped",
    "invoices.read": "scoped", "payments.read": "scoped",
  },
  receptionist: {
    "tenant.read": "allow", "team.read": "scoped",
    // الاستقبال يسجّل الطلاب في العروض، فيحتاج الكتالوج كاملًا للتسجيل.
    "branches.read": "allow", "rooms.read": "allow", "catalog.read": "allow",
    "teachers.read": "allow", "teachers.manage": "allow",
    "courses.read": "allow", "courses.manage": "scoped",
    "offerings.read": "allow", "offerings.manage": "scoped",
    "students.read": "allow", "students.create": "allow", "students.update": "allow",
    "guardians.read": "allow", "guardians.create": "allow", "guardians.update": "allow", "cohorts.read": "allow", "cohorts.create": "allow",
    "cohorts.update": "allow", "enrollments.read": "allow", "enrollments.create": "allow", "enrollments.update": "allow",
    "sessions.read": "allow", "attendance.read": "allow", "attendance.mark": "allow", "attendance.correct": "allow",
    "invoices.read": "allow", "invoices.create": "allow", "invoices.update": "allow", "payments.read": "allow", "payments.record": "allow",
  },
  accountant: {
    "tenant.read": "allow", "team.read": "scoped",
    // المحاسب يقرأ الكتالوج ليعرف مقابل ماذا يصدر الفاتورة، ولا يعدّله.
    "branches.read": "allow", "rooms.read": "allow", "catalog.read": "allow",
    "teachers.read": "allow", "courses.read": "allow", "offerings.read": "allow",
    "students.read": "allow", "guardians.read": "allow", "cohorts.read": "allow",
    "enrollments.read": "allow", "sessions.read": "allow", "attendance.read": "allow", "invoices.read": "allow", "invoices.create": "allow",
    "invoices.update": "allow", "payments.read": "allow", "payments.record": "allow", "payments.correct": "allow",
  },
};

export function capabilityDecision(role: MemberRole, capability: TenantCapability): CapabilityDecision {
  return policy[role][capability] ?? "deny";
}

export function capabilitiesForRole(role: MemberRole): CapabilityMap {
  return Object.fromEntries(tenantCapabilities.map((capability) => [capability, capabilityDecision(role, capability)])) as CapabilityMap;
}

/** كل القدرات التي تبدأ ببادئة مورد — للاستخدام في الفحوص والواجهة. */
export function capabilitiesForResource(prefix: string): TenantCapability[] {
  return tenantCapabilities.filter((capability) => capability.startsWith(`${prefix}.`));
}

export function can(role: MemberRole, capability: TenantCapability): boolean {
  return capabilityDecision(role, capability) !== "deny";
}

export function canWithoutResourceScope(role: MemberRole, capability: TenantCapability): boolean {
  return capabilityDecision(role, capability) === "allow";
}
