import { NextResponse } from "next/server";

import { getSupabase, getSupabaseConfigError } from "@/lib/supabase";
import type { FiltersResponse, Verdict } from "@/types";

export const revalidate = 3600;

const VERDICTS: Verdict[] = [
  "Pravda",
  "Nepravda",
  "Zavádzajúce",
  "Neoveriteľné",
];

function uniqueSorted(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "sk"));
}

export async function GET() {
  const start = performance.now();
  const supabaseConfigError = getSupabaseConfigError();

  if (supabaseConfigError) {
    return NextResponse.json({ error: supabaseConfigError }, { status: 503 });
  }

  const supabase = getSupabase();

  const [stranyResult, oblastiResult, menaResult, datesResult] =
    await Promise.all([
      supabase.from("vyroky").select("strana").order("strana"),
      supabase.from("vyroky").select("oblast").not("oblast", "is", null).order("oblast"),
      supabase.from("vyroky").select("meno").order("meno"),
      supabase
        .from("vyroky")
        .select("datum")
        .not("datum", "is", null)
        .order("datum", { ascending: true }),
    ]);

  if (
    stranyResult.error ||
    oblastiResult.error ||
    menaResult.error ||
    datesResult.error
  ) {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }

  const dates = (datesResult.data ?? [])
    .map((row) => row.datum)
    .filter((value): value is string => typeof value === "string");

  const response: FiltersResponse & { query_time_ms: number } = {
    strany: uniqueSorted((stranyResult.data ?? []).map((row) => row.strana)),
    oblasti: uniqueSorted((oblastiResult.data ?? []).map((row) => row.oblast)),
    mena: uniqueSorted((menaResult.data ?? []).map((row) => row.meno)),
    verdicts: VERDICTS,
    date_range: {
      min: dates[0] ?? null,
      max: dates[dates.length - 1] ?? null,
    },
    query_time_ms: Math.round(performance.now() - start),
  };

  return NextResponse.json(response);
}
