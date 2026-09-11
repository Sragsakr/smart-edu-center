import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetCookieState } from "@/test/postgres/test-cookies";
import { resetRequestState, setRequestDevice } from "@/test/postgres/test-request";
import { testSqlExecutor, truncateAllTenantData } from "@/test/postgres/test-database";
import { createTenantWithOwner, createUser } from "@/test/postgres/fixtures";
import { createPostgresSession, clearPostgresSession } from "@/lib/auth/postgres-auth";
import {
  listAccountSessions,
  revokeAccountSession,
  revokeAllAccountSessions,
  revokeOtherAccountSessions,
} from "@/lib/auth/account-sessions";
import { withSessionUser } from "@/lib/auth/session-context";

/**
 * إدارة الأجهزة والجلسات.
 *
 * ما يُختبر هنا هو ما يقرر أمن الحساب: أن كل كتابة تقع على صفوف المستخدم وحده،
 * وأن السحب يُبطل فعلًا، وأن الجلسة الحالية تُعلَّم بدقة لأنها الأصل الذي يقارن
 * به المستخدم بقية الأجهزة.
 */

const sql = testSqlExecutor();

beforeEach(() => {
  resetCookieState();
  resetRequestState();
});

afterEach(async () => {
  await truncateAllTenantData();
});

/**
 * يفتح جلسة بجهاز معروف ويجعلها **الجلسة الحالية** في الكوكي.
 *
 * عدم إبقاء الكوكي كان سيصفّر الجلسة التي أُنشئت للتو، فتصبح كل قراءة لاحقة بلا
 * هوية — وهو ما يُفسد الغرض من الاختبار لا يُثبته. ولأن القراءة تمر بالكوكي،
 * لا تحتاج دالة القراءة معرّفًا: من يقرأ هو من يحمل الجلسة.
 */
async function openSession(userId: string, userAgent: string, ipAddress: string | null = null): Promise<void> {
  setRequestDevice(userAgent, ipAddress);
  await createPostgresSession(sql, userId);
}

/** يقرأ قائمة الجلسات كما يقرأها التطبيق: داخل سياق الجلسة الحالية. */
async function listSessionsAs() {
  const result = await withSessionUser(async ({ sql: scoped, user, digest }) => ({
    digest,
    sessions: await listAccountSessions(scoped, { userId: user.id, currentDigest: digest }),
  }));
  if (!result) throw new Error("fixture: expected a valid session");
  return result;
}

