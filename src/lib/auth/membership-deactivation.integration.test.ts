import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// الإجراءات تستدعي `revalidatePath`، وهي بلا معنى خارج دورة الطلب.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { resetCookieState } from "@/test/postgres/test-cookies";
import { testSqlExecutor, truncateAllTenantData } from "@/test/postgres/test-database";
import { addMembership, createTenantWithOwner, createUser, grantEntitlements } from "@/test/postgres/fixtures";
import { createPostgresSession } from "@/lib/auth/postgres-auth";
import { getPostgresTeamWorkspaceData, requirePostgresTenantCapability } from "@/lib/auth/postgres-team";
import { requireTenantCapability } from "@/lib/authorization/server";
import { transferOwnership } from "@/app/team/ownership-actions";

/**
 * أثر تعطيل العضوية فورًا.
 *
 * العقد المطلوب: تعطيل `membership` يمنع الإجراءات الحساسة في تلك المساحة **من
 * اللحظة نفسها**، دون أن يمسّ عضوية الهوية نفسها في مساحات أخرى.
 *
 * والعقد يُختبر على حدّ الإجراء نفسه لا على الواجهة، لأن إخفاء الزر ليس حدًّا أمنيًا:
 * من يملك جلسة صالحة يستطيع إرسال الطلب مباشرة وتجاوز الصفحة التي تحجبه.
 */

const sql = testSqlExecutor();

beforeEach(() => {
  resetCookieState();
});

afterEach(async () => {
  await truncateAllTenantData();
});

type ActionOutcome = { redirectedTo: string | null };

/** يستدعي Server Action ويقرأ وجهته بدل أن يستسلم لخطأ `NEXT_REDIRECT`. */
async function callAction(
  action: (formData: FormData) => Promise<unknown>,
  fields: Record<string, string>,
): Promise<ActionOutcome> {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  try {
    await action(formData);
    return { redirectedTo: null };
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    const match = digest.match(/^NEXT_REDIRECT;[a-z]+;([^;]+);/);
    if (!match?.[1]) throw error;
    return { redirectedTo: decodeURIComponent(match[1]) };
  }
}

async function signInAs(userId: string): Promise<void> {
  resetCookieState();
  await createPostgresSession(sql, userId);
}

/**
 * مساحة بمالكين اثنين وعضو عادي.
 *
 * مالكان لأن تعطيل آخر مالك ممنوع بحماية الملكية (`P02-07`)، فالاختبار يحتاج مالكًا
 * يمكن تعطيله فعلًا ليقيس أثر التعطيل بدل أن يقياس حماية أخرى.
 */
async function seedWorkspace(name: string, productLevel: "management_platform" = "management_platform") {
  const { tenant, owner } = await createTenantWithOwner(sql, { tenantName: name, productLevel });
  await grantEntitlements(sql, tenant.id, productLevel);
  const secondOwner = await createUser(sql);
  await addMembership(sql, tenant.id, secondOwner.id, "owner");
  const member = await createUser(sql);
  await addMembership(sql, tenant.id, member.id, "teacher");
  return { tenant, owner, secondOwner, member };
}

async function setMembershipActive(tenantId: string, userId: string, active: boolean): Promise<void> {
  await sql.query("update public.memberships set active = $1 where tenant_id = $2 and user_id = $3", [
    active,
    tenantId,
    userId,
  ]);
}

describe("a deactivated membership blocks sensitive actions immediately", () => {
  it("refuses an ownership transfer started by a deactivated owner and changes nothing", async () => {
    const fixture = await seedWorkspace("Deactivated Owner");
    await setMembershipActive(fixture.tenant.id, fixture.owner.id, false);
    await signInAs(fixture.owner.id);

    const outcome = await callAction(transferOwnership, {
      tenant_id: fixture.tenant.id,
      target_user_id: fixture.member.id,
      confirm_email: fixture.member.email,
    });

    expect(outcome.redirectedTo).toContain("error=");
    expect(outcome.redirectedTo).not.toContain("success=");

    // الملكية لم تنتقل: المنقول إليه بقي مدرسًا، والفاعل بقي بدوره وتعطيله كما هو.
    const rows = await sql.query<{ user_id: string; role: string; active: boolean }>(
      "select user_id, role::text as role, active from public.memberships where tenant_id = $1",
      [fixture.tenant.id],
    );
    const roleOf = (userId: string) => rows.rows.find((row) => row.user_id === userId)?.role;
    expect(roleOf(fixture.member.id)).toBe("teacher");
    expect(roleOf(fixture.owner.id)).toBe("owner");
    expect(rows.rows.find((row) => row.user_id === fixture.owner.id)?.active).toBe(false);
  });

  it("still lets an active owner transfer ownership, so the refusal above follows from the state and not from the fixture", async () => {
    const fixture = await seedWorkspace("Active Owner");
    await signInAs(fixture.owner.id);

    const outcome = await callAction(transferOwnership, {
      tenant_id: fixture.tenant.id,
      target_user_id: fixture.member.id,
      confirm_email: fixture.member.email,
    });

    expect(outcome.redirectedTo).toContain("success=");
    const rows = await sql.query<{ user_id: string; role: string }>(
      "select user_id, role::text as role from public.memberships where tenant_id = $1",
      [fixture.tenant.id],
    );
    const roleOf = (userId: string) => rows.rows.find((row) => row.user_id === userId)?.role;
    expect(roleOf(fixture.member.id)).toBe("owner");
    expect(roleOf(fixture.owner.id)).toBe("admin");
  });

  it("refuses team and operational capabilities once the membership is deactivated", async () => {
    const fixture = await seedWorkspace("Capabilities");
    await setMembershipActive(fixture.tenant.id, fixture.owner.id, false);
    await signInAs(fixture.owner.id);

    for (const capability of ["team.manage", "team.read", "invitations.create"] as const) {
      await expect(
        requirePostgresTenantCapability(fixture.tenant.id, capability, async () => "reached"),
      ).rejects.toThrow();
    }
    for (const capability of ["students.read", "payments.record", "attendance.mark"] as const) {
      await expect(requireTenantCapability(fixture.tenant.id, capability, async () => "reached")).rejects.toThrow();
    }
  });

  it("stops offering the workspace once the membership is deactivated", async () => {
    const fixture = await seedWorkspace("Hidden Workspace");
    await signInAs(fixture.owner.id);
    expect(await getPostgresTeamWorkspaceData(fixture.tenant.id)).not.toBeNull();

    await setMembershipActive(fixture.tenant.id, fixture.owner.id, false);

    expect(await getPostgresTeamWorkspaceData(fixture.tenant.id)).toBeNull();
  });

  it("applies on the very next call and lifts again on reactivation", async () => {
    const fixture = await seedWorkspace("Immediate");
    await signInAs(fixture.owner.id);

    const allowed = () => requirePostgresTenantCapability(fixture.tenant.id, "team.manage", async () => "allowed");
    await expect(allowed()).resolves.toBe("allowed");

    await setMembershipActive(fixture.tenant.id, fixture.owner.id, false);
    await expect(allowed()).rejects.toThrow();

    await setMembershipActive(fixture.tenant.id, fixture.owner.id, true);
    await expect(allowed()).resolves.toBe("allowed");
  });
});

