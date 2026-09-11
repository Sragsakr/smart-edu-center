import { describe, expect, it } from "vitest";

import { capabilitiesForLevel, capabilityCatalog, findCapability, isKnownCapability } from "./capability-catalog";

describe("capability catalog", () => {
  it("keeps every key in namespace.name form and unique", () => {
    const keys = capabilityCatalog.map((capability) => capability.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/);
  });

  it("gives every feature a level and no level to add-ons", () => {
    for (const capability of capabilityCatalog) {
      if (capability.kind === "feature") {
        expect(capability.includedFromLevel).not.toBeNull();
      } else {
        expect(capability.includedFromLevel).toBeNull();
      }
    }
  });

  it("defines the shared operations capability at the entry level", () => {
    const operations = capabilitiesForLevel("operations").map((capability) => capability.key);
    expect(operations).toEqual(["ops.core"]);
  });

  it("keeps portal and platform capabilities in the management level", () => {
    const management = capabilitiesForLevel("management_platform").map((capability) => capability.key);
    expect(management).toContain("platform.portal.student");
    expect(management).toContain("platform.portal.guardian");
    expect(management).toContain("platform.exams");
    expect(management).not.toContain("ops.core");
  });

  it("keeps digital learning capabilities in the learning level", () => {
    const learning = capabilitiesForLevel("learning_platform").map((capability) => capability.key);
    expect(learning).toContain("learning.courses");
    expect(learning).toContain("learning.video");
    expect(learning).not.toContain("platform.portal.student");
  });

  it("exposes lookup helpers used by the entitlement layer", () => {
    expect(isKnownCapability("ops.core")).toBe(true);
    expect(isKnownCapability("ops.unknown")).toBe(false);
    expect(findCapability("branding.white_label")?.kind).toBe("addon");
    expect(findCapability("branding.white_label")?.includedFromLevel).toBeNull();
  });
});
