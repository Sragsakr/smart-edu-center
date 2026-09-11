import { NextResponse } from "next/server";

import { applicationSql } from "@/lib/database/application-sql";
import { isDatabaseReady } from "@/lib/database/database-readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!await isDatabaseReady(applicationSql())) {
      return NextResponse.json(
        { ok: false, database: "reachable", schema: "incomplete", backend: "postgres" },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      database: "reachable",
      schema: "ready",
      backend: "postgres",
    });
  } catch {
    return NextResponse.json(
      { ok: false, database: "unavailable", schema: "unknown", backend: "postgres" },
      { status: 503 },
    );
  }
}