describe("deactivating in one workspace leaves other workspaces untouched", () => {
  /** نفس الهوية عضو في مساحتين: مالك في الأولى، وبالدور المطلوب في الثانية. */
  async function seedSharedIdentity(roleInSecond: "admin" | "accountant") {
    const alpha = await seedWorkspace("Shared Alpha");
    const beta = await seedWorkspace("Shared Beta");
    await addMembership(sql, beta.tenant.id, alpha.owner.id, roleInSecond);
    await signInAs(alpha.owner.id);
    return { alpha, beta };
  }

  it("keeps the same identity fully working in another workspace", async () => {
    const { alpha, beta } = await seedSharedIdentity("admin");
    await setMembershipActive(alpha.tenant.id, alpha.owner.id, false);

    // alpha مرفوضة…
    await expect(
      requirePostgresTenantCapability(alpha.tenant.id, "team.manage", async () => "reached"),
    ).rejects.toThrow();

    // …و beta تعمل بدورها وصلاحياتها كما هي.
    const betaContext = await requirePostgresTenantCapability(beta.tenant.id, "invitations.create", async (context) => context);
    expect(betaContext.role).toBe("admin");
    expect(betaContext.userId).toBe(alpha.owner.id);

    const betaWorkspace = await getPostgresTeamWorkspaceData(beta.tenant.id);
    expect(betaWorkspace?.role).toBe("admin");
    expect(betaWorkspace?.workspaces.map((workspace) => workspace.tenant_id)).toEqual([beta.tenant.id]);
  });

  it("does not touch the other workspace's membership rows", async () => {
    const { alpha, beta } = await seedSharedIdentity("accountant");
    await setMembershipActive(alpha.tenant.id, alpha.owner.id, false);

    const betaRow = await sql.query<{ role: string; active: boolean }>(
      "select role::text as role, active from public.memberships where tenant_id = $1 and user_id = $2",
      [beta.tenant.id, alpha.owner.id],
    );
    expect(betaRow.rows[0]).toEqual({ role: "accountant", active: true });

    // وتعطيل صف واحد لا يمسّ بقية أعضاء المساحة نفسها.
    const alphaOther = await sql.query<{ active: boolean }>(
      "select active from public.memberships where tenant_id = $1 and user_id = $2",
      [alpha.tenant.id, alpha.owner.id],
    );
    expect(alphaOther.rows[0]?.active).toBe(false);
  });

  it("keeps the identity signed in, because a session belongs to the account and not to a membership", async () => {
    const { alpha, beta } = await seedSharedIdentity("admin");
    await setMembershipActive(alpha.tenant.id, alpha.owner.id, false);

    const active = await sql.query<{ n: number }>(
      "select count(*)::int as n from public.auth_sessions where user_id = $1 and revoked_at is null",
      [alpha.owner.id],
    );
    expect(active.rows[0]?.n).toBe(1);

    // الهوية ما زالت تُحلّ من الجلسة نفسها، فما مُنع هو نطاق المساحة لا الحساب.
    const context = await requirePostgresTenantCapability(beta.tenant.id, "team.read", async (c) => c);
    expect(context.userId).toBe(alpha.owner.id);
  });

  it("falls back to the workspace that still works when the deactivated one is requested explicitly", async () => {
    const { alpha, beta } = await seedSharedIdentity("admin");
    await setMembershipActive(alpha.tenant.id, alpha.owner.id, false);

    const workspace = await getPostgresTeamWorkspaceData(alpha.tenant.id);
    expect(workspace?.tenant.id).toBe(beta.tenant.id);
    expect(workspace?.role).toBe("admin");
  });
});
