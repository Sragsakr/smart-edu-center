import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { resetCookieState } from "@/test/postgres/test-cookies";
import { testSqlExecutor, truncateAllTenantData } from "@/test/postgres/test-database";
import { addMembership, createTenantWithOwner, createUser, grantEntitlements } from "@/test/postgres/fixtures";
import { createPostgresSession } from "@/lib/auth/postgres-auth";
import { createPostgresInvitation } from "@/lib/auth/postgres-team";
import { transferOwnership } from "@/app/team/ownership-actions";
import { createInvitation, deactivateMembership, reactivateMembership, resendInvitation } from "@/app/team/actions";
import { revokeInvitation } from "@/app/team/actions";
import { approvePasswordReset, rejectPasswordReset } from "@/app/platform-admin/password-resets/actions";
import { approveWorkspaceRequest, rejectWorkspaceRequest } from "@/app/platform-admin/requests/actions";
import { setTenantStatus } from "@/app/platform-admin/tenants/actions";

/**
 * IDOR/BOLA والعبور بين المساحات.
 *
 * القاعدة المُختبرة: **معرّف يأتي من العميل لا يمنح وصولًا أبدًا.** من يملك جلسة
 * صالحة وعضوية في مساحة يستطيع إرسال أي معرّف يختاره، فالحماية لا تكون بإخفاء
 * المعرّف ولا بجعل الصفحة لا تعرضه، بل بأن يرفض الخادم المعرّف الذي لا يملكه.
 *
 * وكل اختبار يقيس شيئين معًا: **الرفض**، و**عدم تغيّر المورد المستهدف**. الأول
 * وحده لا يكفي: إجراء يرفض بعد أن يكون قد كتب يكون قد أخفق في الغرض.
 *
 * السطح المحصيّ: 6 إجراءات على نطاق المساحة تأخذ معرّفات من العميل، و5 إجراءات
 * على نطاق المنصة، ومساري API عامّين. المرجع: `docs/CROSS_TENANT_MATRIX.md`.
 */

const sql = testSqlExecutor();

beforeEach(() => {
  resetCookieState();
});

afterEach(async () => {
  await truncateAllTenantData();
});

type ActionOutcome = { threw: boolean; redirectedTo: string | null };

/** يستدعي إجراءً ويقرأ وجهته بدل أن يستسلم لخطأ `NEXT_REDIRECT`. */
async function callAction(
  action: (formData: FormData) => Promise<unknown>,
  fields: Record<string, string>,
): Promise<ActionOutcome> {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  try {
    await action(formData);
    return { threw: false, redirectedTo: null };
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    const match = digest.match(/^NEXT_REDIRECT;[a-z]+;([^;]+);/);
    // رمي صريح مقبول أيضًا: رفض الحارس للهوية غير المصرّح بها يرمي بدل أن يوجّه.
    if (!match?.[1]) return { threw: true, redirectedTo: null };
    return { threw: false, redirectedTo: decodeURIComponent(match[1]) };
  }
}

async function signInAs(userId: string): Promise<void> {
  resetCookieState();
  await createPostgresSession(sql, userId);
}

/**
 * مساحتان مستقلّتان، كل واحدة بمالك وعضو دعوة معلّقة.
 *
 * «المهاجم» مالك `victim`، و«الضحية» `target`. الاختبار يعطي المهاجم معرّفات
 * الضحية ويراقب هل يمسّها.
 */
