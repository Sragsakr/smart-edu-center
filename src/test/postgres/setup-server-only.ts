import { vi } from "vitest";
import { assertSafeTestDatabase } from "../../../postgres/scripts/reset-test-database.mjs";
import { cookieState } from "./test-cookies";

vi.mock("server-only", () => ({}));

// Code paths that resolve their own PostgresSqlExecutor via databaseConfig()/DATABASE_URL
// (e.g. src/lib/portal-data.ts, src/lib/authorization/server.ts) must also land on the
// disposable database inside this process. assertSafeTestDatabase already guarantees
// TEST_DATABASE_URL is not saboraty/production before this reassignment happens; the
// real DATABASE_URL is checked here against TEST_DATABASE_URL and then intentionally
// overridden, so nothing downstream ever connects to the development database.
const { url } = assertSafeTestDatabase({
  testDatabaseUrl: process.env.TEST_DATABASE_URL,
  databaseUrl: process.env.DATABASE_URL,
});
process.env.DATABASE_URL = url;

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (name === "saboraty_session" && cookieState.token ? { value: cookieState.token } : undefined),
    set: (_name: string, value: string) => {
      cookieState.token = value;
    },
    delete: () => {
      cookieState.token = undefined;
    },
  })),
}));
