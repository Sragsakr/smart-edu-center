import "server-only";

import { Pool } from "pg";

import type {
  SqlExecutor,
  SqlQueryResult,
  SqlRow,
} from "@/lib/database/sql-executor";

export class PostgresSqlExecutor implements SqlExecutor {
  constructor(private readonly pool: Pool) {}

  async query<Row extends SqlRow = SqlRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<SqlQueryResult<Row>> {
    const result = await this.pool.query(text, [...values]);

    return {
      rows: result.rows as Row[],
      rowCount: result.rowCount ?? result.rows.length,
    };
  }
}

let sharedPool: Pool | null = null;
let sharedDatabaseUrl: string | null = null;

export function postgresSqlExecutor(databaseUrl: string): SqlExecutor {
  if (!sharedPool || sharedDatabaseUrl !== databaseUrl) {
    sharedPool = new Pool({ connectionString: databaseUrl });
    sharedDatabaseUrl = databaseUrl;
  }

  return new PostgresSqlExecutor(sharedPool);
}
