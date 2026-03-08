import { NextResponse } from "next/server";

import { getSupabasePublicConfigError, supabasePublic } from "@/lib/supabase";
import { VERDICTS } from "@/lib/utils";
import type { FiltersResponse } from "@/types";

export const revalidate = 3600;

function uniqueSorted(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "sk"));
}

async function fetchColumnValues(
  supabase: ReturnType<typeof supabasePublic>,
  column: "strana" | "oblast" | "meno",
): Promise<Array<string | null>> {
  const { data, error } = await supabase.rpc("list_distinct_values", {
    col: column,
  });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<{ value: string | null }>;
  return rows.map((row) => row.value ?? null);
}

async function fetchDateRange(
  supabase: ReturnType<typeof supabasePublic>,
): Promise<{ min: string | null; max: string | null }> {
  const { data, error } = await supabase.rpc("statement_date_bounds", {});

  if (error) {
    throw error;
  }

  const row = data?.[0];
  return {
    min: row?.min_date ?? null,
    max: row?.max_date ?? null,
  };
}

export async function GET() {
  const start = performance.now();
  const supabaseConfigError = getSupabasePublicConfigError();

  if (supabaseConfigError) {
    return NextResponse.json({ error: supabaseConfigError }, { status: 503 });
  }

  const supabase = supabasePublic();

  let strany: Array<string | null>;
  let oblasti: Array<string | null>;
  let mena: Array<string | null>;
  let dateRange: { min: string | null; max: string | null };

  try {
    [strany, oblasti, mena, dateRange] = await Promise.all([
      fetchColumnValues(supabase, "strana"),
      fetchColumnValues(supabase, "oblast"),
      fetchColumnValues(supabase, "meno"),
      fetchDateRange(supabase),
    ]);
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }

  const response: FiltersResponse & { query_time_ms: number } = {
    strany: uniqueSorted(strany),
    oblasti: uniqueSorted(oblasti),
    mena: uniqueSorted(mena),
    verdicts: VERDICTS,
    date_range: dateRange,
    query_time_ms: Math.round(performance.now() - start),
  };

  return NextResponse.json(response);
}