async function seedTwoWorkspaces() {
  const victim = await createTenantWithOwner(sql, {
    tenantName: "Victim Workspace",
    productLevel: "management_platform",
  });
  await grantEntitlements(sql, victim.tenant.id, "management_platform");
  const victimMember = await createUser(sql);
  await addMembership(sql, victim.tenant.id, victimMember.id, "teacher");
  const victimInvitation = await createPostgresInvitation(
    sql,
    victim.tenant.id,
    victim.owner.id,
    `victim.invite.${victimMember.id.slice(0, 8)}@example.test`,
    "teacher",
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const attacker = await createTenantWithOwner(sql, {
    tenantName: "Attacker Workspace",
    productLevel: "management_platform",
  });
  await grantEntitlements(sql, attacker.tenant.id, "management_platform");
  const attackerMember = await createUser(sql);
  await addMembership(sql, attacker.tenant.id, attackerMember.id, "teacher");

  return { victim, victimMember, victimInvitation, attacker, attackerMember };
}

/**
 * صورة كاملة لدعوة الضحية قبل الهجوم وبعده.
 *
 * `token_hash` مُدرج لأن إعادة الإرسال الناجحة كانت **تُدوّر الرمز** وتُمدّد
 * الصلاحية، وهو الضرر الفعلي: دعوة قديمة تُبطَل ودعوة جديدة تصبح صالحة.
 */
async function victimInvitationSnapshot(invitationId: string) {
  const result = await sql.query<{ status: string; token_hash: string; tenant_id: string; expires_at: string }>(
    "select status::text as status, token_hash, tenant_id, expires_at::text as expires_at from public.invitations where id = $1",
    [invitationId],
  );
  return result.rows[0] ?? null;
}

/** هل بقيت عضوية عضو الضحية كما هي؟ */
async function victimMemberState(userId: string): Promise<{ role: string; active: boolean } | null> {
  const result = await sql.query<{ role: string; active: boolean }>(
    "select role::text as role, active from public.memberships where user_id = $1",
    [userId],
  );
  return result.rows[0] ?? null;
}

describe("a client-supplied identifier from another workspace is refused", () => {
  it("refuses creating an invitation addressed to another workspace", async () => {
    const { victim, attacker } = await seedTwoWorkspaces();
    await signInAs(attacker.owner.id);

    const outcome = await callAction(createInvitation, {
      tenant_id: victim.tenant.id,
      email: "planted@example.test",
      role: "teacher",
    });

    expect(outcome.redirectedTo).toContain("error=");
    const planted = await sql.query<{ n: number }>(
      "select count(*)::int as n from public.invitations where tenant_id = $1 and invitee_email = 'planted@example.test'",
      [victim.tenant.id],
    );
    expect(planted.rows[0]?.n).toBe(0);
  });

  it("refuses resending another workspace's invitation", async () => {
    const { victim, victimInvitation, attacker } = await seedTwoWorkspaces();
    const before = await victimInvitationSnapshot(victimInvitation.id);
    await signInAs(attacker.owner.id);

    const outcome = await callAction(resendInvitation, {
      tenant_id: attacker.tenant.id,
      invitation_id: victimInvitation.id,
    });

    expect(outcome.redirectedTo).toContain("error=");
    // الدعوة كما هي: الحالة، والرمز، والصلاحية، والمساحة المالكة.
    const after = await victimInvitationSnapshot(victimInvitation.id);
    expect(after).toEqual(before);
    expect(after?.tenant_id).toBe(victim.tenant.id);
    expect(after?.status).toBe("pending");
  });

  it("refuses revoking another workspace's invitation", async () => {
    const { victim, victimInvitation, attacker } = await seedTwoWorkspaces();
    await signInAs(attacker.owner.id);

    const outcome = await callAction(revokeInvitation, {
      tenant_id: attacker.tenant.id,
      invitation_id: victimInvitation.id,
    });

    expect(outcome.redirectedTo).toContain("error=");
    const after = await victimInvitationSnapshot(victimInvitation.id);
    expect(after?.status).toBe("pending");
    expect(after?.tenant_id).toBe(victim.tenant.id);
  });

  it("refuses deactivating a member of another workspace", async () => {
    const { victimMember, attacker } = await seedTwoWorkspaces();
    await signInAs(attacker.owner.id);

    const outcome = await callAction(deactivateMembership, {
      tenant_id: attacker.tenant.id,
      user_id: victimMember.id,
    });

    expect(outcome.redirectedTo).toContain("error=");
    expect(await victimMemberState(victimMember.id)).toEqual({ role: "teacher", active: true });
  });

  it("refuses reactivating a member of another workspace", async () => {
    const { victimMember, attacker } = await seedTwoWorkspaces();
    await sql.query("update public.memberships set active = false where user_id = $1", [victimMember.id]);
    await signInAs(attacker.owner.id);

    const outcome = await callAction(reactivateMembership, {
      tenant_id: attacker.tenant.id,
      user_id: victimMember.id,
    });

    expect(outcome.redirectedTo).toContain("error=");
    expect(await victimMemberState(victimMember.id)).toEqual({ role: "teacher", active: false });
  });

  it("refuses transferring ownership to a member of another workspace", async () => {
    const { victimMember, attacker } = await seedTwoWorkspaces();
    await signInAs(attacker.owner.id);

    const outcome = await callAction(transferOwnership, {
      tenant_id: attacker.tenant.id,
      target_user_id: victimMember.id,
      confirm_email: "",
    });

    expect(outcome.redirectedTo).toContain("error=");
    expect(await victimMemberState(victimMember.id)).toEqual({ role: "teacher", active: true });
  });

  it("refuses an invitation that names ownership as the role", async () => {
    const { attacker } = await seedTwoWorkspaces();
    await signInAs(attacker.owner.id);

    // الملكية لا تُمنح بدعوة لأي دور، ولا حتى من المالك: لها مسارها المستقل
    // (`transferOwnership`) لأنها تغيّر من يملك المساحة لا من يعمل فيها.
    const outcome = await callAction(createInvitation, {
      tenant_id: attacker.tenant.id,
      email: "escalate@example.test",
      role: "owner",
    });

    expect(outcome.redirectedTo).toContain("error=");
    const escalated = await sql.query<{ n: number }>(
      "select count(*)::int as n from public.invitations where invitee_email = 'escalate@example.test'",
    );
    expect(escalated.rows[0]?.n).toBe(0);
  });
});

describe("platform-scoped actions are unreachable from a tenant identity", () => {
  /** المنصة لا تُمنح بالعضوية: تحتاج صفًا في `platform_admins`. */
  async function seedTenantOwner() {
    const fixture = await createTenantWithOwner(sql, { tenantName: "Not Platform" });
    await signInAs(fixture.owner.id);
    return fixture;
  }

  it("refuses changing a tenant's status", async () => {
    const fixture = await seedTenantOwner();
    await expect(callAction(setTenantStatus, { tenantId: fixture.tenant.id, nextStatus: "suspended" })).resolves.toMatchObject({
      threw: true,
    });

    const status = await sql.query<{ status: string }>("select status::text as status from public.tenants where id = $1", [
      fixture.tenant.id,
    ]);
    expect(status.rows[0]?.status).toBe("active");
  });

  it("refuses approving another account's password reset", async () => {
    const fixture = await seedTenantOwner();
    const request = await sql.query<{ id: string }>(
      `insert into public.password_reset_requests (user_id, requested_email, whatsapp_phone)
       values ($1, 'victim@example.test', '+201000000000') returning id`,
      [fixture.owner.id],
    );
    const requestId = request.rows[0]!.id;

    await expect(callAction(approvePasswordReset, { requestId })).resolves.toMatchObject({ threw: true });

    const state = await sql.query<{ status: string }>(
      "select status::text as status from public.password_reset_requests where id = $1",
      [requestId],
    );
    expect(state.rows[0]?.status).toBe("pending");
  });

  it("refuses rejecting another account's password reset", async () => {
    const fixture = await seedTenantOwner();
    const request = await sql.query<{ id: string }>(
      `insert into public.password_reset_requests (user_id, requested_email, whatsapp_phone)
       values ($1, 'victim@example.test', '+201000000000') returning id`,
      [fixture.owner.id],
    );
    const requestId = request.rows[0]!.id;

    await expect(callAction(rejectPasswordReset, { requestId })).resolves.toMatchObject({ threw: true });

    const state = await sql.query<{ status: string }>(
      "select status::text as status from public.password_reset_requests where id = $1",
      [requestId],
    );
    expect(state.rows[0]?.status).toBe("pending");
  });

  it("refuses approving a workspace request", async () => {
    const fixture = await seedTenantOwner();
    const request = await sql.query<{ id: string }>(
      `insert into public.workspace_requests
         (user_id, email, tenant_type, requested_product_level, workspace_name, slug, whatsapp_phone)
       values ($1, 'applicant@example.test', 'center', 'operations', 'Sneaky Workspace', 'sneaky-workspace', '+201000000000')
       returning id`,
      [fixture.owner.id],
    );
    const requestId = request.rows[0]!.id;

    await expect(approveWorkspaceRequest(requestId)).rejects.toThrow();

    const state = await sql.query<{ status: string }>(
      "select status::text as status from public.workspace_requests where id = $1",
      [requestId],
    );
    expect(state.rows[0]?.status).toBe("pending_approval");
  });

  it("refuses rejecting a workspace request", async () => {
    const fixture = await seedTenantOwner();
    const request = await sql.query<{ id: string }>(
      `insert into public.workspace_requests
         (user_id, email, tenant_type, requested_product_level, workspace_name, slug, whatsapp_phone)
       values ($1, 'applicant@example.test', 'center', 'operations', 'Sneaky Workspace', 'sneaky-workspace', '+201000000000')
       returning id`,
      [fixture.owner.id],
    );
    const requestId = request.rows[0]!.id;

    const reason = new FormData();
    reason.set("reason", "سبب كافٍ للرفض");
    await expect(rejectWorkspaceRequest(requestId, reason)).rejects.toThrow();

    const state = await sql.query<{ status: string }>(
      "select status::text as status from public.workspace_requests where id = $1",
      [requestId],
    );
    expect(state.rows[0]?.status).toBe("pending_approval");
  });
});

describe("without a session nothing is reachable", () => {
  it("refuses tenant actions when no session is presented", async () => {
    const { victim } = await seedTwoWorkspaces();
    resetCookieState();

    const outcomes = await Promise.all([
      callAction(createInvitation, { tenant_id: victim.tenant.id, email: "x@example.test", role: "teacher" }),
      callAction(revokeInvitation, { tenant_id: victim.tenant.id, invitation_id: victim.owner.id }),
      callAction(deactivateMembership, { tenant_id: victim.tenant.id, user_id: victim.owner.id }),
      callAction(transferOwnership, { tenant_id: victim.tenant.id, target_user_id: victim.owner.id, confirm_email: "" }),
    ]);

    for (const outcome of outcomes) {
      // الرفض المقبول هنا: رسالة خطأ، أو رمي صريح. النجاح غير مقبول بأي صورة،
      // وكل ما يهم أن لا يكون قد وقع تغيير فعلي.
      const refusal = outcome.threw || (outcome.redirectedTo ?? "").includes("error=");
      expect(refusal).toBe(true);
      expect(outcome.redirectedTo ?? "").not.toContain("success=");
    }
    expect(await victimMemberState(victim.owner.id)).toEqual({ role: "owner", active: true });
  });
});

describe("capabilities are scoped to the workspace that actually holds the membership", () => {
  it("refuses a capability requested against a workspace the actor does not belong to", async () => {
    const { victim, attacker } = await seedTwoWorkspaces();
    await signInAs(attacker.owner.id);

    // المالك في مساحته، ولا عضوية له في الأخرى: العضوية تُحلّ على المساحة المطلوبة
    // لا على أي عضوية أخرى لصاحب الجلسة.
    const { requirePostgresTenantCapability } = await import("@/lib/auth/postgres-team");
    await expect(
      requirePostgresTenantCapability(victim.tenant.id, "team.manage", async () => "reached"),
    ).rejects.toThrow();
    await expect(
      requirePostgresTenantCapability(attacker.tenant.id, "team.manage", async () => "reached"),
    ).resolves.toBe("reached");
  });

  it("keeps each workspace's rows out of the other's team listing", async () => {
    const { victim, victimMember, attacker } = await seedTwoWorkspaces();
    await signInAs(attacker.owner.id);

    // الفلتر في DAL هو الخط الأول، وRLS هو الثاني (مُختبرة بدور التطبيق في
    // `row-level-security.integration.test.ts`). وهنا يُثبت أن فلتر المساحة نفسه
    // لا يعبر إلى مساحة أخرى حتى في مسار مشروع تمامًا.
    const { requirePostgresTenantCapability } = await import("@/lib/auth/postgres-team");
    const { listTenantMembers } = await import("@/lib/auth/tenant-ownership");

    const members = await requirePostgresTenantCapability(attacker.tenant.id, "team.read", (context) =>
      listTenantMembers(context.sql, attacker.tenant.id),
    );
    const ids = members.map((member) => member.userId);
    expect(ids).toContain(attacker.owner.id);
    expect(ids).not.toContain(victimMember.id);
    expect(ids).not.toContain(victim.owner.id);
  });
});

describe("public API routes expose no tenant or account data", () => {
  it("keeps the health route to availability only", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    // المسار بلا هوية ولا معرّف مساحة: لا يقبل مدخلًا أصلًا، ولا يعيد إلا الحالة.
    expect(Object.keys(body).sort()).toEqual(["backend", "database", "ok"]);
    expect(JSON.stringify(body)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);
  });

  it("keeps the readiness route to availability only", async () => {
    const { GET } = await import("@/app/api/readiness/route");
    const response = await GET();
    const body = await response.json();

    expect(Object.keys(body).sort()).toEqual(["backend", "database", "ok", "schema"]);
    expect(JSON.stringify(body)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);
  });

  it("does not accept a workspace identifier on either route", async () => {
    // التوقيع نفسه لا يستقبل طلبًا، فلا مدخل يمكن التلاعب به لعبور مساحة.
    const health = (await import("@/app/api/health/route")).GET;
    const readiness = (await import("@/app/api/readiness/route")).GET;
    expect(health.length).toBe(0);
    expect(readiness.length).toBe(0);
  });
});
