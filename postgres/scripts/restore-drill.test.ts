import { describe, expect, it } from "vitest";

import { RestoreDrillError, assertSafeDrillTarget } from "./restore-drill.mjs";

const DEV = "postgresql://srag@127.0.0.1:5433/saboraty";

describe("restore drill target guard", () => {
  it("accepts a disposable loopback database that differs from the development database", () => {
    const target = assertSafeDrillTarget({
      drillDatabaseUrl: "postgresql://srag@127.0.0.1:5433/saboraty_restore_drill",
      databaseUrl: DEV,
    });
    expect(target.databaseName).toBe("saboraty_restore_drill");
  });

  it("refuses to run without an explicit target instead of guessing one", () => {
    expect(() => assertSafeDrillTarget({ drillDatabaseUrl: undefined, databaseUrl: DEV })).toThrow(RestoreDrillError);
    expect(() => assertSafeDrillTarget({ drillDatabaseUrl: "", databaseUrl: DEV })).toThrow(RestoreDrillError);
  });

  it("refuses to restore over the development database or any reserved name", () => {
    for (const name of ["saboraty", "postgres", "template0", "template1", "SABORATY"]) {
      expect(() =>
        assertSafeDrillTarget({ drillDatabaseUrl: `postgresql://srag@127.0.0.1:5433/${name}`, databaseUrl: DEV }),
      ).toThrow(RestoreDrillError);
    }
  });

  it("refuses a target that matches DATABASE_URL even under a different spelling", () => {
    expect(() => assertSafeDrillTarget({ drillDatabaseUrl: DEV, databaseUrl: DEV })).toThrow(RestoreDrillError);
    expect(() =>
      assertSafeDrillTarget({ drillDatabaseUrl: "postgresql://other@127.0.0.1:5433/saboraty", databaseUrl: DEV }),
    ).toThrow(RestoreDrillError);
  });

  it("refuses a non-loopback host so a drill can never run against a shared environment", () => {
    expect(() =>
      assertSafeDrillTarget({
        drillDatabaseUrl: "postgresql://srag@db.internal:5432/saboraty_restore_drill",
        databaseUrl: DEV,
      }),
    ).toThrow(RestoreDrillError);
  });

  it("rejects malformed or non-postgres URLs", () => {
    expect(() => assertSafeDrillTarget({ drillDatabaseUrl: "not a url", databaseUrl: DEV })).toThrow(RestoreDrillError);
    expect(() =>
      assertSafeDrillTarget({ drillDatabaseUrl: "mysql://srag@127.0.0.1:3306/drill", databaseUrl: DEV }),
    ).toThrow(RestoreDrillError);
    expect(() => assertSafeDrillTarget({ drillDatabaseUrl: "postgresql://srag@127.0.0.1:5433/", databaseUrl: DEV })).toThrow(
      RestoreDrillError,
    );
  });
});
