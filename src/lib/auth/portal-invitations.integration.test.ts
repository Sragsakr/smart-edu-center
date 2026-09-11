import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetCookieState } from "@/test/postgres/test-cookies";
import { testSqlExecutor, truncateAllTenantData } from "@/test/postgres/test-database";
import {
  createBranch,
  createGuardian,
  createStudent,
  createTenantWithOwner,
  createUser,
  grantEntitlements,
} from "@/test/postgres/fixtures";
import { createPostgresSession } from "@/lib/auth/postgres-auth";
import {
  PortalClaimError,
  claimPortalInvitation,
  createPortalInvitation,
  digestPortalToken,
  generatePortalToken,
  getPortalInvitationPreview,
  revokePortalInvitation,
} from "@/lib/auth/portal-invitations";
import { withSessionUser } from "@/lib/auth/session-context";

/**
 * اختبارات المسار الموثوق لربط هوية بحساب طالب أو ولي أمر.
 *
 * الأهم هنا هو **الحالات السالبة**: مسار بلا رفض فعّال يعني إمكانية انتحال صفة
 * طالب أو ولي أمر بمجرد حيازة رابط.
 */

const sql = testSqlExecutor();

/**
 * ينفّذ عملية داخل سياق مساحة بلا جلسة.
 *
 * الخدمة تستقبل الهوية كوسيط صريح، فالاختبار يفحص منطق القبول نفسه: من يملك
 * الرمز، وبأي بريد، وعلى أي سجل. ومسار الجلسة يُختبر في اختبارات أخرى.
 */
function asTenant<Result>(tenantId: string, operation: (scoped: never) => Promise<Result>): Promise<Result> {
  return sql.withoutSession(async (scoped) => {
    await scoped.enterTenantScope(tenantId);
    return operation(scoped as never);
  }) as Promise<Result>;
}

beforeEach(() => {
  resetCookieState();
});

afterEach(async () => {
  await truncateAllTenantData();
});

async function loginAs(userId: string) {
  resetCookieState();
  await createPostgresSession(sql, userId);
}

async function seedClaimableRecord(name: string, subjectType: "student" | "guardian" = "student") {
  const { tenant, owner } = await createTenantWithOwner(sql, { tenantName: name });
  await grantEntitlements(sql, tenant.id, "management_platform");
  const branch = await createBranch(sql, tenant.id, `${name} Branch`);
  const student = await createStudent(sql, tenant.id, branch.id, { fullName: `${name} Student` });
  const guardian = await createGuardian(sql, tenant.id, { fullName: `${name} Guardian` });
  const subjectId = subjectType === "student" ? student.id : guardian.id;

  const inviteeEmail = `${name.toLowerCase().replace(/\s+/g, ".")}@example.test`;
  // إنشاء الدعوة ينفّذه مدير المساحة، فيلزم توثيق هويته أولًا.
  const invitation = await asTenant(tenant.id, (scoped) =>
    createPortalInvitation(scoped, {
      tenantId: tenant.id,
      subjectType,
      subjectId,
      inviteeEmail,
      createdBy: owner.id,
    }),
    );

  return { tenant, owner, branch, student, guardian, subjectId, invitation, subjectType, inviteeEmail };
}

