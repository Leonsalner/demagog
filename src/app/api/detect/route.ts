import { NextRequest, NextResponse } from "next/server";

import { classifyMatches, getGeminiModel } from "@/lib/gemini";
import { embedText } from "@/lib/jina";
import {
  buildKeywordTerms,
  normalizeForMatching,
  scoreTextAgainstQuery,
} from "@/lib/lexical-match";
import { getSupabasePublicConfigError, supabasePublic } from "@/lib/supabase";
import { isRecord } from "@/lib/utils";
import type {
  Article,
  DetectMode,
  DetectResponse,
  DetectionMatch,
  Statement,
  StatementSource,
  Verdict,
} from "@/types";

interface MatchRow {
  id: number;
  vyrok: string;
  vyhodnotenie: Verdict;
  odovodnenie: string | null;
  datum: string | null;
  meno: string;
  strana: string;
  url: string;
  speaker_url: string | null;
  similarity: number;
}

interface ArticleMatchRow {
  id: number;
  datum: string | null;
  autor: string | null;
  text_content: string | null;
  similarity: number;
}

interface SourceRow {
  id: number;
  statement_id: number;
  position: number;
  label: string;
  url: string;
  title: string | null;
}

const LEXICAL_DETECT_CANDIDATE_LIMIT = 120;
const LEXICAL_DETECT_ROWS_PER_TERM = 40;
const FAST_DETECT_RETRIEVAL_COUNT = 20;
const THOROUGH_DETECT_RETRIEVAL_COUNT = 60;
let matchStatementsRpcAvailable: boolean | null = null;
const DETECT_FALLBACK_IGNORED_TERMS = new Set([
  "asi",
  "dnes",
  "kabinet",
  "plan",
  "pripravuje",
  "slovenska",
  "slovensko",
  "tri",
  "vlada",
  "vyrazne",
]);

function toStatement(row: MatchRow): Statement {
  return {
    id: row.id,
    vyrok: row.vyrok,
    vyhodnotenie: row.vyhodnotenie,
    odovodnenie: row.odovodnenie,
    datum: row.datum,
    meno: row.meno,
    strana: row.strana,
    url: row.url,
    speaker_url: row.speaker_url,
  };
}

function toArticle(row: ArticleMatchRow): Article {
  return {
    id: row.id,
    datum: row.datum ?? "",
    autor: row.autor ?? "Demagog.sk",
    text: row.text_content?.trim() ?? "",
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
      explanation: "Vysoká sémantická zhoda.",
    };
  }

  if (row.similarity >= 0.5) {
    return {
      id: row.id,
      classification: "RELATED",
      explanation: "Podobná téma alebo rámec tvrdenia.",
    };
  }

  return {
    id: row.id,
    classification: "UNRELATED",
    explanation: "Len slabá povrchová zhoda.",
  };
}

async function fetchSourcesForIds(
  supabase: ReturnType<typeof supabasePublic>,
  ids: number[]
): Promise<Map<number, StatementSource[]>> {
  if (ids.length === 0) {
    return new Map();
  }

  const { data } = await supabase
    .from("statement_sources")
    .select("id, statement_id, position, label, url, title")
    .in("statement_id", ids)
    .order("position");

  const map = new Map<number, StatementSource[]>();

  for (const row of (data ?? []) as SourceRow[]) {
    const list = map.get(row.statement_id) ?? [];
    list.push({ id: row.id, position: row.position, label: row.label, url: row.url, ...(row.title ? { title: row.title } : {}) });
    map.set(row.statement_id, list);
  }

  return map;
}

function isRpcUnavailable(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "PGRST202";
}

async function canUseMatchStatementsRpc(
  supabase: ReturnType<typeof supabasePublic>
): Promise<boolean> {
  if (matchStatementsRpcAvailable !== null) {
    return matchStatementsRpcAvailable;
  }

  const probe = await supabase.rpc("match_statements", {
    query_embedding: [0.01, 0.02, 0.03],
    match_count: 1,
  });

  matchStatementsRpcAvailable = !isRpcUnavailable(probe.error);
  return matchStatementsRpcAvailable;
}

async function runLexicalDetectFallback(
  supabase: ReturnType<typeof supabasePublic>,
  statement: string,
  retrievalCount: number
): Promise<MatchRow[]> {
  const keywordTerms = buildKeywordTerms(statement, 8).filter(
    (term) => !DETECT_FALLBACK_IGNORED_TERMS.has(normalizeForMatching(term))
  );

  if (keywordTerms.length === 0) {
    return [];
  }

  const candidateMap = new Map<number, Omit<MatchRow, "similarity">>();
  const termGroups: string[][] = [];

  if (keywordTerms.length >= 2) {
    termGroups.push(keywordTerms.slice(0, 2));
  }

  for (const term of keywordTerms.slice(0, 5)) {
    termGroups.push([term]);
  }

  for (const terms of termGroups) {
    let query = supabase
      .from("vyroky")
      .select("id, vyrok, vyhodnotenie, odovodnenie, datum, meno, strana, url, speaker_url");

    for (const term of terms) {
      query = query.ilike("vyrok", `%${term}%`);
    }

    const { data, error } = await query.range(0, LEXICAL_DETECT_ROWS_PER_TERM - 1);

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as Omit<MatchRow, "similarity">[]) {
      candidateMap.set(row.id, row);

      if (candidateMap.size === LEXICAL_DETECT_CANDIDATE_LIMIT) {
        break;
      }
    }

    if (candidateMap.size === LEXICAL_DETECT_CANDIDATE_LIMIT) {
      break;
    }
  }

  return Array.from(candidateMap.values())
    .map((row) => ({
      ...row,
      similarity: scoreTextAgainstQuery(statement, row.vyrok, row.odovodnenie),
    }))
    .filter((row) => row.similarity > 0)
    .sort((left, right) => {
      if (right.similarity !== left.similarity) {
        return right.similarity - left.similarity;
      }

      const leftDate = left.datum ?? "";
      const rightDate = right.datum ?? "";
      return rightDate.localeCompare(leftDate);
    })
    .slice(0, retrievalCount);
}

