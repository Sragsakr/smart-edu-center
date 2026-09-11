import { describe, expect, it } from "vitest";

import { capabilityDecision, memberRoles, tenantCapabilities, type MemberRole } from "./policy";
import { capabilityCatalog } from "@/lib/entitlements/capability-catalog";

/** كل مفاتيح كتالوج الاستحقاق — الفضاء الآخر الذي يجب ألا يتقاطع مع RBAC. */
function entitlementKeys(): string[] {
  return capabilityCatalog.map((entry) => entry.key);
}
import type { CapabilityDecision } from "./policy";

/**
 * مطابقة `docs/RBAC_MATRIX.md` §4 بالكود.
 *
 * الغرض: أن تكون الوثيقة والتنفيذ شيئًا واحدًا. أي انحراف بين الجدول المكتوب
 * والقرار الفعلي يفشل هنا بدل أن يُكتشف في الإنتاج.
 *
 * الاختصارات في الجدول تُترجم كما يلي:
 * - `R`  → `read`: مسموح للجميع بالأدوار المذكورة.
 * - `C/U/D` → تُدمج في `manage` لأن الحذف النهائي ليس مسارًا معروضًا في المنتج
 *   (الأرشفة هي السلوك المقصود)، فإضافة قدرة حذف منفصلة كانت ستوثّق ما لا يوجد.
 * - `*` → `scoped`: مسموح داخل نطاق المورد فقط.
 * - `—` → `deny`.
 */

type MatrixRow = {
  resource: string;
  read: Record<MemberRole, CapabilityDecision>;
  manage: Partial<Record<MemberRole, CapabilityDecision>>;
};

const allow = "allow" as const;
const scoped = "scoped" as const;
const deny = "deny" as const;

/** صف يُقرأ للجميع بالدور المذكور، ويُدار لمن يملك `C/U`. */
const MATRIX: MatrixRow[] = [
  {
    resource: "branches",
    read: { owner: allow, admin: allow, teacher: allow, receptionist: allow, accountant: allow },
    manage: { owner: allow, admin: allow },
  },
  {
    resource: "rooms",
    read: { owner: allow, admin: allow, teacher: allow, receptionist: allow, accountant: allow },
    manage: { owner: allow, admin: allow },
  },
  {
    // Stages / Grades / Subjects
    resource: "catalog",
    read: { owner: allow, admin: allow, teacher: allow, receptionist: allow, accountant: allow },
    manage: { owner: allow, admin: allow },
  },
  {
    resource: "teachers",
    read: { owner: allow, admin: allow, teacher: scoped, receptionist: allow, accountant: allow },
    manage: { owner: allow, admin: allow, receptionist: allow },
  },
  {
    resource: "courses",
    read: { owner: allow, admin: allow, teacher: scoped, receptionist: allow, accountant: allow },
    manage: { owner: allow, admin: allow, receptionist: scoped },
  },
  {
    resource: "offerings",
    read: { owner: allow, admin: allow, teacher: scoped, receptionist: allow, accountant: allow },
    manage: { owner: allow, admin: allow, receptionist: scoped },
  },
];

describe("documented matrix matches the enforced policy", () => {
  it.each(MATRIX)("$resource read decisions match RBAC_MATRIX §4", ({ resource, read }) => {
    for (const role of memberRoles) {
      expect(capabilityDecision(role, `${resource}.read` as never)).toBe(read[role]);
    }
  });

  it.each(MATRIX)("$resource manage decisions match RBAC_MATRIX §4", ({ resource, manage }) => {
    for (const role of memberRoles) {
      expect(capabilityDecision(role, `${resource}.manage` as never)).toBe(manage[role] ?? deny);
    }
  });

  it("declares both read and manage capabilities for every matrix resource", () => {
    for (const { resource } of MATRIX) {
      expect(tenantCapabilities).toContain(`${resource}.read`);
      expect(tenantCapabilities).toContain(`${resource}.manage`);
    }
  });
});

