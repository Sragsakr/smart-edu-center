"use server";

import { redirect } from "next/navigation";

import { SupabaseCurrentUserProvider } from "@/lib/auth/supabase-current-user-provider";
import { databaseConfig } from "@/lib/database/config";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";
import {
  assertLocalDevelopmentBootstrapAvailable,
  bootstrapCurrentLocalPlatformAdmin,
} from "@/lib/development/local-platform-admin-bootstrap";

export async function bootstrapCurrentAdmin() {
  const database = databaseConfig();
  const runtime = { nodeEnv: process.env.NODE_ENV, database };

  assertLocalDevelopmentBootstrapAvailable(runtime);
  if (!database.databaseUrl) {
    throw new Error("Local PostgreSQL is not configured");
  }

  await bootstrapCurrentLocalPlatformAdmin({
    runtime,
    currentUserProvider: new SupabaseCurrentUserProvider(),
    sql: postgresSqlExecutor(database.databaseUrl),
  });

  redirect("/platform-admin");
}
