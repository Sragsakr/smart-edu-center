import { NextResponse } from "next/server";

import { applicationSql } from "@/lib/database/application-sql";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await applicationSql().query("select 1 from public.app_users limit 1");
    return NextResponse.json({ ok: true, database: "reachable", backend: "postgres" });
  } catch {
    return NextResponse.json({ ok: false, database: "unavailable", backend: "postgres" }, { status: 503 });
  }
}
