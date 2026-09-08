import "server-only";

import { Pool, type PoolClient } from "pg";

import type {
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

function transactionExecutor(client: PoolClient): SqlExecutor {
  return {
    query: <Row extends SqlRow = SqlRow>(
      text: string,
      values: readonly unknown[] = [],
    ) => executeQuery<Row>(
      (queryText, queryValues) => client.query(queryText, queryValues),
      text,
      values,
    ),
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

    try {
      await client.query("BEGIN");
      const result = await operation(transactionExecutor(client));
      await client.query("COMMIT");
      return result;
    } catch (operationError) {
      return rollbackAndThrow(client, operationError);
    } finally {
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
