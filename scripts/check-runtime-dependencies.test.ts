import { describe, expect, it } from "vitest";

import { findForbiddenRuntimeDependencies } from "./check-runtime-dependencies.mjs";

describe("retired runtime dependency scan", () => {
  it("flags Supabase environment variables and SDK usage", () => {
    expect(findForbiddenRuntimeDependencies('const url = process.env.NEXT_PUBLIC_SUPABASE_URL')).toEqual([
      "Supabase environment variable",
    ]);
    expect(findForbiddenRuntimeDependencies('import { createClient } from "@supabase/supabase-js"')).toEqual([
      "Supabase SDK import",
    ]);
    expect(findForbiddenRuntimeDependencies("const secret = process.env.SUPABASE_SECRET_KEY")).toHaveLength(1);
  });

  it("flags the retired auth callback route and backend selector", () => {
    expect(findForbiddenRuntimeDependencies('redirect("/auth/callback?code=1")')).toContain(
      "Supabase auth callback route",
    );
    expect(findForbiddenRuntimeDependencies("const DATA_BACKEND = 'postgres'")).toContain(
      "legacy data-backend selector",
    );
  });

  it("flags Vercel runtime coupling", () => {
    expect(findForbiddenRuntimeDependencies("const env = process.env.VERCEL_ENV")).toContain(
      "Vercel runtime dependency",
    );
    expect(findForbiddenRuntimeDependencies('import { kv } from "@vercel/kv"')).toContain("Vercel SDK import");
  });

  it("passes clean PostgreSQL-only code", () => {
    const clean = [
      'import { Pool } from "pg";',
      'const connectionString = process.env.DATABASE_URL;',
      "export async function readTenant(id: string) { return sql.query('select 1 from public.tenants where id = $1', [id]); }",
    ].join("\n");
    expect(findForbiddenRuntimeDependencies(clean)).toEqual([]);
  });

  it("does not flag the word database or unrelated three-letter sequences", () => {
    expect(findForbiddenRuntimeDependencies("DATABASE_URL and DATABASE_URL_TEST are fine")).toEqual([]);
    expect(findForbiddenRuntimeDependencies("const SUPERBASED = true;")).toEqual([]);
  });
});
