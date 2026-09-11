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

describe("expired access context", () => {
  /**
   * الإعدادات `LOCAL` تُصفَّر مع نهاية المعاملة، فاستخدام المُنفّذ بعدها يعمل بلا
   * سياق ويرجع **صفر صفوف** بدل خطأ. هذا أسوأ أنواع العلل لأنه صامت، فالمُنفّذ
   * يرفض ذلك صراحةً بدل أن يُنتج نتيجة مُضلّلة.
   */
  it("refuses a query issued after the transaction ended instead of returning empty rows", async () => {
    const { pool } = testPool();
    const executor = new PostgresSqlExecutor(pool);
    let escaped: { query: (text: string) => Promise<unknown> } | undefined;

    await executor.transaction(async (sql) => {
      escaped = sql as unknown as { query: (text: string) => Promise<unknown> };
      await sql.query("select 1");
    });

    await expect(escaped!.query("select 1")).rejects.toThrow(/access context expired/);
  });

  it("refuses to change the tenant scope after the transaction ended", async () => {
    const { pool } = testPool();
    const executor = new PostgresSqlExecutor(pool);
    let escaped: { enterTenantScope: (tenantId: string) => Promise<void> } | undefined;

    // `withoutSession` يعطي مُنفّذًا يسمح بتعديل النطاق، فيُفحص الحارس عليه.
    await executor.withoutSession(async (scoped) => {
      escaped = scoped as unknown as { enterTenantScope: (tenantId: string) => Promise<void> };
    });

    await expect(escaped!.enterTenantScope("00000000-0000-4000-8000-000000000000")).rejects.toThrow(
      /access context expired/,
    );
  });

  it("also refuses after a rollback, because the settings are cleared either way", async () => {
    const { pool } = testPool();
    const executor = new PostgresSqlExecutor(pool);
    let escaped: { query: (text: string) => Promise<unknown> } | undefined;

    await expect(
      executor.transaction(async (sql) => {
        escaped = sql as unknown as { query: (text: string) => Promise<unknown> };
        throw new Error("write failed");
      }),
    ).rejects.toThrow("write failed");

    await expect(escaped!.query("select 1")).rejects.toThrow(/access context expired/);
  });

  it("keeps working inside the transaction, including after an await gap", async () => {
    const { pool, query } = testPool();
    const executor = new PostgresSqlExecutor(pool);

    await executor.transaction(async (sql) => {
      await sql.query("select 1");
      await new Promise((resolve) => setTimeout(resolve, 10));
      await sql.query("select 2");
    });

    expect(query.mock.calls.map(([text]) => text)).toEqual([
      "BEGIN",
      "select 1",
      "select 2",
      "COMMIT",
    ]);
  });
});
