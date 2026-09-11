import type {
  AccessScopedSqlExecutor,
  TransactionalSqlExecutor,
} from "@/lib/database/sql-executor";

/**
 * تنفيذ وهمي لدور الاتصال في اختبارات الوحدة.
 *
 * محاكاة سلوك `PostgresSqlExecutor` الحقيقي: `withSession` و`withoutSession` تفتحان
 * معاملة وتُمرّران مُنفّذًا موسّعًا. دوال توسيع النطاق لا تفعل شيئًا هنا لأن الوحدة
 * المُختبرة تتحقق من المنطق لا من RLS — وإلزام RLS نفسه يُختبر تكامليًا على قاعدة حقيقية.
 */
export function scopedExecutor<T extends object>(base: T): T & AccessScopedSqlExecutor {
  const target = base as T & Partial<AccessScopedSqlExecutor>;
  target.enterTenantScope ??= async () => {};
  target.leaveTenantScope ??= async () => {};
  target.enterPlatformScope ??= async () => {};
  target.leavePlatformScope ??= async () => {};
  return target as T & AccessScopedSqlExecutor;
}

/**
 * يضيف طرق السياق إلى تمثيل اختباري موجود.
 *
 * `transaction` تبقى لأن بعض الوحدات ما زالت تستخدمها، والثلاث طرق الأخرى تُفوَّض
 * إلى نفس التمثيل حتى تبقى الاستعلامات مرئية للاختبار.
 */
export function withAccessContexts<T extends { transaction: TransactionalSqlExecutor["transaction"] }>(
  double: T,
): T & TransactionalSqlExecutor {
  const target = double as T & Partial<TransactionalSqlExecutor>;
  target.withSession = async (_digest, operation) =>
    operation(scopedExecutor(double as unknown as object) as AccessScopedSqlExecutor);
  target.withoutSession = async (operation) =>
    operation(scopedExecutor(double as unknown as object) as AccessScopedSqlExecutor);
  return target as T & TransactionalSqlExecutor;
}
