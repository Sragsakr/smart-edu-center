import { describe, expect, it } from "vitest";

import { defaultEntitlementsForLevel, planCapabilityKeys } from "./default-entitlements";
import { addOnCapabilities, capabilityCatalog } from "./capability-catalog";

describe("defaultEntitlementsForLevel", () => {
  it("grants only the operations capability at the entry level", () => {
    expect(defaultEntitlementsForLevel("operations")).toEqual(["ops.core"]);
  });

  it("is cumulative: every higher level includes everything below it", () => {
    const operations = defaultEntitlementsForLevel("operations");
    const management = defaultEntitlementsForLevel("management_platform");
    const learning = defaultEntitlementsForLevel("learning_platform");

    for (const key of operations) expect(management).toContain(key);
    for (const key of management) expect(learning).toContain(key);
    expect(management.length).toBeGreaterThan(operations.length);
    expect(learning.length).toBeGreaterThan(management.length);
  });

  it("never grants an add-on as part of a plan level", () => {
    const addOnKeys = addOnCapabilities().map((capability) => capability.key);
    for (const level of ["operations", "management_platform", "learning_platform"] as const) {
      const granted = defaultEntitlementsForLevel(level);
      for (const addOnKey of addOnKeys) expect(granted).not.toContain(addOnKey);
    }
  });

  it("covers every plan capability across the levels", () => {
    const planKeys = planCapabilityKeys();
    const featureKeys = capabilityCatalog
      .filter((capability) => capability.kind === "feature")
      .map((capability) => capability.key);
    expect(planKeys.slice().sort()).toEqual(featureKeys.slice().sort());
  });

  it("returns a stable sorted list so upgrades are diffable", () => {
    const granted = defaultEntitlementsForLevel("learning_platform");
    expect(granted).toEqual(granted.slice().sort());
  });
});
