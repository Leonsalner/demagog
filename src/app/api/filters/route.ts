import { NextResponse } from "next/server";

import { getSupabase, getSupabaseConfigError } from "@/lib/supabase";
import type { FiltersResponse, Verdict } from "@/types";

export const revalidate = 3600;
const FETCH_BATCH_SIZE = 1_000;

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

async function fetchColumnValues(
  supabase: ReturnType<typeof getSupabase>,
  column: "strana" | "oblast" | "meno" | "datum",
): Promise<Array<string | null>> {
  const values: Array<string | null> = [];

  for (let from = 0; ; from += FETCH_BATCH_SIZE) {
    let query = supabase
      .from("vyroky")
      .select(column)
      .order(column, { ascending: true })
      .range(from, from + FETCH_BATCH_SIZE - 1);

    if (column === "oblast" || column === "datum") {
      query = query.not(column, "is", null);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Array<Record<string, string | null>>;
    values.push(...rows.map((row) => row[column] ?? null));

    if (rows.length < FETCH_BATCH_SIZE) {
      break;
    }
  }

  return values;
}

export async function GET() {
  const start = performance.now();
  const supabaseConfigError = getSupabaseConfigError();

  if (supabaseConfigError) {
    return NextResponse.json({ error: supabaseConfigError }, { status: 503 });
  }

  const supabase = getSupabase();

  let strany: Array<string | null>;
  let oblasti: Array<string | null>;
  let mena: Array<string | null>;
  let dates: string[];

  try {
    [strany, oblasti, mena, dates] = await Promise.all([
      fetchColumnValues(supabase, "strana"),
      fetchColumnValues(supabase, "oblast"),
      fetchColumnValues(supabase, "meno"),
      fetchColumnValues(supabase, "datum").then((values) =>
        values.filter((value): value is string => typeof value === "string"),
      ),
    ]);
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }

  const response: FiltersResponse & { query_time_ms: number } = {
    strany: uniqueSorted(strany),
    oblasti: uniqueSorted(oblasti),
    mena: uniqueSorted(mena),
    verdicts: VERDICTS,
    date_range: {
      min: dates[0] ?? null,
      max: dates[dates.length - 1] ?? null,
    },
    query_time_ms: Math.round(performance.now() - start),
  };

  return NextResponse.json(response);
}