describe("device session listing", () => {
  it("lists every active session for the account and marks the reading one", async () => {
    const user = await createUser(sql);
    await openSession(user.id, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36");

    // الجلسة الأولى ما زالت في الكوكي، فنُنشئ أخرى فوقها: كلاهما للمستخدم نفسه.
    setRequestDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/604.1");
    await createPostgresSession(sql, user.id);
    const second = await listSessionsAs();

    expect(second.sessions).toHaveLength(2);
    expect(second.sessions.filter((session) => session.isCurrent)).toHaveLength(1);
    const current = second.sessions.find((session) => session.isCurrent);
    expect(current?.deviceLabel).toBe("Safari على iPhone");
  });

  it("reports the device recorded when the session was created", async () => {
    const user = await createUser(sql);
    await openSession(
      user.id,
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
      "203.0.113.10",
    );

    const { sessions } = await listSessionsAs();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.deviceLabel).toBe("Safari على macOS");
    expect(sessions[0]?.ipAddress).toBe("203.0.113.10");
    expect(sessions[0]?.deviceKind).toBe("desktop");
  });

  it("leaves the address empty rather than storing an unparseable forwarding header", async () => {
    const user = await createUser(sql);
    setRequestDevice("Mozilla/5.0 (X11; Linux x86_64) Firefox/127.0", "not-an-address");
    resetCookieState();
    await createPostgresSession(sql, user.id);

    const { sessions } = await listSessionsAs();
    expect(sessions[0]?.ipAddress).toBeNull();
  });

  it("never lists another account's sessions", async () => {
    const mine = await createUser(sql);
    const other = await createUser(sql);
    await openSession(other.id, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0");
    await openSession(mine.id, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15");

    const { sessions } = await listSessionsAs();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.deviceLabel).toBe("Safari على macOS");
  });

  it("stops listing a session as soon as it is revoked", async () => {
    const user = await createUser(sql);
    await openSession(user.id, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0");
    await createPostgresSession(sql, user.id);
    const current = await listSessionsAs();

    const target = current.sessions.find((session) => !session.isCurrent)!;
    const revoked = await withSessionUser(async ({ sql: scoped, user: actor }) =>
      revokeAccountSession(scoped, { userId: actor.id, sessionId: target.id }),
    );

    expect(revoked).toBe(true);
    const after = await listSessionsAs();
    expect(after.sessions.map((session) => session.id)).not.toContain(target.id);
  });
});

describe("device session revocation", () => {
  it("refuses to revoke a session that belongs to another account", async () => {
    const mine = await createUser(sql);
    const other = await createUser(sql);
    await openSession(other.id, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0");
    await openSession(mine.id, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15");

    const otherSession = await sql.query<{ id: string }>(
      "select id from public.auth_sessions where user_id = $1",
      [other.id],
    );
    const victimId = otherSession.rows[0]!.id;

    const outcome = await withSessionUser(async ({ sql: scoped, user }) =>
      revokeAccountSession(scoped, { userId: user.id, sessionId: victimId }),
    );
    expect(outcome).toBe(false);

    const stillActive = await sql.query<{ revoked_at: string | null }>(
      "select revoked_at::text as revoked_at from public.auth_sessions where id = $1",
      [victimId],
    );
    expect(stillActive.rows[0]?.revoked_at).toBeNull();
  });

  it("revokes every other device and keeps the current session usable", async () => {
    const user = await createUser(sql);
    await openSession(user.id, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0");
    await createPostgresSession(sql, user.id);
    await createPostgresSession(sql, user.id);

    const revokedCount = await withSessionUser(async ({ sql: scoped, user: actor, digest }) =>
      revokeOtherAccountSessions(scoped, { userId: actor.id, currentDigest: digest }),
    );
    expect(revokedCount).toBe(2);

    // الجلسة القارئة نجت: الإجراء لا يخرج المستخدم من الجهاز الذي ضغط فيه.
    const after = await listSessionsAs();
    expect(after.sessions).toHaveLength(1);
    expect(after.sessions[0]?.isCurrent).toBe(true);
  });

  it("reports zero when there is no other device to revoke", async () => {
    const user = await createUser(sql);
    await openSession(user.id, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15");

    const revokedCount = await withSessionUser(async ({ sql: scoped, user: actor, digest }) =>
      revokeOtherAccountSessions(scoped, { userId: actor.id, currentDigest: digest }),
    );
    expect(revokedCount).toBe(0);
  });

  it("revokes all sessions including the current one when asked to", async () => {
    const user = await createUser(sql);
    await openSession(user.id, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0");
    await createPostgresSession(sql, user.id);

    const revokedCount = await withSessionUser(async ({ sql: scoped, user: actor }) =>
      revokeAllAccountSessions(scoped, { userId: actor.id }),
    );
    expect(revokedCount).toBe(2);

    const remaining = await sql.query<{ n: number }>(
      "select count(*)::int as n from public.auth_sessions where user_id = $1 and revoked_at is null",
      [user.id],
    );
    expect(remaining.rows[0]?.n).toBe(0);
  });
});

describe("session context and device data", () => {
  it("marks only the reading session as seen, not every device of the account", async () => {
    const user = await createUser(sql);
    await openSession(user.id, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0");
    await createPostgresSession(sql, user.id);

    const before = await sql.query<{ id: string; last_seen_at: string }>(
      "select id, last_seen_at::text as last_seen_at from public.auth_sessions where user_id = $1 order by created_at",
      [user.id],
    );
    const idleId = before.rows[0]!.id;
    const idleBefore = before.rows[0]!.last_seen_at;

    // ننتظر قليلًا حتى يظهر أثر التحديث لو وقع على الجلسة الخاملة أيضًا.
    await new Promise((resolve) => setTimeout(resolve, 20));
    await listSessionsAs();

    const after = await sql.query<{ id: string; last_seen_at: string }>(
      "select id, last_seen_at::text as last_seen_at from public.auth_sessions where user_id = $1",
      [user.id],
    );
    const idleAfter = after.rows.find((row) => row.id === idleId)?.last_seen_at;

    // لولا تقييد التحديث بالجلسة الحالية لتغيّر وقت الجلسة الخاملة أيضًا، فيبدو
    // كل جهاز «نشطًا الآن» ويفقد العمود معناه.
    expect(idleAfter).toBe(idleBefore);
  });

  it("records the device on sign-in so the list is meaningful from the first login", async () => {
    const user = await createUser(sql);
    setRequestDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/604.1", "198.51.100.7");
    await createPostgresSession(sql, user.id);

    const { sessions } = await listSessionsAs();
    expect(sessions[0]).toMatchObject({
      deviceLabel: "Safari على iPhone",
      deviceKind: "mobile",
      ipAddress: "198.51.100.7",
    });
  });

  it("ends the session on sign-out so the same cookie can no longer be used", async () => {
    const user = await createUser(sql);
    await createPostgresSession(sql, user.id);
    expect(await listSessionsAs()).toBeTruthy();

    // `clearPostgresSession` تقرأ الكوكي بنفسها، فلا نصفّره قبلها.
    await clearPostgresSession(sql);

    resetCookieState();
    const afterSignOut = await withSessionUser(async () => "still signed in");
    expect(afterSignOut).toBeNull();

    const active = await sql.query<{ n: number }>(
      "select count(*)::int as n from public.auth_sessions where user_id = $1 and revoked_at is null",
      [user.id],
    );
    expect(active.rows[0]?.n).toBe(0);
  });

  it("keeps sessions independent from tenant membership", async () => {
    const { owner } = await createTenantWithOwner(sql, { tenantName: "Sessions Tenant" });
    await openSession(owner.id, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15");

    // الجلسة تخصّ الشخص لا عضويته: تظهر بغض النظر عن المساحة النشطة.
    const { sessions } = await listSessionsAs();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.isCurrent).toBe(true);
  });
});
