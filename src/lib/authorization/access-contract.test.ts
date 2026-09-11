import { describe, expect, it } from "vitest";

import { tenantCapabilities } from "./policy";
import {
  accessDenialMessage,
  entitlementForTenantCapability,
  entitlementRequiredFor,
  evaluateAccess,
  isAllowed,
  type AccessSubject,
} from "./access-contract";

const entitled: AccessSubject = {
  tenantStatus: "active",
  membership: { role: "owner", active: true },
  entitlements: ["ops.core"],
};

describe("entitlement requirement mapping", () => {
  it("declares a commercial requirement for every role capability", () => {
    for (const capability of tenantCapabilities) {
      expect(typeof entitlementForTenantCapability[capability]).toBe("string");
      expect(entitlementForTenantCapability[capability].length).toBeGreaterThan(0);
    }
  });

  it("maps current operations capabilities to the operations entitlement", () => {
    expect(entitlementRequiredFor("students.read")).toBe("ops.core");
    expect(entitlementRequiredFor("attendance.mark")).toBe("ops.core");
    expect(entitlementRequiredFor("payments.correct")).toBe("ops.core");
  });
});

describe("evaluateAccess: layer order", () => {
  it("allows an entitled owner for an unscoped capability", () => {
    expect(evaluateAccess({ subject: entitled, capability: "students.read" })).toEqual({
      decision: "allow",
      reason: "granted",
    });
  });

  it("reports no_entitlement before role_denied, because the feature is not purchased", () => {
    const verdict = evaluateAccess({
      subject: { ...entitled, membership: { role: "teacher", active: true }, entitlements: [] },
      capability: "payments.correct",
    });
    expect(verdict.decision).toBe("deny");
    expect(verdict.reason).toBe("no_entitlement");
    expect(verdict.missingEntitlement).toBe("ops.core");
  });

  it("reports role_denied when the workspace is entitled but the role is not allowed", () => {
    const verdict = evaluateAccess({
      subject: { ...entitled, membership: { role: "accountant", active: true } },
      capability: "attendance.mark",
    });
    expect(verdict.reason).toBe("role_denied");
  });

  it("reports scope_required for a scoped role decision", () => {
    const verdict = evaluateAccess({
      subject: { ...entitled, membership: { role: "teacher", active: true } },
      capability: "students.read",
    });
    expect(verdict.decision).toBe("scoped");
    expect(verdict.reason).toBe("scope_required");
  });

  it("reports scope_required when the action demands a resource scope even for an allowed role", () => {
    const verdict = evaluateAccess({ subject: entitled, capability: "students.read", requireScope: true });
    expect(verdict.decision).toBe("scoped");
    expect(verdict.reason).toBe("scope_required");
  });
});

describe("evaluateAccess: tenant and membership", () => {
  it("denies when the tenant does not exist", () => {
    expect(evaluateAccess({ subject: { ...entitled, tenantStatus: "missing" }, capability: "students.read" })).toEqual({
      decision: "deny",
      reason: "tenant_missing",
    });
  });

  it("denies a suspended tenant even for its own owner", () => {
    expect(evaluateAccess({ subject: { ...entitled, tenantStatus: "suspended" }, capability: "students.read" })).toEqual({
      decision: "deny",
      reason: "tenant_inactive",
    });
  });

  it("denies a user with no membership in the tenant", () => {
    expect(evaluateAccess({ subject: { ...entitled, membership: null }, capability: "students.read" }).reason).toBe(
      "membership_missing",
    );
  });

  it("denies an inactive membership", () => {
    const verdict = evaluateAccess({
      subject: { ...entitled, membership: { role: "owner", active: false } },
      capability: "students.read",
    });
    expect(verdict.reason).toBe("membership_inactive");
  });

  it("treats tenant and membership failures as more fundamental than entitlement", () => {
    const verdict = evaluateAccess({
      subject: { tenantStatus: "suspended", membership: null, entitlements: [] },
      capability: "students.read",
    });
    expect(verdict.reason).toBe("tenant_inactive");
  });
});

describe("evaluateAccess: entitlement shapes", () => {
  it("accepts any iterable so the caller can pass the database result directly", () => {
    expect(
      evaluateAccess({
        subject: { ...entitled, entitlements: new Set(["ops.core"]) },
        capability: "students.read",
      }).decision,
    ).toBe("allow");
  });

  it("does not treat an unrelated entitlement as sufficient", () => {
    expect(
      evaluateAccess({
        subject: { ...entitled, entitlements: ["learning.courses", "platform.exams"] },
        capability: "students.read",
      }).reason,
    ).toBe("no_entitlement");
  });
});

describe("access verdict helpers", () => {
  it("treats scoped as permitted and deny as blocked", () => {
    expect(isAllowed({ decision: "allow", reason: "granted" })).toBe(true);
    expect(isAllowed({ decision: "scoped", reason: "scope_required" })).toBe(true);
    expect(isAllowed({ decision: "deny", reason: "role_denied" })).toBe(false);
  });

  it("gives a distinct Arabic message for every denial reason", () => {
    const messages = [
      accessDenialMessage({ decision: "deny", reason: "no_entitlement" }),
      accessDenialMessage({ decision: "deny", reason: "role_denied" }),
      accessDenialMessage({ decision: "deny", reason: "scope_required" }),
      accessDenialMessage({ decision: "deny", reason: "membership_inactive" }),
      accessDenialMessage({ decision: "deny", reason: "tenant_inactive" }),
    ];
    expect(new Set(messages).size).toBe(messages.length);
    for (const message of messages) expect(message.length).toBeGreaterThan(5);
  });
});
