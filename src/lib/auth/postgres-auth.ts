import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import type { SqlExecutor, TransactionalSqlExecutor } from "@/lib/database/sql-executor";
import { hashPassword, verifyPassword } from "./password";

const SESSION_COOKIE = "saboraty_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type AuthUserRow = { id: string; email: string };
type SessionUserRow = AuthUserRow & { session_id: string };

type PostgresAccountAccess = {
  isPlatformAdmin: boolean;
  hasMembership: boolean;
  requestStatus: string | null;
};

function digestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export async function createPostgresSession(
  sql: SqlExecutor,
  userId: string,
): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sql.query(
    `insert into public.auth_sessions (user_id, token_digest, expires_at)
     values ($1, $2, $3)`,
    [userId, digestToken(token), expiresAt],
  );
  await setSessionCookie(token, expiresAt);
}

export async function clearPostgresSession(sql: SqlExecutor): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await sql.query(
      `update public.auth_sessions
       set revoked_at = now(), last_seen_at = now()
       where token_digest = $1 and revoked_at is null`,
      [digestToken(token)],
    );
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getPostgresCurrentUser(
  sql: SqlExecutor,
): Promise<AuthUserRow | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const result = await sql.query<SessionUserRow>(
    `select s.id as session_id, u.id, u.email
     from public.auth_sessions s
     join public.app_users u on u.id = s.user_id
     where s.token_digest = $1
       and u.active = true
       and s.revoked_at is null
       and s.expires_at > now()
     limit 1`,
    [digestToken(token)],
  );
  const user = result.rows[0];
  if (!user) return null;

  await sql.query(
    `update public.auth_sessions set last_seen_at = now() where id = $1`,
    [user.session_id],
  );
  return { id: user.id, email: user.email };
}

export async function registerPostgresUser(
  sql: TransactionalSqlExecutor,
  email: string,
  password: string,
): Promise<AuthUserRow> {
  const passwordDigest = await hashPassword(password);
  return sql.transaction(async (transaction) => {
    const userResult = await transaction.query<AuthUserRow>(
      `insert into public.app_users (id, email)
       values (gen_random_uuid(), $1)
       returning id, email`,
      [email],
    );
    const user = userResult.rows[0];
    if (!user) throw new Error("user creation failed");
    await transaction.query(
      `insert into public.auth_password_credentials (user_id, password_digest)
       values ($1, $2)`,
      [user.id, passwordDigest],
    );
    return user;
  });
}

export async function authenticatePostgresUser(
  sql: TransactionalSqlExecutor,
  email: string,
  password: string,
): Promise<AuthUserRow | null> {
  const result = await sql.query<AuthUserRow & { password_digest: string }>(
    `select u.id, u.email, c.password_digest
     from public.app_users u
     join public.auth_password_credentials c on c.user_id = u.id
     where lower(u.email) = lower($1)
       and u.active = true
     limit 1`,
    [email],
  );
  const user = result.rows[0];
  if (!user || !(await verifyPassword(password, user.password_digest))) return null;
  return { id: user.id, email: user.email };
}

export async function getPostgresAccountAccess(
  sql: SqlExecutor,
  userId: string,
): Promise<PostgresAccountAccess> {
  const [admin, membership, request] = await Promise.all([
    sql.query(`select 1 from public.platform_admins where user_id = $1 limit 1`, [userId]),
    sql.query(`select 1 from public.memberships where user_id = $1 and active = true limit 1`, [userId]),
    sql.query<{ status: string }>(
      `select status from public.workspace_requests where user_id = $1 limit 1`,
      [userId],
    ),
  ]);
  return {
    isPlatformAdmin: admin.rows.length > 0,
    hasMembership: membership.rows.length > 0,
    requestStatus: request.rows[0]?.status ?? null,
  };
}
