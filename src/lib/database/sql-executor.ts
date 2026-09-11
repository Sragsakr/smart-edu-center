import "server-only";

export type SqlRow = Record<string, unknown>;

export type SqlQueryResult<Row extends SqlRow = SqlRow> = {
  rows: Row[];
  rowCount: number;
};

export interface SqlExecutor {
  query<Row extends SqlRow = SqlRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<SqlQueryResult<Row>>;
}

/**
 * معاملة تحمل سياق وصول، وتسمح بتوسيع النطاق داخلها.
 *
 * النطاق يبدأ بصف المستخدم نفسه فقط، ويُوسَّع صراحةً:
 * - `enterTenantScope` بعد حل العلاقة المحمية (عضوية أو طالب أو ولي أمر).
 * - `enterPlatformScope` **بعد** التحقق من `platform_admins` فقط.
 *
 * كل الإعدادات `LOCAL`، فتُصفَّر مع نهاية المعاملة ولا تتسرّب عبر اتصال الـpool.
 * المرجع: docs/adr/0007.
 */
export interface AccessScopedSqlExecutor extends SqlExecutor {
  /** يجعل المساحة النشطة هي `tenantId` داخل المعاملة الحالية. */
  enterTenantScope(tenantId: string): Promise<void>;
  /** يمنح نطاق المنصة داخل المعاملة الحالية — لمسار Control Plane المصرّح به فقط. */
  enterPlatformScope(): Promise<void>;
  /** يسحب نطاق المنصة مع الإبقاء على الهوية والمساحة النشطة. */
  leavePlatformScope(): Promise<void>;
  /** يخرج من المساحة النشطة مع الإبقاء على الهوية. */
  leaveTenantScope(): Promise<void>;
}

export interface TransactionalSqlExecutor extends SqlExecutor {
  transaction<Result>(
    operation: (sql: SqlExecutor) => Promise<Result>,
  ): Promise<Result>;

  /**
   * ينفّذ عملية منطقية كاملة داخل معاملة واحدة تحمل بصمة جلسة موثقة.
   *
   * البصمة هي إثبات الحيازة، ومنها تُشتق الهوية داخل قاعدة البيانات عبر
   * `private.session_user_id`، فلا تُمرَّر هوية يدويًا ولا يمكن تزويرها بوسيط.
   *
   * سياق واحد لكل عملية — لا لكل استعلام — فيتحقق أمران: أن كل استعلام خاضع
   * للسياسات، وأن كل قراءات العملية من لحظة واحدة متسقة.
   */
  withSession<Result>(
    sessionDigest: string,
    operation: (sql: AccessScopedSqlExecutor) => Promise<Result>,
  ): Promise<Result>;

  /**
   * كالسابق لكن بلا جلسة — للمسارات غير الموثقة التي تحتاج تجاوزًا مبررًا
   * مثل التسجيل الجديد وإتمام الدخول.
   */
  withoutSession<Result>(
    operation: (sql: AccessScopedSqlExecutor) => Promise<Result>,
  ): Promise<Result>;
}
