import { describe, expect, it } from "vitest";
import { can, canWithoutResourceScope, capabilitiesForRole, capabilityDecision, tenantCapabilities, type MemberRole } from "./policy";

describe("authorization policy", () => {
  it("allows owner and admin to manage the team", () => { expect(can("owner", "team.manage")).toBe(true); expect(can("admin", "team.manage")).toBe(true); });
  it("denies operational roles from team management", () => { const roles: MemberRole[] = ["teacher", "receptionist", "accountant"]; for (const role of roles) expect(can(role, "team.manage")).toBe(false); });
  it("requires teacher resource scope for academic reads and attendance", () => { expect(capabilityDecision("teacher", "students.read")).toBe("scoped"); expect(capabilityDecision("teacher", "sessions.read")).toBe("scoped"); expect(capabilityDecision("teacher", "attendance.mark")).toBe("scoped"); expect(canWithoutResourceScope("teacher", "attendance.mark")).toBe(false); });
  it("allows receptionist operational actions but not payment correction", () => { expect(capabilityDecision("receptionist", "students.create")).toBe("allow"); expect(capabilityDecision("receptionist", "payments.record")).toBe("allow"); expect(capabilityDecision("receptionist", "payments.correct")).toBe("deny"); });
  it("allows accountant financial actions but denies academic writes", () => { expect(capabilityDecision("accountant", "invoices.create")).toBe("allow"); expect(capabilityDecision("accountant", "payments.correct")).toBe("allow"); expect(capabilityDecision("accountant", "students.update")).toBe("deny"); expect(capabilityDecision("accountant", "attendance.mark")).toBe("deny"); });
  it("limits audit access to owner and admin", () => { expect(can("owner", "audit.read")).toBe(true); expect(can("admin", "audit.read")).toBe(true); expect(can("teacher", "audit.read")).toBe(false); expect(can("receptionist", "audit.read")).toBe(false); expect(can("accountant", "audit.read")).toBe(false); });
  it("returns a complete serializable capability map for the UI", () => { const capabilities = capabilitiesForRole("teacher"); expect(Object.keys(capabilities)).toHaveLength(tenantCapabilities.length); expect(capabilities["attendance.mark"]).toBe("scoped"); expect(capabilities["payments.correct"]).toBe("deny"); expect(capabilities["tenant.read"]).toBe("allow"); });
});
