import { describe, expect, it } from "vitest";

import {
  buildRateLimitRules,
  bucketKey,
  clientAddress,
  describeRetryAfter,
  rateLimitPolicies,
  rateLimitScopes,
} from "./rate-limit";

describe("rate limit policies", () => {
  it("defines a policy for every scope", () => {
    for (const scope of rateLimitScopes) {
      const policy = rateLimitPolicies[scope];
      expect(policy).toBeDefined();
      expect(policy.limit).toBeGreaterThan(0);
      expect(policy.windowSeconds).toBeGreaterThan(0);
      expect(policy.message.length).toBeGreaterThan(10);
    }
  });

  it("sets the address limit above the account limit so a shared network is not locked out", () => {
    for (const scope of rateLimitScopes) {
      const policy = rateLimitPolicies[scope];
      expect(policy.addressLimit).toBeGreaterThanOrEqual(policy.limit);
      expect(policy.addressMessage.length).toBeGreaterThan(10);
      expect(policy.addressMessage).toMatch(/[\u0600-\u06FF]/);
    }
  });

  it("keeps secret-guessing paths stricter than delivery paths", () => {
    expect(rateLimitPolicies.platform_login.limit).toBeLessThan(rateLimitPolicies.login.limit);
    expect(rateLimitPolicies.password_reset_redeem.limit).toBeLessThanOrEqual(rateLimitPolicies.login.limit);
    expect(rateLimitPolicies.signup.windowSeconds).toBeGreaterThanOrEqual(60 * 60);
  });

  it("never warns about rate limits in English-only copy", () => {
    for (const scope of rateLimitScopes) {
      expect(rateLimitPolicies[scope].message).toMatch(/[\u0600-\u06FF]/);
    }
  });
});

describe("bucket keys", () => {
  it("is a sha256 digest and never contains the raw identifier", () => {
    const key = bucketKey("login", "owner@example.test");
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain("owner");
    expect(key).not.toContain("@");
  });

  it("separates scopes so one scope cannot exhaust another", () => {
    expect(bucketKey("login", "a@b.test")).not.toBe(bucketKey("platform_login", "a@b.test"));
  });

  it("is stable for the same input and different across identifiers", () => {
    expect(bucketKey("login", "a@b.test")).toBe(bucketKey("login", "a@b.test"));
    expect(bucketKey("login", "a@b.test")).not.toBe(bucketKey("login", "c@d.test"));
  });

  it("cannot be confused by a delimiter appearing inside the identifier", () => {
    expect(bucketKey("login", "a\u0000b")).not.toBe(bucketKey("login", "a"));
  });
});

describe("buildRateLimitRules", () => {
  it("builds an account rule and an address rule with different limits", () => {
    const rules = buildRateLimitRules({ scope: "login", account: "Owner@Example.test", address: "203.0.113.5" });
    expect(rules).toHaveLength(2);
    const account = rules.find((rule) => rule.identifier.startsWith("account:"));
    const address = rules.find((rule) => rule.identifier.startsWith("address:"));
    expect(account?.identifier).toBe("account:owner@example.test");
    expect(account?.limit).toBe(rateLimitPolicies.login.limit);
    expect(address?.limit).toBe(rateLimitPolicies.login.addressLimit);
    expect(address?.message).not.toBe(account?.message);
  });

  it("omits the address rule when the address is unknown", () => {
    expect(buildRateLimitRules({ scope: "login", account: "a@b.test", address: "unknown" })).toHaveLength(1);
  });

  it("can build an address-only policy such as bootstrap", () => {
    const rules = buildRateLimitRules({ scope: "bootstrap", address: "198.51.100.9" });
    expect(rules).toHaveLength(1);
    expect(rules[0]?.identifier).toBe("address:198.51.100.9");
  });

  it("returns no rules when nothing is known", () => {
    expect(buildRateLimitRules({ scope: "login" })).toEqual([]);
  });
});

describe("clientAddress", () => {
  it("takes the first entry of x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(clientAddress(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip then cf-connecting-ip", () => {
    expect(clientAddress(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientAddress(new Headers({ "cf-connecting-ip": "198.51.100.9" }))).toBe("198.51.100.9");
  });

  it("returns a stable marker when no address header is present", () => {
    expect(clientAddress(new Headers())).toBe("unknown");
  });

  it("ignores an empty forwarded entry rather than producing an empty bucket", () => {
    expect(clientAddress(new Headers({ "x-forwarded-for": "   " }))).toBe("unknown");
  });
});

describe("describeRetryAfter", () => {
  it("describes seconds, minutes and hours in Arabic with correct plurality", () => {
    expect(describeRetryAfter(20)).toBe("20 ثانية");
    expect(describeRetryAfter(60)).toBe("دقيقة تقريبًا");
    expect(describeRetryAfter(120)).toBe("2 دقائق تقريبًا");
    expect(describeRetryAfter(3600)).toBe("ساعة تقريبًا");
    expect(describeRetryAfter(7200)).toBe("2 ساعات تقريبًا");
  });

  it("never returns a zero or negative wait", () => {
    expect(describeRetryAfter(0)).toContain("1 ثانية");
    expect(describeRetryAfter(-5)).toContain("1 ثانية");
  });
});
