"use server";

import { redirect } from "next/navigation";

import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";
import { privateEnv } from "@/lib/server-env";
import {
  assertLocalDevelopmentBootstrapAvailable,
  bootstrapLocalPlatformAdmin,
} from "@/lib/development/local-platform-admin-bootstrap";

export async function bootstrapLocalAdmin(formData: FormData) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Local platform-admin bootstrap is unavailable in this environment");
  }

  const databaseUrl = privateEnv().DATABASE_URL;
  const runtime = { nodeEnv: process.env.NODE_ENV, databaseUrl };
  assertLocalDevelopmentBootstrapAvailable(runtime);

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  await bootstrapLocalPlatformAdmin({
    runtime,
    sql: postgresSqlExecutor(databaseUrl),
    email,
    password,
  });

  redirect("/platform-control/login?bootstrapped=1");
}
