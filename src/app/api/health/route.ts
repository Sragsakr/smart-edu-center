import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("tenants").select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { ok: false, database: "error", serverSecret: "configured" },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      database: "reachable",
      serverSecret: "configured",
    });
  } catch {
    return NextResponse.json(
      { ok: false, database: "unavailable", serverSecret: "missing-or-invalid" },
      { status: 503 },
    );
  }
}
