import { resetTestDatabase, dropTestDatabase, assertSafeTestDatabase } from "../../../postgres/scripts/reset-test-database.mjs";

export async function setup() {
  assertSafeTestDatabase({
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
    databaseUrl: process.env.DATABASE_URL,
  });
  await resetTestDatabase();
}

export async function teardown() {
  await dropTestDatabase();
}