describe("portal invitation creation", () => {
  it("creates a pending invitation whose token is only ever stored as a digest", async () => {
    const fixture = await seedClaimableRecord("Store");

    const stored = await sql.query<{ token_hash: string; status: string; invitee_email: string }>(
      "select token_hash, status::text as status, invitee_email::text as invitee_email from public.portal_invitations where id = $1",
      [fixture.invitation.id],
    );
    const row = stored.rows[0];
    expect(row?.status).toBe("pending");
    expect(row?.token_hash).toBe(digestPortalToken(fixture.invitation.rawToken));
    expect(row?.token_hash).not.toContain(fixture.invitation.rawToken);
    expect(row?.token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reissues the same record rather than creating a competing invitation", async () => {
    const fixture = await seedClaimableRecord("Reissue");
    const second = await asTenant(fixture.tenant.id, (scoped) =>
      createPortalInvitation(scoped, {
        tenantId: fixture.tenant.id,
        subjectType: "student",
        subjectId: fixture.student.id,
        inviteeEmail: "someone.else@example.test",
        createdBy: fixture.owner.id,
      }),
    );

    expect(second.id).toBe(fixture.invitation.id);
    const count = await sql.query<{ n: number }>(
      "select count(*)::int as n from public.portal_invitations where tenant_id = $1",
      [fixture.tenant.id],
    );
    expect(count.rows[0]?.n).toBe(1);

    // الرمز القديم لم يعد يعمل بعد إعادة الإصدار.
    const preview = await getPortalInvitationPreview(fixture.invitation.rawToken);
    expect(preview).toBeNull();
  });

  it("refuses an invitation for a record in another tenant", async () => {
    const a = await seedClaimableRecord("Cross A");
    const b = await seedClaimableRecord("Cross B");

    await expect(
      asTenant(a.tenant.id, (scoped) =>
        createPortalInvitation(scoped, {
          tenantId: a.tenant.id,
          subjectType: "student",
          subjectId: b.student.id,
          inviteeEmail: "x@example.test",
          createdBy: a.owner.id,
        }),
      ),
    ).rejects.toThrow();
  });

  it("rejects a malformed invitee email at the database level", async () => {
    const fixture = await seedClaimableRecord("Bad Email");
    await expect(
      sql.query(
        `insert into public.portal_invitations (tenant_id, subject_type, subject_id, invitee_email, token_hash, created_by, expires_at)
         values ($1, 'student', $2, 'not-an-email', $3, $4, now() + interval '1 day')`,
        [fixture.tenant.id, fixture.student.id, generatePortalToken().hash, fixture.owner.id],
      ),
    ).rejects.toThrow();
  });
});

describe("portal claim: the happy path", () => {
  it("links the record to the matching identity and marks the invitation accepted", async () => {
    const fixture = await seedClaimableRecord("Happy");
    const user = await createUser(sql, { email: "happy@example.test" });
    // البريد المدعو يجب أن يطابق بريد الهوية.
    await sql.query("update public.portal_invitations set invitee_email = $1 where id = $2", [
      "happy@example.test",
      fixture.invitation.id,
    ]);

    await loginAs(user.id);
    const claimed = await asTenant(fixture.tenant.id, (scoped) =>
      claimPortalInvitation(scoped, { token: fixture.invitation.rawToken, identity: user }),
    );

    expect(claimed.subjectId).toBe(fixture.student.id);

    const linked = await sql.query<{ user_id: string | null }>("select user_id from public.students where id = $1", [
      fixture.student.id,
    ]);
    expect(linked.rows[0]?.user_id).toBe(user.id);

    const status = await sql.query<{ status: string; accepted_by: string | null }>(
      "select status::text as status, accepted_by from public.portal_invitations where id = $1",
      [fixture.invitation.id],
    );
    expect(status.rows[0]?.status).toBe("accepted");
    expect(status.rows[0]?.accepted_by).toBe(user.id);
  });

  it("links a guardian record through the same flow", async () => {
    const fixture = await seedClaimableRecord("Guardian Happy", "guardian");
    const user = await createUser(sql, { email: "guardian.happy@example.test" });
    await sql.query("update public.portal_invitations set invitee_email = $1 where id = $2", [
      "guardian.happy@example.test",
      fixture.invitation.id,
    ]);

    await asTenant(fixture.tenant.id, (scoped) =>
      claimPortalInvitation(scoped, { token: fixture.invitation.rawToken, identity: user }),
    );

    const linked = await sql.query<{ user_id: string | null }>("select user_id from public.guardians where id = $1", [
      fixture.guardian.id,
    ]);
    expect(linked.rows[0]?.user_id).toBe(user.id);
  });

  it("matches the invitee email case-insensitively", async () => {
    const fixture = await seedClaimableRecord("Case");
    const user = await createUser(sql, { email: "case.user@example.test" });
    await sql.query("update public.portal_invitations set invitee_email = $1 where id = $2", [
      "CASE.USER@EXAMPLE.TEST",
      fixture.invitation.id,
    ]);

    await expect(
      asTenant(fixture.tenant.id, (scoped) =>
        claimPortalInvitation(scoped, { token: fixture.invitation.rawToken, identity: user }),
      ),
    ).resolves.toBeTruthy();
  });
});

describe("portal claim: impersonation is refused", () => {
  it("refuses a holder of the link whose identity has a different email", async () => {
    // هذه أهم حالة: الرمز صحيح ومُحكَم، لكن الهوية ليست صاحبة الدعوة.
    const fixture = await seedClaimableRecord("Impersonate");
    const attacker = await createUser(sql, { email: "attacker@example.test" });
    await sql.query("update public.portal_invitations set invitee_email = $1 where id = $2", [
      "victim@example.test",
      fixture.invitation.id,
    ]);

    const error = await asTenant(fixture.tenant.id, (scoped) =>
      claimPortalInvitation(scoped, { token: fixture.invitation.rawToken, identity: attacker }).catch((thrown) => thrown),
    );
    expect(error).toBeInstanceOf(PortalClaimError);
    expect((error as PortalClaimError).reason).toBe("email_mismatch");

    // السجل لم يُربط بأحد.
    const linked = await sql.query<{ user_id: string | null }>("select user_id from public.students where id = $1", [
      fixture.student.id,
    ]);
    expect(linked.rows[0]?.user_id).toBeNull();
  });

  it("refuses a token that does not exist", async () => {
    const fixture = await seedClaimableRecord("Bad Token");
    const user = await createUser(sql, { email: "bad.token@example.test" });

    const error = await asTenant(fixture.tenant.id, (scoped) =>
      claimPortalInvitation(scoped, { token: "not-a-real-token", identity: user }).catch((thrown) => thrown),
    );
    expect((error as PortalClaimError).reason).toBe("invalid_token");
  });

  it("refuses to reuse an already-accepted invitation", async () => {
    const fixture = await seedClaimableRecord("Replay");
    const first = await createUser(sql, { email: "replay.first@example.test" });
    await sql.query("update public.portal_invitations set invitee_email = $1 where id = $2", [
      "replay.first@example.test",
      fixture.invitation.id,
    ]);

    await asTenant(fixture.tenant.id, (scoped) =>
      claimPortalInvitation(scoped, { token: fixture.invitation.rawToken, identity: first }),
    );

    const error = await asTenant(fixture.tenant.id, (scoped) =>
      claimPortalInvitation(scoped, { token: fixture.invitation.rawToken, identity: first }).catch((thrown) => thrown),
    );
    expect((error as PortalClaimError).reason).toBe("not_pending");
  });

  it("refuses a revoked invitation", async () => {
    const fixture = await seedClaimableRecord("Revoked");
    const user = await createUser(sql, { email: "revoked@example.test" });
    await sql.query("update public.portal_invitations set invitee_email = $1 where id = $2", [
      "revoked@example.test",
      fixture.invitation.id,
    ]);

    await asTenant(fixture.tenant.id, (scoped) => revokePortalInvitation(scoped, fixture.invitation.id));

    const error = await asTenant(fixture.tenant.id, (scoped) =>
      claimPortalInvitation(scoped, { token: fixture.invitation.rawToken, identity: user }).catch((thrown) => thrown),
    );
    expect((error as PortalClaimError).reason).toBe("not_pending");
  });

  it("refuses an expired invitation", async () => {
    const fixture = await seedClaimableRecord("Expired");
    const user = await createUser(sql, { email: "expired@example.test" });
    // الدعوة لا يمكن أن تنتهي قبل إنشائها (قيد في المخطط)، فنؤخّر الإنشاء والانتهاء معًا.
    await sql.query(
      `update public.portal_invitations
       set invitee_email = $1,
           created_at = now() - interval '2 days',
           expires_at = now() - interval '1 hour'
       where id = $2`,
      ["expired@example.test", fixture.invitation.id],
    );

    const error = await asTenant(fixture.tenant.id, (scoped) =>
      claimPortalInvitation(scoped, { token: fixture.invitation.rawToken, identity: user }).catch((thrown) => thrown),
    );
    expect((error as PortalClaimError).reason).toBe("expired");
  });

  it("refuses to take over a record that is already linked to someone else", async () => {
    const fixture = await seedClaimableRecord("Taken Over");
    const existing = await createUser(sql, { email: "existing.owner@example.test" });
    const newcomer = await createUser(sql, { email: "newcomer@example.test" });

    // السجل مرتبط بهوية قائمة، ثم تُصدر دعوة له لبريد آخر.
    await sql.query("update public.students set user_id = $1 where id = $2", [existing.id, fixture.student.id]);
    await sql.query("update public.portal_invitations set invitee_email = $1 where id = $2", [
      "newcomer@example.test",
      fixture.invitation.id,
    ]);

    const error = await asTenant(fixture.tenant.id, (scoped) =>
      claimPortalInvitation(scoped, { token: fixture.invitation.rawToken, identity: newcomer }).catch((thrown) => thrown),
    );
    expect((error as PortalClaimError).reason).toBe("record_already_claimed");

    // ولم تُنزع ملكية السجل من صاحبه.
    const linked = await sql.query<{ user_id: string | null }>("select user_id from public.students where id = $1", [
      fixture.student.id,
    ]);
    expect(linked.rows[0]?.user_id).toBe(existing.id);
  });

  it("refuses a second student record in the same workspace for one identity", async () => {
    // القيد `unique(tenant_id, user_id)` يمنع التنقل بين السجلات داخل مساحة واحدة.
    const fixture = await seedClaimableRecord("Two Records");
    const user = await createUser(sql, { email: "two.records@example.test" });
    const branch = await createBranch(sql, fixture.tenant.id, "Second Branch");
    const secondStudent = await createStudent(sql, fixture.tenant.id, branch.id, { fullName: "Second Student" });

    await sql.query("update public.portal_invitations set invitee_email = $1 where id = $2", [
      "two.records@example.test",
      fixture.invitation.id,
    ]);
    await loginAs(user.id);
    await withSessionUser(async ({ sql: scoped }) =>
      claimPortalInvitation(scoped, { token: fixture.invitation.rawToken, identity: user }),
    );

    const secondInvitation = await asTenant(fixture.tenant.id, (scoped) =>
      createPortalInvitation(scoped, {
        tenantId: fixture.tenant.id,
        subjectType: "student",
        subjectId: secondStudent.id,
        inviteeEmail: "two.records@example.test",
        createdBy: fixture.owner.id,
      }),
    );

    // الهوية نفسها لا تُربط بسجلين في مساحة واحدة: `unique(tenant_id, user_id)` يمنعها.
    await expect(
      asTenant(fixture.tenant.id, (scoped) =>
        claimPortalInvitation(scoped, { token: secondInvitation.rawToken, identity: user }),
      ),
    ).rejects.toThrow();

    // والسجل الأول ما زال مرتبطًا به.
    const first = await sql.query<{ user_id: string | null }>("select user_id from public.students where id = $1", [
      fixture.student.id,
    ]);
    expect(first.rows[0]?.user_id).toBe(user.id);
  });
});

describe("portal invitation preview", () => {
  it("reveals only the invitation, never the person's name, before acceptance", async () => {
    const fixture = await seedClaimableRecord("Preview");
    const preview = await getPortalInvitationPreview(fixture.invitation.rawToken);

    expect(preview).not.toBeNull();
    expect(preview?.subjectType).toBe("student");
    expect(preview?.inviteeEmail).toBe(fixture.inviteeEmail);
    expect(JSON.stringify(preview)).not.toContain("Preview Student");
  });

  it("returns null for an unknown token", async () => {
    expect(await getPortalInvitationPreview("unknown-token-value")).toBeNull();
  });

  it("reports whether an account already exists for the invitee", async () => {
    const fixture = await seedClaimableRecord("Account State");
    const before = await getPortalInvitationPreview(fixture.invitation.rawToken);
    expect(before?.accountExists).toBe(false);

    await createUser(sql, { email: fixture.inviteeEmail });
    const after = await getPortalInvitationPreview(fixture.invitation.rawToken);
    expect(after?.accountExists).toBe(true);
  });
});

/**
 * عزل الصفوف بـRLS يُختبر في `src/lib/security/row-level-security.integration.test.ts`
 * بدور التطبيق. وهنا يُختبر سلوك الخدمة: أن مسار الرمز لا يكشف إلا صفه.
 */
describe("portal invitation isolation", () => {
  it("exposes an invitation row only to its own token before any tenant is known", async () => {
    // مسار الرمز يعمل بلا سياق مساحة، لكنه لا يكشف إلا الصف المطابق للرمز نفسه.
    const a = await seedClaimableRecord("Iso D");
    const b = await seedClaimableRecord("Iso E");

    const viaToken = await sql.withoutSession(
      async (scoped) => scoped.query<{ id: string }>("select id from private.portal_invitation_by_token($1)", [
        digestPortalToken(b.invitation.rawToken),
      ]),
    );
    expect(viaToken.rows.map((row) => row.id)).toEqual([b.invitation.id]);

    const wrongToken = await sql.withoutSession(
      async (scoped) => scoped.query<{ id: string }>("select id from private.portal_invitation_by_token($1)", [
        digestPortalToken("a-token-that-was-never-issued"),
      ]),
    );
    expect(wrongToken.rowCount).toBe(0);
    expect(viaToken.rows.map((row) => row.id)).not.toContain(a.invitation.id);
  });
});
