import { afterEach, describe, expect, it } from "vitest";
import { resetCookieState } from "@/test/postgres/test-cookies";
import { truncateAllTenantData, testSqlExecutor } from "@/test/postgres/test-database";
import { createTenantWithOwner } from "@/test/postgres/fixtures";
import { verifyPassword } from "@/lib/auth/password";
import { createPostgresSession } from "@/lib/auth/postgres-auth";
import {
  approvePostgresPasswordReset,
  consumePostgresPasswordReset,
  rejectPostgresPasswordReset,
  requestPostgresPasswordReset,
} from "@/lib/auth/postgres-password-recovery";

const sql = testSqlExecutor();

afterEach(async () => {
  await truncateAllTenantData();
  resetCookieState();
});

async function eligibleOwnerWithWorkspaceRequest() {
  const { owner, tenant } = await createTenantWithOwner(sql);
  await sql.query(
    `insert into public.workspace_requests (user_id, email, account_type, workspace_name, slug, mobile_phone, whatsapp_phone, status, reviewed_by, reviewed_at, tenant_id)
     values ($1, $2, 'center', 'Owner Workspace', $3, '+201000000002', '+201000000002', 'approved', $1, now(), $4)`,
    [owner.id, owner.email, `slug-${owner.id.slice(0, 8)}`, tenant.id],
  );
  return owner;
}

async function latestResetRequestId(userId: string) {
  const result = await sql.query<{ id: string }>(
    "select id from public.password_reset_requests where user_id = $1 order by created_at desc limit 1",
    [userId],
  );
  return result.rows[0]!.id;
}

describe("Password recovery flow (real database)", () => {
  it("does not create a request or reveal anything for an unknown email", async () => {
    await requestPostgresPasswordReset(sql, "unknown-nobody@example.test");
    const count = await sql.query("select count(*)::int as count from public.password_reset_requests");
    expect(count.rows[0]?.count).toBe(0);
  });

  it("creates a pending request for an eligible user", async () => {
    const owner = await eligibleOwnerWithWorkspaceRequest();
    await requestPostgresPasswordReset(sql, owner.email);
    const requestId = await latestResetRequestId(owner.id);
    const request = await sql.query<{ status: string }>("select status::text as status from public.password_reset_requests where id = $1", [requestId]);
    expect(request.rows[0]?.status).toBe("pending");
  });

  it("does not create a second request within the rate-limit window", async () => {
    const owner = await eligibleOwnerWithWorkspaceRequest();
    await requestPostgresPasswordReset(sql, owner.email);
    await requestPostgresPasswordReset(sql, owner.email);
    const count = await sql.query<{ count: number }>("select count(*)::int as count from public.password_reset_requests where user_id = $1", [owner.id]);
    expect(count.rows[0]?.count).toBe(1);
  });

  it("approval generates a code, does not store it raw, and consuming it changes the password and revokes sessions", async () => {
    const owner = await eligibleOwnerWithWorkspaceRequest();
    const reviewer = owner;
    await requestPostgresPasswordReset(sql, owner.email);
    const requestId = await latestResetRequestId(owner.id);

    await createPostgresSession(sql, owner.id);
    const activeSessionsBefore = await sql.query("select count(*)::int as count from public.auth_sessions where user_id = $1 and revoked_at is null", [owner.id]);
    expect(activeSessionsBefore.rows[0]?.count).toBe(1);

    const approved = await approvePostgresPasswordReset(sql, requestId, reviewer.id);
    expect(approved.recoveryCode).toMatch(/^[0-9A-F]{8}$/);

    const stored = await sql.query<{ code_hash: Buffer }>("select code_hash from public.password_reset_requests where id = $1", [requestId]);
    expect(stored.rows[0]?.code_hash?.toString("hex")).not.toContain(Buffer.from(approved.recoveryCode).toString("hex"));

    const success = await consumePostgresPasswordReset(sql, owner.email, approved.recoveryCode, "BrandNewPass.1");
    expect(success).toBe(true);

    const credential = await sql.query<{ password_digest: string }>("select password_digest from public.auth_password_credentials where user_id = $1", [owner.id]);
    expect(await verifyPassword("BrandNewPass.1", credential.rows[0]!.password_digest)).toBe(true);

    const activeSessionsAfter = await sql.query("select count(*)::int as count from public.auth_sessions where user_id = $1 and revoked_at is null", [owner.id]);
    expect(activeSessionsAfter.rows[0]?.count).toBe(0);
  });

  it("consuming the same code twice fails the second time (single-use)", async () => {
    const owner = await eligibleOwnerWithWorkspaceRequest();
    await requestPostgresPasswordReset(sql, owner.email);
    const requestId = await latestResetRequestId(owner.id);
    const approved = await approvePostgresPasswordReset(sql, requestId, owner.id);

    await consumePostgresPasswordReset(sql, owner.email, approved.recoveryCode, "FirstUsePass.1");
    const secondAttempt = await consumePostgresPasswordReset(sql, owner.email, approved.recoveryCode, "SecondUsePass.1");
    expect(secondAttempt).toBe(false);
  });

  it("a wrong code increments failed_attempts and five failures expire the request", async () => {
    const owner = await eligibleOwnerWithWorkspaceRequest();
    await requestPostgresPasswordReset(sql, owner.email);
    const requestId = await latestResetRequestId(owner.id);
    await approvePostgresPasswordReset(sql, requestId, owner.id);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await consumePostgresPasswordReset(sql, owner.email, "WRONGCOD", "AttemptPass.1");
      expect(result).toBe(false);
    }

    const request = await sql.query<{ status: string; failed_attempts: number }>(
      "select status::text as status, failed_attempts from public.password_reset_requests where id = $1",
      [requestId],
    );
    expect(request.rows[0]?.status).toBe("expired");
    expect(request.rows[0]?.failed_attempts).toBe(5);
  });

  it("an expired code is rejected even if correct", async () => {
    const owner = await eligibleOwnerWithWorkspaceRequest();
    await requestPostgresPasswordReset(sql, owner.email);
    const requestId = await latestResetRequestId(owner.id);
    const approved = await approvePostgresPasswordReset(sql, requestId, owner.id);
    await sql.query("update public.password_reset_requests set code_expires_at = now() - interval '1 minute' where id = $1", [requestId]);

    const result = await consumePostgresPasswordReset(sql, owner.email, approved.recoveryCode, "TooLatePass.1");
    expect(result).toBe(false);
  });

  it("rejecting a pending request marks it rejected and audits the action", async () => {
    const owner = await eligibleOwnerWithWorkspaceRequest();
    await requestPostgresPasswordReset(sql, owner.email);
    const requestId = await latestResetRequestId(owner.id);

    await rejectPostgresPasswordReset(sql, requestId, owner.id);
    const request = await sql.query<{ status: string }>("select status::text as status from public.password_reset_requests where id = $1", [requestId]);
    expect(request.rows[0]?.status).toBe("rejected");

    const audit = await sql.query("select 1 from public.platform_audit_logs where entity_id = $1 and action = 'password_reset.rejected'", [requestId]);
    expect(audit.rowCount).toBe(1);
  });
});
