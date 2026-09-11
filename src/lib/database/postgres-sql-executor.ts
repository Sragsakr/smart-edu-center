import "server-only";

import { Pool, type PoolClient } from "pg";

import type {
  AccessScopedSqlExecutor,
  SqlExecutor,
  SqlQueryResult,
  SqlRow,
  TransactionalSqlExecutor,
} from "@/lib/database/sql-executor";

type QueryResult = {
  rows: unknown[];
  rowCount: number | null;
};

type QueryFunction = (
  text: string,
  values: unknown[],
) => Promise<QueryResult>;

async function executeQuery<Row extends SqlRow>(
  query: QueryFunction,
  text: string,
  values: readonly unknown[] = [],
): Promise<SqlQueryResult<Row>> {
  const result = await query(text, [...values]);

  return {
    rows: result.rows as Row[],
    rowCount: result.rowCount ?? result.rows.length,
  };
}

/** يضبط إعدادًا محليًا للمعاملة. القيمة `true` تعني `LOCAL`: تُصفَّر مع نهاية المعاملة. */
async function setLocalSetting(client: PoolClient, name: string, value: string): Promise<void> {
  await client.query("select set_config($1, $2, true)", [name, value]);
}

function expiredContextError(): Error {
  return new Error(
    "access context expired: the transaction already ended, so LOCAL settings are cleared. " +
      "Run the read inside the same callback that opened the context instead of reusing the returned executor.",
  );
}

/**
 * مُنفّذ مربوط بمعاملة واحدة.
 *
 * **يفشل بصوت عالٍ بعد انتهاء المعاملة.** السبب: الإعدادات `LOCAL` تُصفَّر مع نهاية
 * المعاملة، فأي استعلام لاحق يعمل بلا سياق ويرجع **صفر صفوف بدل خطأ** — وهو أسوأ
 * أنواع العلل لأنه صامت. القيمة `isConsumed` تُغلق المُنفّذ عند الـcommit أو الـrollback.
 *
 * المرجع: docs/adr/0007.
 */
function queryAdapter(
  client: PoolClient,
  isConsumed: () => boolean = () => false,
): SqlExecutor & {
  query: <Row extends SqlRow = SqlRow>(text: string, values?: readonly unknown[]) => Promise<SqlQueryResult<Row>>;
} {
  return {
    query: async <Row extends SqlRow = SqlRow>(text: string, values: readonly unknown[] = []) => {
      if (isConsumed()) throw expiredContextError();
      return executeQuery<Row>((queryText, queryValues) => client.query(queryText, queryValues), text, values);
    },
  };
}

/** مُنفّذ مقيد بالسياق: يسمح بتعديل نطاق المساحة إضافة إلى الاستعلام. */
function accessScopedExecutor(client: PoolClient, isConsumed: () => boolean): AccessScopedSqlExecutor {
  const base = queryAdapter(client, isConsumed);
  const assertLive = () => {
    if (isConsumed()) throw expiredContextError();
  };
  return {
    query: base.query,
    enterTenantScope: async (tenantId: string) => {
      assertLive();
      await setLocalSetting(client, "app.current_tenant_id", tenantId);
    },
    leaveTenantScope: async () => {
      assertLive();
      await setLocalSetting(client, "app.current_tenant_id", "");
    },
    enterPlatformScope: async () => {
      assertLive();
      await setLocalSetting(client, "app.platform_scope", "on");
    },
    leavePlatformScope: async () => {
      assertLive();
      await setLocalSetting(client, "app.platform_scope", "");
    },
  };
}

async function rollbackAndThrow(
  client: PoolClient,
  operationError: unknown,
): Promise<never> {
  try {
    await client.query("ROLLBACK");
  } catch (rollbackError) {
    throw new AggregateError(
      [operationError, rollbackError],
      "PostgreSQL transaction and rollback both failed",
    );
  }
  throw operationError;
}

export class PostgresSqlExecutor implements TransactionalSqlExecutor {
  constructor(private readonly pool: Pool) {}

  query<Row extends SqlRow = SqlRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<SqlQueryResult<Row>> {
    return executeQuery<Row>(
      (queryText, queryValues) => this.pool.query(queryText, queryValues),
      text,
      values,
    );
  }

  async transaction<Result>(
    operation: (sql: SqlExecutor) => Promise<Result>,
  ): Promise<Result> {
    const client = await this.pool.connect();
    let consumed = false;

    try {
      await client.query("BEGIN");
      // نفس حارس `runScoped`: إعدادات المعاملة تُصفَّر مع نهايتها، فاستخدام
      // المُنفّذ بعدها يجب أن يفشل صراحةً لا أن يرجع صفر صفوف.
      const result = await operation(queryAdapter(client, () => consumed));
      await client.query("COMMIT");
      consumed = true;
      return result;
    } catch (operationError) {
      consumed = true;
      return rollbackAndThrow(client, operationError);
    } finally {
      client.release();
    }
  }

  async withSession<Result>(
    sessionDigest: string,
    operation: (sql: AccessScopedSqlExecutor) => Promise<Result>,
  ): Promise<Result> {
    if (!sessionDigest) throw new Error("withSession requires a session digest");
    return this.runScoped(async (client, scoped) => {
      // بصمة الجلسة أولًا: منها تشتق قاعدة البيانات الهوية عبر دالة `security definer`،
      // فتقرأ الهوية صفّها ثم تُحل علاقتها ثم تُضبط مساحتها — كل ذلك في معاملة واحدة.
      await setLocalSetting(client, "app.session_digest", sessionDigest);
      await client.query(
        "select set_config('app.app_user_id', coalesce(private.session_user_id($1)::text, ''), true)",
        [sessionDigest],
      );
      return operation(scoped);
    });
  }

  async withoutSession<Result>(
    operation: (sql: AccessScopedSqlExecutor) => Promise<Result>,
  ): Promise<Result> {
    return this.runScoped(async (_client, scoped) => operation(scoped));
  }

  private async runScoped<Result>(
    operation: (client: PoolClient, scoped: AccessScopedSqlExecutor) => Promise<Result>,
  ): Promise<Result> {
    const client = await this.pool.connect();
    let consumed = false;
    try {
      await client.query("BEGIN");
      const result = await operation(client, accessScopedExecutor(client, () => consumed));
      await client.query("COMMIT");
      // الإغلاق بعد الـcommit تحديدًا: من يستخدم المُنفّذ لاحقًا يرى خطأ صريحًا
      // بدل صفر صفوف صامتة.
      consumed = true;
      return result;
    } catch (operationError) {
      consumed = true;
      return rollbackAndThrow(client, operationError);
    } finally {
      // كل ما ضُبط كان `LOCAL`، فتصرّف القيم مع نهاية المعاملة ولا تُعاد أي حالة
      // محمّلة مع الاتصال إلى الـpool.
      client.release();
    }
  }
}

let sharedPool: Pool | null = null;
let sharedDatabaseUrl: string | null = null;

export function postgresSqlExecutor(databaseUrl: string): TransactionalSqlExecutor {
  if (!sharedPool || sharedDatabaseUrl !== databaseUrl) {
    sharedPool = new Pool({ connectionString: databaseUrl });
    sharedDatabaseUrl = databaseUrl;
  }

  return new PostgresSqlExecutor(sharedPool);
}
