"use server";

import { redirect } from "next/navigation";

import { databaseConfig } from "@/lib/database/config";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";
import {
  assertLocalDevelopmentBootstrapAvailable,
  bootstrapLocalPlatformAdmin,
} from "@/lib/development/local-platform-admin-bootstrap";

export async function bootstrapLocalAdmin(formData: FormData) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Local platform-admin bootstrap is unavailable in this environment");
  }

  const database = databaseConfig();
  const runtime = { nodeEnv: process.env.NODE_ENV, database };
  assertLocalDevelopmentBootstrapAvailable(runtime);
  if (!database.databaseUrl) throw new Error("Local PostgreSQL is not configured");

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  await bootstrapLocalPlatformAdmin({
    runtime,
    sql: postgresSqlExecutor(database.databaseUrl),
    email,
    password,
  });

  redirect("/platform-control/login?bootstrapped=1");
}
