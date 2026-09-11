import { describe, expect, it } from "vitest";

import { isPortalEntitled, portalEntitlementKey, portalKinds, portalUpgradeCopy } from "./portal-access";

describe("portal entitlement mapping", () => {
  it("maps each portal to exactly one commercial capability", () => {
    expect(portalEntitlementKey("student")).toBe("platform.portal.student");
    expect(portalEntitlementKey("guardian")).toBe("platform.portal.guardian");
    expect(portalKinds).toHaveLength(2);
  });
});

describe("isPortalEntitled", () => {
  it("opens the portal only when its own capability is active", () => {
    expect(isPortalEntitled("student", ["ops.core", "platform.portal.student"])).toBe(true);
    expect(isPortalEntitled("guardian", ["ops.core", "platform.portal.guardian"])).toBe(true);
  });

  it("keeps the guardian portal closed for a student-only capability set", () => {
    expect(isPortalEntitled("guardian", ["ops.core", "platform.portal.student"])).toBe(false);
  });

  it("keeps portals closed for an operations-only workspace", () => {
    const operationsOnly = ["ops.core"];
    expect(isPortalEntitled("student", operationsOnly)).toBe(false);
    expect(isPortalEntitled("guardian", operationsOnly)).toBe(false);
  });

  it("does not treat unrelated higher capabilities as a portal entitlement", () => {
    expect(isPortalEntitled("student", ["ops.core", "learning.courses", "learning.video"])).toBe(false);
  });

  it("stays closed for an empty capability set", () => {
    expect(isPortalEntitled("student", [])).toBe(false);
  });

  it("accepts any iterable, so the caller can pass a Set from the database", () => {
    expect(isPortalEntitled("guardian", new Set(["platform.portal.guardian"]))).toBe(true);
  });
});

describe("upgrade copy", () => {
  it("explains the gap for every portal instead of showing a bare error", () => {
    for (const kind of portalKinds) {
      const copy = portalUpgradeCopy[kind];
      expect(copy.title.length).toBeGreaterThan(10);
      expect(copy.explanation).toContain("مستوى العمليات");
      expect(copy.requirement).toContain("منصة الإدارة");
    }
  });
});
