import { NextResponse } from "next/server";

import { databaseConfig } from "@/lib/database/config";
import { postgresSqlExecutor } from "@/lib/database/postgres-sql-executor";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = databaseConfig();
    if (config.backend !== "postgres" || !config.databaseUrl) throw new Error("PostgreSQL is not configured");
    await postgresSqlExecutor(config.databaseUrl).query("select 1 from public.app_users limit 1");
    return NextResponse.json({ ok: true, database: "reachable", backend: "postgres" });
  } catch {
    return NextResponse.json({ ok: false, database: "unavailable", backend: "postgres" }, { status: 503 });
  }
}
