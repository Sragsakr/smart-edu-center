import "server-only";

import type { CurrentUserProvider } from "@/lib/auth/current-user-provider";
import { withSessionUser } from "@/lib/auth/session-context";

/**
 * يقرأ المستخدم الحالي من الجلسة.
 *
 * يفتح سياقه بنفسه لأن قراءة `app_users` صارت خاضعة لـRLS وتحتاج بصمة جلسة.
 * لا يحتفظ بأي `SqlExecutor` لأنه لا يجوز تشغيل استعلام على جدول محمي خارج سياق.
 */
export class PostgresCurrentUserProvider implements CurrentUserProvider {
  async getCurrentUser() {
    return withSessionUser(async ({ user }) => user);
  }
}
