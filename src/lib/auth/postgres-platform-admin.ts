import "server-only";

import { withPlatformScope } from "@/lib/auth/session-context";
import type { AccessScopedSqlExecutor } from "@/lib/database/sql-executor";

/**
 * بوابة Control Plane: لا تُمنح إلا بعد إثبات أن المستخدم في `platform_admins`.
 *
 * نطاق المنصة يُفتح هنا وحده، وهو ما يسمح بعبور المساحات في `/platform-admin`.
 * المرجع: docs/adr/0007.
 */
export async function requirePostgresPlatformAdmin(): Promise<{
  sql: AccessScopedSqlExecutor;
  user: { id: string; email: string };
}> {
  const outcome = await withPlatformScope(async ({ sql, user }) => ({ sql, user }));
  if (outcome.status === "unauthenticated") throw new Error("Unauthenticated");
  if (outcome.status === "forbidden") throw new Error("Forbidden");
  return outcome.value;
}