export function resetDetectRouteStateForTests() {
  matchStatementsRpcAvailable = null;
}

export async function POST(request: NextRequest) {
  const start = performance.now();
  const supabaseConfigError = getSupabasePublicConfigError();

  if (supabaseConfigError) {
    return NextResponse.json({ error: supabaseConfigError }, { status: 503 });
  }

  const supabase = supabasePublic();

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
  const rawMode = parsedBody.mode;
  const mode: DetectMode = rawMode === "fast" ? "fast" : "thorough";

  if (
    rawTopK !== undefined &&
    rawTopK !== null &&
    (typeof rawTopK !== "number" ||
      !Number.isInteger(rawTopK) ||
      rawTopK < 1 ||
      rawTopK > 20)
  ) {
    return NextResponse.json({ error: "top_k must be between 1 and 20" }, { status: 400 });
  }

  const topK = typeof rawTopK === "number" ? rawTopK : 10;

  if (!statement) {
    return NextResponse.json({ error: "Statement is required" }, { status: 400 });
  }
  if (statement.length > 2000) {
    return NextResponse.json(
      { error: "Statement too long (max 2000 chars)" },
      { status: 400 }
    );
  }

  const retrievalCount = Math.max(
    topK,
    mode === "fast" ? FAST_DETECT_RETRIEVAL_COUNT : THOROUGH_DETECT_RETRIEVAL_COUNT
  );
  let rows: MatchRow[];
  let embedding: number[] | null = null;
  let usedLexicalFallback = false;

  if (await canUseMatchStatementsRpc(supabase)) {
    try {
      embedding = await embedText(statement, "detect");
    } catch {
      return NextResponse.json(
        { error: "Embedding service unavailable" },
        { status: 502 }
      );
    }

    const { data, error } = await supabase.rpc("match_statements", {
      query_embedding: embedding,
      match_count: retrievalCount,
    });

    if (error) {
      if (isRpcUnavailable(error)) {
        matchStatementsRpcAvailable = false;
        usedLexicalFallback = true;
        rows = await runLexicalDetectFallback(supabase, statement, retrievalCount);
      } else {
        return NextResponse.json({ error: "Database error" }, { status: 502 });
      }
    } else {
      rows = (data ?? []) as MatchRow[];
    }
  } else {
    usedLexicalFallback = true;
    rows = await runLexicalDetectFallback(supabase, statement, retrievalCount);
  }

  const similarityThreshold = usedLexicalFallback ? 0.15 : 0.5;

  if (rows.length === 0 || rows.every((row) => row.similarity < similarityThreshold)) {
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
      })),
      getGeminiModel(mode === "fast" ? "flash" : "pro")
    );
  } catch {
    classifications = rows.map(buildFallbackClassification);
  }

  const classificationsById = new Map(
    classifications.map((classification) => [classification.id, classification])
  );

  const rawMatches: DetectionMatch[] = rows
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

  // Fetch and attach sources for all matched statements.
  const sourcesMap = await fetchSourcesForIds(
    supabase,
    rawMatches.map((m) => m.statement.id)
  );

  const matches: DetectionMatch[] = rawMatches.map((match) => {
    const sources = sourcesMap.get(match.statement.id);
    return sources && sources.length > 0
      ? { ...match, statement: { ...match.statement, sources } }
      : match;
  });

  const overallStatus: DetectResponse["overall_status"] = matches.some(
    (match) => match.classification === "DUPLICATE"
  )
    ? "DUPLICATE_FOUND"
    : matches.some((match) => match.classification === "RELATED")
      ? "RELATED_ONLY"
      : "NEW_CLAIM";

  let relatedArticles: Article[] | undefined;
  if (overallStatus !== "NEW_CLAIM" && embedding) {
    try {
      const { data: articleData, error: articleError } = await supabase.rpc(
        "match_articles",
        {
          query_embedding: embedding,
          match_count: 10,
        }
      );

      if (!articleError) {
        const ARTICLE_SIMILARITY_THRESHOLD = 0.3;
        relatedArticles = ((articleData ?? []) as ArticleMatchRow[])
          .filter((row) => row.similarity >= ARTICLE_SIMILARITY_THRESHOLD)
          .map(toArticle)
          .filter((article) => article.text.length > 0);
      }
    } catch {
      // Article context is best-effort and should not fail detection.
    }
  }

  const response: DetectResponse = {
    input_statement: statement,
    matches,
    overall_status: overallStatus,
    query_time_ms: Math.round(performance.now() - start),
    ...(relatedArticles && relatedArticles.length > 0
      ? { related_articles: relatedArticles }
      : {}),
  };

  return NextResponse.json(response);
}
