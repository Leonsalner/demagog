import { NextRequest, NextResponse } from "next/server";

import { embedText } from "@/lib/jina";
import { rerankResults } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";
import type { SearchRequest, SearchResponse, Statement, Verdict } from "@/types";

const VERDICTS: Verdict[] = [
  "Pravda",
  "Nepravda",
  "Zavádzajúce",
  "Neoveriteľné",
];

interface SearchRow {
  id: number;
  vyrok: string;
  vyhodnotenie: Verdict;
  odovodnenie: string | null;
  oblast: string | null;
  datum: string | null;
  meno: string;
  strana: string;
  similarity?: number | null;
}

function toStatement(row: SearchRow): Statement {
  const statement: Statement = {
    id: row.id,
    vyrok: row.vyrok,
    vyhodnotenie: row.vyhodnotenie,
    odovodnenie: row.odovodnenie,
    oblast: row.oblast,
    datum: row.datum,
    meno: row.meno,
    strana: row.strana,
  };

  if (typeof row.similarity === "number") {
    statement.similarity = row.similarity;
  }

  return statement;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function coerceOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function coerceOptionalVerdict(value: unknown): Verdict | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return VERDICTS.includes(value as Verdict) ? (value as Verdict) : undefined;
}

function coercePositiveInteger(
  value: unknown,
  fallback: number,
  max?: number
): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  if (typeof max === "number") {
    return Math.min(parsed, max);
  }

  return parsed;
}

function buildFilterParams(body: SearchRequest) {
  return {
    filter_strana: body.strana ?? null,
    filter_oblast: body.oblast ?? null,
    filter_vyhodnotenie: body.vyhodnotenie ?? null,
    filter_meno: body.meno ?? null,
    filter_datum_od: body.datum_od ?? null,
    filter_datum_do: body.datum_do ?? null,
  };
}

export async function POST(request: NextRequest) {
  const start = performance.now();

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isRecord(parsedBody)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const body: SearchRequest = {
    query: coerceOptionalString(parsedBody.query),
    strana: coerceOptionalString(parsedBody.strana),
    oblast: coerceOptionalString(parsedBody.oblast),
    vyhodnotenie: coerceOptionalVerdict(parsedBody.vyhodnotenie),
    meno: coerceOptionalString(parsedBody.meno),
    datum_od: coerceOptionalString(parsedBody.datum_od),
    datum_do: coerceOptionalString(parsedBody.datum_do),
    page: coercePositiveInteger(parsedBody.page, 1),
    page_size: coercePositiveInteger(parsedBody.page_size, 20, 50),
  };

  const page = body.page ?? 1;
  const pageSize = body.page_size ?? 20;
  const offset = (page - 1) * pageSize;

  try {
    let results: Statement[] = [];
    let totalCount = 0;

    if (body.query) {
      let embedding: number[];
      try {
        embedding = await embedText(body.query);
      } catch {
        return NextResponse.json(
          { error: "Embedding service unavailable" },
          { status: 502 }
        );
      }

      const limit = body.query && page === 1 ? pageSize : page * pageSize;
      const filterParams = buildFilterParams(body);
      const { data, error } = await supabase.rpc("search_statements", {
        query_embedding: embedding,
        match_count: limit,
        match_offset: 0,
        ...filterParams,
      });

      if (error) {
        return NextResponse.json({ error: "Database error" }, { status: 502 });
      }

      const semanticRows = ((data ?? []) as SearchRow[]).map(toStatement);
      let orderedRows = semanticRows;

      if (semanticRows.length > 5) {
        const rerankedIds = await rerankResults(
          body.query,
          semanticRows.map((row) => ({ id: row.id, vyrok: row.vyrok }))
        );
        const rowsById = new Map(semanticRows.map((row) => [row.id, row]));
        orderedRows = rerankedIds
          .map((id) => rowsById.get(id))
          .filter((row): row is Statement => Boolean(row));
      }

      results = orderedRows.slice(offset, offset + pageSize);

      const { data: countData, error: countError } = await supabase.rpc(
        "count_statements",
        buildFilterParams(body)
      );

      if (countError) {
        return NextResponse.json({ error: "Database error" }, { status: 502 });
      }

      totalCount = typeof countData === "number" ? countData : 0;
    } else {
      let query = supabase
        .from("vyroky")
        .select(
          "id, vyrok, vyhodnotenie, odovodnenie, oblast, datum, meno, strana",
          { count: "exact" }
        );

      if (body.strana) {
        query = query.eq("strana", body.strana);
      }
      if (body.oblast) {
        query = query.eq("oblast", body.oblast);
      }
      if (body.vyhodnotenie) {
        query = query.eq("vyhodnotenie", body.vyhodnotenie);
      }
      if (body.meno) {
        query = query.eq("meno", body.meno);
      }
      if (body.datum_od) {
        query = query.gte("datum", body.datum_od);
      }
      if (body.datum_do) {
        query = query.lte("datum", body.datum_do);
      }

      const { data, error, count } = await query
        .order("datum", { ascending: false, nullsFirst: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        return NextResponse.json({ error: "Database error" }, { status: 502 });
      }

      results = ((data ?? []) as SearchRow[]).map(toStatement);
      totalCount = count ?? 0;
    }

    const response: SearchResponse = {
      results,
      total_count: totalCount,
      page,
      page_size: pageSize,
      query_time_ms: Math.round(performance.now() - start),
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
