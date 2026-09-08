import { describe, expect, it } from "vitest";

import { validateCanonicalBaseline } from "./check-migrations.mjs";

const canonicalName = "0001_smart_edu_center_clean.sql";

describe("Build Mode canonical baseline policy", () => {
  it("accepts one portable transactional baseline", () => {
    expect(validateCanonicalBaseline([{ name: canonicalName, sql: "begin;\ncreate table example (id bigint);\ncommit;\n" }])).toEqual([]);
  });

  it("rejects extra executable baselines and missing transaction boundaries", () => {
    expect(validateCanonicalBaseline([
      { name: canonicalName, sql: "create table example (id bigint);" },
      { name: "0002_extra.sql", sql: "begin; commit;" },
    ])).toEqual([
      `postgres/baseline must contain only ${canonicalName}`,
      `${canonicalName}: baseline must start with BEGIN`,
      `${canonicalName}: baseline must end with COMMIT`,
    ]);
  });

  it("rejects provider-specific authorization primitives", () => {
    expect(validateCanonicalBaseline([{ name: canonicalName, sql: "begin; select auth.uid(); commit;" }])).toEqual([
      `${canonicalName}: provider-specific authorization is not allowed`,
    ]);
  });
});
