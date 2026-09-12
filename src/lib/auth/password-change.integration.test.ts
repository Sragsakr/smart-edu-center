import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetCookieState } from "@/test/postgres/test-cookies";
import { testSqlExecutor, truncateAllTenantData } from "@/test/postgres/test-database";
import { createTenantWithOwner, createUser, TEST_PASSWORD } from "@/test/postgres/fixtures";
import { authenticatePostgresUser, createPostgresSession } from "@/lib/auth/postgres-auth";
import { changePostgresPassword, PasswordChangeError } from "@/lib/auth/password-change";
import { listAccountSessions } from "@/lib/auth/account-sessions";
import { withSessionUser } from "@/lib/auth/session-context";

/**
 * تغيير كلمة المرور وهو مسجّل الدخول.
 *
 * الفراغ الذي يسدّه هذا المسار: لا كان في التطبيق سبيل لمن أُنشئ حسابه من إدارة
 * المنصة لتعيين كلمة مروره، ولا لمن شكّ أن كلمته انكشفت لتغييرها بلا انتظار مراجعة
 * يدوية. والاختبار يثبت كذلك أن التغيير **يُبطل ما يجب إبطاله** وأنه لا يقع على
 * حساب آخر.
 */

const sql = testSqlExecutor();

beforeEach(() => {
  resetCookieState();
});

afterEach(async () => {
  await truncateAllTenantData();
});

async function signInAs(userId: string): Promise<void> {
  resetCookieState();
  await createPostgresSession(sql, userId);
}

/** يغيّر كلمة المرور كما يفعل الإجراء: داخل سياق الجلسة الحالية. */
async function changePassword(currentPassword: string, newPassword: string) {
  return withSessionUser(async ({ sql: scoped, user, digest }) =>
    changePostgresPassword(scoped, {
      userId: user.id,
      currentDigest: digest,
      currentPassword,
      newPassword,
    }),
  );
}

/** هل كلمة المرور هذه صالحة لهذا الحساب الآن؟ */
async function canSignIn(email: string, password: string): Promise<boolean> {
  const user = await authenticatePostgresUser(sql, email, password);
  return user !== null;
}

