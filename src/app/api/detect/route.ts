import { NextRequest, NextResponse } from "next/server";

import { classifyMatches } from "@/lib/gemini";
import { embedText } from "@/lib/jina";
import { getSupabase, getSupabaseConfigError } from "@/lib/supabase";
import type { DetectResponse, DetectionMatch, Statement, Verdict } from "@/types";

interface MatchRow {
  id: number;
  vyrok: string;
  vyhodnotenie: Verdict;
  odovodnenie: string | null;
  oblast: string | null;
  datum: string | null;
  meno: string;
  strana: string;
  similarity: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStatement(row: MatchRow): Statement {
  return {
    id: row.id,
    vyrok: row.vyrok,
    vyhodnotenie: row.vyhodnotenie,
    odovodnenie: row.odovodnenie,
    oblast: row.oblast,
    datum: row.datum,
    meno: row.meno,
    strana: row.strana,
  };
}

function classificationRank(value: DetectionMatch["classification"]): number {
  if (value === "DUPLICATE") {
    return 0;
  }
  if (value === "RELATED") {
    return 1;
  }
  return 2;
}

function buildFallbackClassification(row: MatchRow): {
  id: number;
  classification: DetectionMatch["classification"];
  explanation: string;
} {
  if (row.similarity >= 0.85) {
    return {
      id: row.id,
      classification: "DUPLICATE",
      explanation: "Klasifikácia nedostupná - vysoká zhoda.",
    };
  }

  if (row.similarity >= 0.5) {
    return {
      id: row.id,
      classification: "RELATED",
      explanation: "Klasifikácia nedostupná.",
    };
  }

  return {
    id: row.id,
    classification: "UNRELATED",
    explanation: "Klasifikácia nedostupná.",
  };
}

export async function POST(request: NextRequest) {
  const start = performance.now();
  const supabaseConfigError = getSupabaseConfigError();

  if (supabaseConfigError) {
    return NextResponse.json({ error: supabaseConfigError }, { status: 503 });
  }

  const supabase = getSupabase();

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isRecord(parsedBody) || typeof parsedBody.statement !== "string") {
    return NextResponse.json({ error: "Statement is required" }, { status: 400 });
  }

  const statement = parsedBody.statement.trim();
  const rawTopK = parsedBody.top_k;
  const topK =
    typeof rawTopK === "number" && Number.isInteger(rawTopK) ? rawTopK : 10;

  if (!statement) {
    return NextResponse.json({ error: "Statement is required" }, { status: 400 });
  }
  if (statement.length > 2000) {
    return NextResponse.json(
      { error: "Statement too long (max 2000 chars)" },
      { status: 400 }
    );
  }
  if (topK < 1 || topK > 20) {
    return NextResponse.json({ error: "top_k must be between 1 and 20" }, { status: 400 });
  }

  let embedding: number[];
  try {
    embedding = await embedText(statement);
  } catch {
    return NextResponse.json(
      { error: "Embedding service unavailable" },
      { status: 502 }
    );
  }

  const retrievalCount = Math.max(topK, 30);
  const { data, error } = await supabase.rpc("match_statements", {
    query_embedding: embedding,
    match_count: retrievalCount,
  });

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }

  const rows = (data ?? []) as MatchRow[];

  if (rows.length === 0 || rows.every((row) => row.similarity < 0.5)) {
    const response: DetectResponse = {
      input_statement: statement,
      matches: [],
      overall_status: "NEW_CLAIM",
      query_time_ms: Math.round(performance.now() - start),
    };

    return NextResponse.json(response);
  }

  let classifications:
    | Awaited<ReturnType<typeof classifyMatches>>
    | Array<ReturnType<typeof buildFallbackClassification>>;

  try {
    classifications = await classifyMatches(
      statement,
      rows.map((row) => ({
        id: row.id,
        vyrok: row.vyrok,
        vyhodnotenie: row.vyhodnotenie,
      }))
    );
  } catch {
    classifications = rows.map(buildFallbackClassification);
  }

  const classificationsById = new Map(
    classifications.map((classification) => [classification.id, classification])
  );

  const matches: DetectionMatch[] = rows
    .map((row) => {
      const classification = classificationsById.get(row.id);

      return {
        statement: toStatement(row),
        similarity: row.similarity,
        classification: classification?.classification ?? "UNRELATED",
        explanation: classification?.explanation ?? "Klasifikácia nebola vrátená.",
      };
    })
    .sort((left, right) => {
      const rankDiff =
        classificationRank(left.classification) -
        classificationRank(right.classification);

      if (rankDiff !== 0) {
        return rankDiff;
      }

      return right.similarity - left.similarity;
    })
    .slice(0, topK);

  const overallStatus: DetectResponse["overall_status"] = matches.some(
    (match) => match.classification === "DUPLICATE"
  )
    ? "DUPLICATE_FOUND"
    : matches.some((match) => match.classification === "RELATED")
      ? "RELATED_ONLY"
      : "NEW_CLAIM";

  const response: DetectResponse = {
    input_statement: statement,
    matches,
    overall_status: overallStatus,
    query_time_ms: Math.round(performance.now() - start),
  };

  return NextResponse.json(response);
}
