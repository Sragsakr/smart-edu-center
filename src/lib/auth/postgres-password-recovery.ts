import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { hashPassword } from "@/lib/auth/password";
import type { SqlExecutor } from "@/lib/database/sql-executor";

type PasswordResetRow = {
  id: string;
  user_id: string;
  requested_email: string;
  whatsapp_phone: string;
  code_hash: Buffer | null;
  code_expires_at: string | null;
  failed_attempts: number;
  status: string;
};

type ApprovedReset = { recoveryCode: string; whatsappPhone: string };

function recoveryCodeDigest(code: string): Buffer {
  return createHash("sha256").update(code).digest();
}

function generateRecoveryCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function requestPostgresPasswordReset(
  sql: SqlExecutor,
  email: string,
): Promise<void> {
  const account = await sql.query<{ id: string; email: string; whatsapp_phone: string }>(
    `select u.id, u.email, request.whatsapp_phone
     from public.app_users u
     join public.workspace_requests request on request.user_id = u.id
       and request.status = 'approved'
       and request.whatsapp_phone is not null
     join public.memberships membership on membership.user_id = u.id
       and membership.active = true
     where lower(u.email) = lower($1)
     limit 1`,
    [email],
  );
  const user = account.rows[0];
  if (!user) return;

  const recent = await sql.query(
    `select 1 from public.password_reset_requests
     where user_id = $1 and created_at > now() - interval '60 seconds'
     limit 1`,
    [user.id],
  );
  if (recent.rows.length > 0) return;

  await sql.query(
    `update public.password_reset_requests
     set status = 'expired'
     where user_id = $1 and status in ('pending', 'code_ready')`,
    [user.id],
  );
  await sql.query(
    `insert into public.password_reset_requests (user_id, requested_email, whatsapp_phone)
     values ($1, $2, $3)`,
    [user.id, user.email, user.whatsapp_phone],
  );
}

export async function approvePostgresPasswordReset(
  sql: SqlExecutor,
  requestId: string,
  reviewerId: string,
): Promise<ApprovedReset> {
  const recoveryCode = generateRecoveryCode();
  return (async (transaction: SqlExecutor) => {
    const request = await lockPendingReset(transaction, requestId);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await transaction.query(
      `update public.password_reset_requests
       set status = 'code_ready', code_hash = $1, code_expires_at = $2,
           reviewed_by = $3, reviewed_at = now()
       where id = $4`,
      [recoveryCodeDigest(recoveryCode), expiresAt, reviewerId, request.id],
    );
    await recordPasswordResetAudit(transaction, reviewerId, "password_reset.approved", request);
    return { recoveryCode, whatsappPhone: request.whatsapp_phone };
  })(sql)
}

async function lockPendingReset(
  sql: SqlExecutor,
  requestId: string,
): Promise<PasswordResetRow> {
  const result = await sql.query<PasswordResetRow>(
    `select id, user_id, requested_email, whatsapp_phone, code_hash,
            code_expires_at, failed_attempts, status
     from public.password_reset_requests
     where id = $1
     for update`,
    [requestId],
  );
  const request = result.rows[0];
  if (!request || request.status !== "pending") {
    throw new Error("password reset request is no longer pending");
  }
  return request;
}

export async function rejectPostgresPasswordReset(
  sql: SqlExecutor,
  requestId: string,
  reviewerId: string,
): Promise<void> {
  const result = await sql.query(
    `update public.password_reset_requests
     set status = 'rejected', reviewed_by = $1, reviewed_at = now()
     where id = $2 and status = 'pending'`,
    [reviewerId, requestId],
  );
  if (result.rowCount !== 1) throw new Error("password reset request is no longer pending");
  await sql.query(
    `insert into public.platform_audit_logs
       (actor_user_id, action, entity_type, entity_id, details)
     values ($1, 'password_reset.rejected', 'password_reset_request', $2, $3::jsonb)`,
    [reviewerId, requestId, JSON.stringify({ reviewerId })],
  );
}

async function recordPasswordResetAudit(
  sql: SqlExecutor,
  reviewerId: string,
  action: string,
  request: PasswordResetRow,
): Promise<void> {
  await sql.query(
    `insert into public.platform_audit_logs
       (actor_user_id, action, entity_type, entity_id, details)
     values ($1, $2, 'password_reset_request', $3, $4::jsonb)`,
    [reviewerId, action, request.id, JSON.stringify({ applicantUserId: request.user_id })],
  );
}

export async function consumePostgresPasswordReset(
  sql: SqlExecutor,
  email: string,
  recoveryCode: string,
  password: string,
): Promise<boolean> {
  const passwordDigest = await hashPassword(password);
  return (async (transaction: SqlExecutor) => {
    const request = await findLatestReset(transaction, email);
    if (!request) return false;
    if (!isValidRecoveryCode(request, recoveryCode)) {
      await recordFailedRecoveryAttempt(transaction, request);
      return false;
    }
    await transaction.query(
      `update public.auth_password_credentials
       set password_digest = $1, password_changed_at = now()
       where user_id = $2`,
      [passwordDigest, request.user_id],
    );
    await transaction.query(
      `update public.password_reset_requests
       set status = 'consumed', consumed_at = now()
       where id = $1`,
      [request.id],
    );
    await transaction.query(
      `update public.auth_sessions set revoked_at = now()
       where user_id = $1 and revoked_at is null`,
      [request.user_id],
    );
    return true;
  })(sql)
}

async function recordFailedRecoveryAttempt(
  sql: SqlExecutor,
  request: PasswordResetRow,
): Promise<void> {
  await sql.query(
    `update public.password_reset_requests
     set failed_attempts = failed_attempts + 1,
         status = case when failed_attempts + 1 >= 5 then 'expired' else status end
     where id = $1 and status = 'code_ready'`,
    [request.id],
  );
}

async function findLatestReset(
  sql: SqlExecutor,
  email: string,
): Promise<PasswordResetRow | null> {
  const result = await sql.query<PasswordResetRow>(
    `select id, user_id, requested_email, whatsapp_phone, code_hash,
            code_expires_at, failed_attempts, status
     from public.password_reset_requests
     where lower(requested_email) = lower($1)
       and status = 'code_ready'
     order by created_at desc
     limit 1
     for update`,
    [email],
  );
  return result.rows[0] ?? null;
}

function isValidRecoveryCode(request: PasswordResetRow, code: string): boolean {
  if (!request.code_hash || !request.code_expires_at || new Date(request.code_expires_at) <= new Date()) return false;
  const digest = recoveryCodeDigest(code.trim().toUpperCase());
  return digest.length === request.code_hash.length && timingSafeEqual(digest, request.code_hash);
}
