import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";

export async function GET() {
  const start = performance.now();

  const [totalResult, embeddedResult] = await Promise.all([
    supabase.from("vyroky").select("*", { count: "exact", head: true }),
    supabase
      .from("vyroky")
      .select("*", { count: "exact", head: true })
      .not("embedding", "is", null),
  ]);

  if (totalResult.error || embeddedResult.error) {
    return NextResponse.json(
      {
        status: "error",
        db_connected: false,
        total_statements: 0,
        embedded_statements: 0,
        timestamp: new Date().toISOString(),
        query_time_ms: Math.round(performance.now() - start),
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ok",
    db_connected: true,
    total_statements: totalResult.count ?? 0,
    embedded_statements: embeddedResult.count ?? 0,
    timestamp: new Date().toISOString(),
    query_time_ms: Math.round(performance.now() - start),
  });
}