describe("changing a password while signed in", () => {
  it("accepts the new password and rejects the old one afterwards", async () => {
    const user = await createUser(sql);
    await signInAs(user.id);

    const result = await changePassword(TEST_PASSWORD, "Brand.New.Password.2026");
    expect(result).not.toBeNull();

    expect(await canSignIn(user.email, "Brand.New.Password.2026")).toBe(true);
    expect(await canSignIn(user.email, TEST_PASSWORD)).toBe(false);
  });

  it("records when the password changed", async () => {
    const user = await createUser(sql);
    const before = await sql.query<{ password_changed_at: string }>(
      "select password_changed_at::text as password_changed_at from public.auth_password_credentials where user_id = $1",
      [user.id],
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    await signInAs(user.id);
    await changePassword(TEST_PASSWORD, "Another.Password.2026");

    const after = await sql.query<{ password_changed_at: string; password_digest: string }>(
      "select password_changed_at::text as password_changed_at, password_digest from public.auth_password_credentials where user_id = $1",
      [user.id],
    );
    expect(after.rows[0]?.password_changed_at).not.toBe(before.rows[0]?.password_changed_at);
    // والبصمة المخزّنة ليست الكلمة نفسها بحال.
    expect(after.rows[0]?.password_digest).not.toContain("Another.Password.2026");
  });

  it("refuses a wrong current password and leaves the stored one untouched", async () => {
    const user = await createUser(sql);
    await signInAs(user.id);

    const error = await changePassword("not-the-current-one", "Brand.New.Password.2026").catch(
      (thrown) => thrown,
    );
    expect(error).toBeInstanceOf(PasswordChangeError);
    expect((error as PasswordChangeError).reason).toBe("wrong_current_password");

    expect(await canSignIn(user.email, TEST_PASSWORD)).toBe(true);
    expect(await canSignIn(user.email, "Brand.New.Password.2026")).toBe(false);
  });

  it("refuses a new password identical to the current one", async () => {
    const user = await createUser(sql);
    await signInAs(user.id);

    const error = await changePassword(TEST_PASSWORD, TEST_PASSWORD).catch((thrown) => thrown);
    expect((error as PasswordChangeError).reason).toBe("same_as_current");
  });

  it("refuses when there is no session at all", async () => {
    const user = await createUser(sql);
    resetCookieState();

    // بلا جلسة لا تُحلّ هوية، فلا يُقرأ حتى التحقق من الكلمة الحالية.
    const outcome = await withSessionUser(async () => "reached");
    expect(outcome).toBeNull();
    expect(await canSignIn(user.email, TEST_PASSWORD)).toBe(true);
  });
});

describe("changing a password only affects the account that changed it", () => {
  it("does not touch another account's password", async () => {
    const mine = await createUser(sql);
    const other = await createUser(sql);
    await signInAs(mine.id);

    await changePassword(TEST_PASSWORD, "Mine.Only.Password.2026");

    expect(await canSignIn(mine.email, "Mine.Only.Password.2026")).toBe(true);
    expect(await canSignIn(other.email, TEST_PASSWORD)).toBe(true);
    expect(await canSignIn(other.email, "Mine.Only.Password.2026")).toBe(false);
  });

  it("changes only the reading account even when both are signed in on this browser", async () => {
    const mine = await createUser(sql);
    const other = await createUser(sql);
    await signInAs(other.id);
    await signInAs(mine.id);

    await changePassword(TEST_PASSWORD, "Mine.Now.Password.2026");

    const credentials = await sql.query<{ user_id: string; password_digest: string }>(
      "select user_id, password_digest from public.auth_password_credentials where user_id = any($1::uuid[])",
      [[mine.id, other.id]],
    );
    const digestOf = (userId: string) => credentials.rows.find((row) => row.user_id === userId)?.password_digest;
    expect(digestOf(mine.id)).not.toBe(digestOf(other.id));
    expect(await canSignIn(other.email, TEST_PASSWORD)).toBe(true);
  });
});

describe("other devices lose their sessions, this one keeps working", () => {
  it("revokes every other session and counts them", async () => {
    const user = await createUser(sql);
    await signInAs(user.id);
    await createPostgresSession(sql, user.id);
    await createPostgresSession(sql, user.id);

    const result = await changePassword(TEST_PASSWORD, "Fresh.Password.2026");

    expect(result?.revokedOtherSessions).toBe(2);
    const remaining = await sql.query<{ n: number }>(
      "select count(*)::int as n from public.auth_sessions where user_id = $1 and revoked_at is null",
      [user.id],
    );
    expect(remaining.rows[0]?.n).toBe(1);
  });

  it("keeps this device signed in, so the change does not look like a failure", async () => {
    const user = await createUser(sql);
    await signInAs(user.id);
    await createPostgresSession(sql, user.id);

    await changePassword(TEST_PASSWORD, "Keep.Me.In.2026");

    const stillSignedIn = await withSessionUser(async () => "alive");
    expect(stillSignedIn).toBe("alive");

    const sessions = await withSessionUser(async ({ sql: scoped, user: actor, digest }) =>
      listAccountSessions(scoped, { userId: actor.id, currentDigest: digest }),
    );
    expect(sessions?.filter((session) => !session.isCurrent)).toHaveLength(0);
  });

  it("reports zero when there was no other device", async () => {
    const user = await createUser(sql);
    await signInAs(user.id);

    const result = await changePassword(TEST_PASSWORD, "Solo.Device.2026");
    expect(result?.revokedOtherSessions).toBe(0);
  });

  it("does not revoke a session belonging to another account", async () => {
    const mine = await createUser(sql);
    const other = await createUser(sql);
    await signInAs(other.id);
    await signInAs(mine.id);
    // جلسة الطرف الآخر ما زالت في الكوكي، لكن الهوية المحلولة هي صاحبة الجلسة.

    await changePassword(TEST_PASSWORD, "Isolated.Change.2026");

    const otherActive = await sql.query<{ n: number }>(
      "select count(*)::int as n from public.auth_sessions where user_id = $1 and revoked_at is null",
      [other.id],
    );
    expect(otherActive.rows[0]?.n).toBe(1);
  });
});

describe("the flow works for an account that never had a password", () => {
  it("lets an account created without credentials still sign in after one is set", async () => {
    // هذا هو حال المالك الذي تُنشئه إدارة المنصة: الحساب موجود بلا كلمة مرور.
    const { owner } = await createTenantWithOwner(sql, { tenantName: "Admin Made" });

    // بلا بصمة، لا يتحقق أي شيء: الحساب لا يملك كلمة مرور أصلًا.
    await signInAs(owner.id);
    const error = await changePassword("anything", "First.Password.2026").catch((thrown) => thrown);
    expect((error as PasswordChangeError).reason).toBe("wrong_current_password");
  });
});
