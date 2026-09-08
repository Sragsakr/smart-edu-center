import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PostgresSqlExecutor } from "./postgres-sql-executor";

function testPool() {
  const query = vi.fn(async (text: string, values?: unknown[]) => {
    void text;
    void values;
    return { rows: [], rowCount: 0 };
  });
  const client = { query, release: vi.fn() };
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(async (text: string, values?: unknown[]) => {
      void text;
      void values;
      return { rows: [], rowCount: 0 };
    }),
  } as unknown as Pool;

  return { pool, client, query };
}

describe("PostgresSqlExecutor.transaction", () => {
  it("runs all transaction queries on one checked-out client and commits", async () => {
    const { pool, client, query } = testPool();
    const executor = new PostgresSqlExecutor(pool);

    const result = await executor.transaction(async (sql) => {
      await sql.query("select $1::text", ["value"]);
      return "done";
    });

    expect(result).toBe("done");
    expect(query.mock.calls.map(([text]) => text)).toEqual([
      "BEGIN",
      "select $1::text",
      "COMMIT",
    ]);
    expect(query.mock.calls[1]?.[1]).toEqual(["value"]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("rolls back and releases the client when the operation fails", async () => {
    const { pool, client, query } = testPool();
    const executor = new PostgresSqlExecutor(pool);

    await expect(executor.transaction(async () => {
      throw new Error("write failed");
    })).rejects.toThrow("write failed");

    expect(query.mock.calls.map(([text]) => text)).toEqual(["BEGIN", "ROLLBACK"]);
    expect(client.release).toHaveBeenCalledOnce();
  });
});
