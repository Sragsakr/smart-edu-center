import { describe, expect, it } from "vitest";

import { testSqlExecutor } from "@/test/postgres/test-database";
import { isDatabaseReady } from "./database-readiness";

const sql = testSqlExecutor();

describe("database readiness", () => {
  it("reports the canonical baseline as ready", async () => {
    await expect(isDatabaseReady(sql)).resolves.toBe(true);
  });

  it("reports an incomplete schema when a canonical relation is absent", async () => {
    const rollback = new Error("rollback readiness schema mutation");

    await expect(sql.transaction(async (transaction) => {
      await transaction.query("drop table public.auth_sessions");
      await expect(isDatabaseReady(transaction)).resolves.toBe(false);
      throw rollback;
    })).rejects.toBe(rollback);

    await expect(isDatabaseReady(sql)).resolves.toBe(true);
  });
});
