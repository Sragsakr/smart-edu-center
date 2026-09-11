import { describe, expect, it } from "vitest";

import { testSqlExecutor } from "@/test/postgres/test-database";
import {
  buildRateLimitRules,
  bucketKey,
  clearRateLimit,
  consumeRateLimit,
  rateLimitPolicies,
  type RateLimitScope,
} from "@/lib/security/rate-limit";

/**
 * اختبارات تحديد المعدّل على قاعدة حقيقية، بدور التطبيق نفسه:
 * تثبت أن الدور يملك تنفيذ الدالة المحدودة ولا يملك أي وصول مباشر للجدول.
 */

const sql = testSqlExecutor();

let counter = 0;
function uniqueIdentifier(): string {
  counter += 1;
  return `probe-${Date.now()}-${counter}@example.test`;
}

/** قواعد حساب فقط بلا مصدر، لعزل أثر حدّ المصدر عن الاختبار. */
function accountOnly(scope: RateLimitScope, account: string) {
  return buildRateLimitRules({ scope, account });
}

async function exhaust(scope: RateLimitScope, account: string, times: number) {
  for (let attempt = 0; attempt < times; attempt += 1) {
    await consumeRateLimit(sql, { scope, rules: accountOnly(scope, account) });
  }
}

describe("rate limit enforcement", () => {
  it("allows attempts up to the policy limit and refuses the next one", async () => {
    const account = uniqueIdentifier();
    const policy = rateLimitPolicies.login;

    for (let attempt = 1; attempt <= policy.limit; attempt += 1) {
      const decision = await consumeRateLimit(sql, { scope: "login", rules: accountOnly("login", account) });
      expect(decision.allowed).toBe(true);
      expect(decision.attempts).toBe(attempt);
    }

    const blocked = await consumeRateLimit(sql, { scope: "login", rules: accountOnly("login", account) });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.message).toContain("هذا الحساب");

    await clearRateLimit(sql, { scope: "login", rules: accountOnly("login", account) });
  });

  it("keeps counters separate per scope so one path cannot exhaust another", async () => {
    const account = uniqueIdentifier();
    await exhaust("platform_login", account, rateLimitPolicies.platform_login.limit + 1);
    expect((await consumeRateLimit(sql, { scope: "platform_login", rules: accountOnly("platform_login", account) })).allowed).toBe(false);
    expect((await consumeRateLimit(sql, { scope: "login", rules: accountOnly("login", account) })).allowed).toBe(true);

    await clearRateLimit(sql, { scope: "platform_login", rules: accountOnly("platform_login", account) });
    await clearRateLimit(sql, { scope: "login", rules: accountOnly("login", account) });
  });

  it("keeps counters separate per account", async () => {
    const first = uniqueIdentifier();
    const second = uniqueIdentifier();
    await exhaust("login", first, rateLimitPolicies.login.limit + 2);
    expect((await consumeRateLimit(sql, { scope: "login", rules: accountOnly("login", first) })).allowed).toBe(false);
    expect((await consumeRateLimit(sql, { scope: "login", rules: accountOnly("login", second) })).allowed).toBe(true);

    await clearRateLimit(sql, { scope: "login", rules: accountOnly("login", first) });
    await clearRateLimit(sql, { scope: "login", rules: accountOnly("login", second) });
  });

  it("does not lock other accounts when one account is blocked from a shared address", async () => {
    // هذه الحالة هي سبب فصل حدّ المصدر: سنتر كامل خلف عنوان واحد.
    const victim = uniqueIdentifier();
    const colleague = uniqueIdentifier();
    const sharedAddress = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;

    for (let attempt = 0; attempt < rateLimitPolicies.login.limit + 1; attempt += 1) {
      await consumeRateLimit(sql, {
        scope: "login",
        rules: buildRateLimitRules({ scope: "login", account: victim, address: sharedAddress }),
      });
    }

    // الحساب المستهدف محجوب
    const victimDecision = await consumeRateLimit(sql, {
      scope: "login",
      rules: buildRateLimitRules({ scope: "login", account: victim, address: sharedAddress }),
    });
    expect(victimDecision.allowed).toBe(false);

    // والزميل من نفس المصدر ما زال يستطيع الدخول
    const colleagueDecision = await consumeRateLimit(sql, {
      scope: "login",
      rules: buildRateLimitRules({ scope: "login", account: colleague, address: sharedAddress }),
    });
    expect(colleagueDecision.allowed).toBe(true);

    await clearRateLimit(sql, {
      scope: "login",
      rules: buildRateLimitRules({ scope: "login", account: victim, address: sharedAddress }),
    });
    await clearRateLimit(sql, {
      scope: "login",
      rules: buildRateLimitRules({ scope: "login", account: colleague, address: sharedAddress }),
    });
  });

  it("still blocks an address that floods many different accounts", async () => {
    const address = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    const policy = rateLimitPolicies.platform_login;

    // محاولات موزّعة على حسابات مختلفة: حدّ الحساب لا يمسكها، وحدّ المصدر يمسكها.
    for (let attempt = 0; attempt < policy.addressLimit + 1; attempt += 1) {
      await consumeRateLimit(sql, {
        scope: "platform_login",
        rules: buildRateLimitRules({
          scope: "platform_login",
          account: uniqueIdentifier(),
          address,
        }),
      });
    }

    const decision = await consumeRateLimit(sql, {
      scope: "platform_login",
      rules: buildRateLimitRules({ scope: "platform_login", account: uniqueIdentifier(), address }),
    });
    expect(decision.allowed).toBe(false);
    expect(decision.message).toContain("الشبكة");

    await clearRateLimit(sql, { scope: "platform_login", rules: buildRateLimitRules({ scope: "platform_login", address }) });
  });

  it("clears the counter after a successful attempt", async () => {
    const account = uniqueIdentifier();
    await exhaust("login", account, rateLimitPolicies.login.limit + 1);
    expect((await consumeRateLimit(sql, { scope: "login", rules: accountOnly("login", account) })).allowed).toBe(false);

    await clearRateLimit(sql, { scope: "login", rules: accountOnly("login", account) });
    expect((await consumeRateLimit(sql, { scope: "login", rules: accountOnly("login", account) })).allowed).toBe(true);

    await clearRateLimit(sql, { scope: "login", rules: accountOnly("login", account) });
  });

  it("never stores a raw identifier in the attempts table", async () => {
    const account = uniqueIdentifier();
    await consumeRateLimit(sql, { scope: "login", rules: accountOnly("login", account) });

    const ownerSql = testSqlExecutor();
    const stored = await ownerSql.query<{ bucket_key: string; scope: string }>(
      `select bucket_key, scope from private.auth_attempts where bucket_key = $1`,
      [bucketKey("login", `account:${account.trim().toLowerCase()}`)],
    );
    expect(stored.rowCount).toBe(1);
    expect(stored.rows[0]?.bucket_key).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.rows[0]?.scope).toBe("login");

    await clearRateLimit(sql, { scope: "login", rules: accountOnly("login", account) });
  });

  it("refuses a non-positive window or limit instead of enforcing nothing", async () => {
    await expect(
      sql.query("select * from private.record_auth_attempt($1, 'login', 0, 5)", [bucketKey("login", "x")]),
    ).rejects.toThrow();
    await expect(
      sql.query("select * from private.record_auth_attempt($1, 'login', 60, 0)", [bucketKey("login", "x")]),
    ).rejects.toThrow();
  });

  it("rejects a bucket key that is not a digest", async () => {
    await expect(
      sql.query("select * from private.record_auth_attempt('not-a-digest', 'login', 60, 5)"),
    ).rejects.toThrow();
  });

  it("returns retry information bounded by the policy window", async () => {
    const account = uniqueIdentifier();
    await exhaust("password_reset_redeem", account, rateLimitPolicies.password_reset_redeem.limit + 1);
    const blocked = await consumeRateLimit(sql, {
      scope: "password_reset_redeem",
      rules: accountOnly("password_reset_redeem", account),
    });
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(rateLimitPolicies.password_reset_redeem.windowSeconds);

    await clearRateLimit(sql, {
      scope: "password_reset_redeem",
      rules: accountOnly("password_reset_redeem", account),
    });
  });

  it("does nothing when there is no rule to count", async () => {
    const decision = await consumeRateLimit(sql, { scope: "login", rules: [] });
    expect(decision).toEqual({ allowed: true, attempts: 0, retryAfterSeconds: 0 });
  });

  it("ignores an unknown address instead of bucketing everyone together", async () => {
    const rules = buildRateLimitRules({ scope: "login", account: "a@b.test", address: "unknown" });
    expect(rules).toHaveLength(1);
    expect(rules[0]?.identifier).toBe("account:a@b.test");
  });
});
