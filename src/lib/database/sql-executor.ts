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

export interface TransactionalSqlExecutor extends SqlExecutor {
  transaction<Result>(
    operation: (sql: SqlExecutor) => Promise<Result>,
  ): Promise<Result>;
}
