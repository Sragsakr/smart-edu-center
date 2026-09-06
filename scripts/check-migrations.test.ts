import { describe, expect, it } from "vitest";

import {
  findChangedExistingMigrations,
  validateMigrationFiles,
} from "./check-migrations.mjs";

describe("migration policy", () => {
  it("accepts a transactional, forward-only migration", () => {
    const violations = validateMigrationFiles([
      {
        name: "202609060004_add_example.sql",
        sql: "begin;\ncreate table example (id bigint);\ncommit;\n",
      },
    ]);

    expect(violations).toEqual([]);
  });

  it("reports invalid filenames and missing transaction boundaries", () => {
    const violations = validateMigrationFiles([
      { name: "add-example.sql", sql: "create table example (id bigint);" },
    ]);

    expect(violations).toEqual([
      "add-example.sql: invalid migration filename",
      "add-example.sql: migration must start with BEGIN",
      "add-example.sql: migration must end with COMMIT",
    ]);
  });

  it("rejects modifications and deletions but allows new migrations", () => {
    const nameStatusOutput = [
      "A\tsupabase/migrations/202609060004_new.sql",
      "M\tsupabase/migrations/202609060001_initial_core.sql",
      "D\tsupabase/migrations/202609060002_indexes.sql",
      "M\tREADME.md",
    ].join("\n");

    expect(findChangedExistingMigrations(nameStatusOutput)).toEqual([
      "supabase/migrations/202609060001_initial_core.sql",
      "supabase/migrations/202609060002_indexes.sql",
    ]);
  });
});
