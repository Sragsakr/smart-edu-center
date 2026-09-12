import { describe, expect, it } from "vitest";

import { memberRoles, type MemberRole } from "@/lib/authorization/policy";
import { assignableRolesFor, canAssignRole } from "./role-authority";

/**
 * سقف سلطة الدور.
 *
 * القاعدة مشتقة من المصفوفة، وكل صف يُختبر صراحةً لأن انحرافه ليس خطأ عرض بل
 * تصعيد صلاحيات: مشرف يستطيع إنشاء مشرف آخر لا يملك أحد إيقافه إلا المالك.
 */

const expected: Record<MemberRole, readonly MemberRole[]> = {
  owner: ["admin", "teacher", "receptionist", "accountant"],
  admin: ["teacher", "receptionist", "accountant"],
  teacher: [],
  receptionist: [],
  accountant: [],
};

describe("assignableRolesFor", () => {
  for (const role of memberRoles) {
    it(`lets ${role} assign exactly the roles the matrix allows`, () => {
      expect([...assignableRolesFor(role)]).toEqual(expected[role]);
    });
  }

  it("gives no role the power to hand out ownership by invitation", () => {
    // الملكية لا تُمنح بدعوة؛ لها مسار مستقل لأنه يغيّر من يملك المساحة.
    for (const role of memberRoles) {
      expect(assignableRolesFor(role)).not.toContain("owner");
    }
  });
});

describe("canAssignRole", () => {
  it("lets an owner create another admin", () => {
    expect(canAssignRole("owner", "admin")).toBe(true);
  });

  it("refuses an admin creating another admin", () => {
    // الأثر: مشرف مخترَق ينشئ مشرفين بلا حد، ولا يوقفهم إلا المالك.
    expect(canAssignRole("admin", "admin")).toBe(false);
  });

  it("lets an admin manage the operational roles", () => {
    expect(canAssignRole("admin", "teacher")).toBe(true);
    expect(canAssignRole("admin", "receptionist")).toBe(true);
    expect(canAssignRole("admin", "accountant")).toBe(true);
  });

  it("refuses every role below admin from assigning anything at all", () => {
    for (const role of ["teacher", "receptionist", "accountant"] as const) {
      for (const target of memberRoles) {
        expect(canAssignRole(role, target)).toBe(false);
      }
    }
  });

  it("refuses every role from granting ownership", () => {
    for (const role of memberRoles) {
      expect(canAssignRole(role, "owner")).toBe(false);
    }
  });
});
