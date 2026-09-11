"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";
import { buildRateLimitRules, clientAddress, consumeRateLimit, describeRetryAfter } from "@/lib/security/rate-limit";
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

  // مسار تطويري لكنه ينشئ حساب إدارة، فيبقى محدودًا حتى لا يُستخدم كمنفذ إنشاء.
  const decision = await consumeRateLimit(postgresSqlExecutor(databaseUrl), {
    scope: "bootstrap",
    rules: buildRateLimitRules({ scope: "bootstrap", address: clientAddress(await headers()) }),
  });
  if (!decision.allowed) {
    redirect(
      `/platform-control/bootstrap?error=${encodeURIComponent(
        `${decision.message} (${describeRetryAfter(decision.retryAfterSeconds)})`,
      )}`,
    );
  }

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