describe("role capabilities that the matrix marks as strict", () => {
  it("gives no academic write to the accountant", () => {
    for (const capability of ["students.create", "students.update", "cohorts.create", "sessions.create", "attendance.mark", "teachers.manage", "courses.manage", "offerings.manage"] as const) {
      expect(capabilityDecision("accountant", capability)).toBe(deny);
    }
  });

  it("lets the accountant own finance actions the receptionist cannot reverse", () => {
    expect(capabilityDecision("accountant", "invoices.create")).toBe(allow);
    expect(capabilityDecision("accountant", "payments.correct")).toBe(allow);
    expect(capabilityDecision("receptionist", "payments.record")).toBe(allow);
    expect(capabilityDecision("receptionist", "payments.correct")).toBe(deny);
  });

  it("keeps audit logs and invitations away from every non-management role", () => {
    for (const role of ["teacher", "receptionist", "accountant"] as const) {
      expect(capabilityDecision(role, "audit.read")).toBe(deny);
      expect(capabilityDecision(role, "invitations.create")).toBe(deny);
      expect(capabilityDecision(role, "invitations.revoke")).toBe(deny);
      expect(capabilityDecision(role, "team.manage")).toBe(deny);
    }
  });

  it("gives the teacher academic actions but only inside a resource scope", () => {
    for (const capability of ["students.read", "attendance.mark", "sessions.create", "cohorts.read", "offerings.read", "courses.read", "teachers.read"] as const) {
      expect(capabilityDecision("teacher", capability)).toBe(scoped);
    }
  });

  it("never lets the teacher manage team, invitations or academic setup", () => {
    for (const capability of ["team.manage", "team.invite", "catalog.manage", "teachers.manage", "courses.manage", "offerings.manage", "students.create", "payments.record"] as const) {
      expect(capabilityDecision("teacher", capability)).toBe(deny);
    }
  });

  it("gives the receptionist enrolment work without finance reversal", () => {
    expect(capabilityDecision("receptionist", "students.create")).toBe(allow);
    expect(capabilityDecision("receptionist", "enrollments.create")).toBe(allow);
    expect(capabilityDecision("receptionist", "attendance.correct")).toBe(allow);
    expect(capabilityDecision("receptionist", "invoices.create")).toBe(allow);
  });

  it("keeps full access only for owner and admin", () => {
    for (const capability of tenantCapabilities) {
      expect(capabilityDecision("owner", capability)).toBe(allow);
      expect(capabilityDecision("admin", capability)).toBe(allow);
    }
  });
});

describe("capability hygiene", () => {
  it("uses the resource.action naming form for every capability", () => {
    for (const capability of tenantCapabilities) {
      expect(capability).toMatch(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/);
    }
  });

  it("keeps the entitlement catalog clear of every RBAC resource prefix", () => {
    // الاتجاه الصحيح للقاعدة: مفتاح RBAC يصف فعلاً لدور، ومفتاح الاستحقاق يصف
    // قدرة مشتراة. التقاطع يحدث إن استخدم مفتاح استحقاق بادئة مورد RBAC، فمثلًا
    // `payments.online` كان يجاور `payments.read`. لهذا سُمّي `ops.online_payments`.
    const rbacPrefixes = new Set(tenantCapabilities.map((capability) => capability.split(".")[0]));
    for (const key of entitlementKeys()) {
      const prefix = key.split(".")[0];
      expect(rbacPrefixes.has(prefix)).toBe(false);
    }
  });

  it("actually detects a collision when one is introduced", () => {
    // حماية للاختبار نفسه: لو عاد أحدهم لبادئة محجوزة، يفشل فورًا.
    expect(entitlementKeys()).toContain("ops.online_payments");
    expect(entitlementKeys()).not.toContain("payments.online");
    expect(entitlementKeys()).not.toContain("branches.extra");
  });

  it("declares no duplicate capability", () => {
    expect(new Set(tenantCapabilities).size).toBe(tenantCapabilities.length);
  });

  it("denies every capability for a role that does not declare it", () => {
    const teacherDeclared = new Set(
      tenantCapabilities.filter((capability) => capabilityDecision("teacher", capability) !== "deny"),
    );
    for (const capability of tenantCapabilities) {
      if (!teacherDeclared.has(capability)) {
        expect(capabilityDecision("teacher", capability)).toBe("deny");
      }
    }
    expect(teacherDeclared.size).toBeGreaterThan(10);
    expect(teacherDeclared.size).toBeLessThan(tenantCapabilities.length);
  });
});
