import { NextRequest, NextResponse } from "next/server";

import { classifyMatches, getGeminiModel } from "@/lib/gemini";
import { embedText } from "@/lib/jina";
import {
  buildKeywordTerms,
  escapeLikePattern,
  normalizeForMatching,
  scoreTextAgainstQuery,
} from "@/lib/lexical-match";
import { createLogger, generateCorrelationId } from "@/lib/logger";
import { getSupabasePublicConfigError, supabasePublic } from "@/lib/supabase";
import { isRecord } from "@/lib/utils";
import { createRpcAvailabilityCache } from "@/lib/rpc-cache";
import type {
  Article,
  DetectMode,
  DetectResponse,
  DetectionMatch,
  ResponseWarning,
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
  title: string | null;
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
const FAST_DETECT_RETRIEVAL_COUNT = 10;
const THOROUGH_DETECT_RETRIEVAL_COUNT = 60;
const matchStatementsRpcCache = createRpcAvailabilityCache();
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
    title: row.title ?? null,
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

function buildNewClaimFallbackResponse(
  statement: string,
  startedAt: number,
  correlationId?: string,
): NextResponse<DetectResponse> {
  const response: DetectResponse = {
    input_statement: statement,
    matches: [],
    overall_status: "NEW_CLAIM",
    query_time_ms: Math.round(performance.now() - startedAt),
  };

  const nextResponse = NextResponse.json(response);
  if (correlationId) {
    nextResponse.headers.set("X-Correlation-ID", correlationId);
  }
  nextResponse.headers.set("X-Demagog-Detect-Fallback", "no-match");
  return nextResponse;
}

async function fetchSourcesForIds(
  supabase: ReturnType<typeof supabasePublic>,
  ids: number[],
  logger: ReturnType<typeof createLogger>,
): Promise<{ sourcesMap: Map<number, StatementSource[]>; warning?: ResponseWarning }> {
  if (ids.length === 0) {
    return { sourcesMap: new Map() };
  }

  const { data, error } = await supabase
    .from("statement_sources")
    .select("id, statement_id, position, label, url, title")
    .in("statement_id", ids)
    .order("position");

  if (error) {
    logger.warn("statement_sources_fetch_failed", "fetch", {
      route: "/api/detect",
      statement_count: ids.length,
    }, error);
    return {
      sourcesMap: new Map(),
      warning: "statement_sources_unavailable",
    };
  }

  const map = new Map<number, StatementSource[]>();

  for (const row of (data ?? []) as SourceRow[]) {
    const list = map.get(row.statement_id) ?? [];
    list.push({ id: row.id, position: row.position, label: row.label, url: row.url, ...(row.title ? { title: row.title } : {}) });
    map.set(row.statement_id, list);
  }

  return { sourcesMap: map };
}

function isRpcUnavailable(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "PGRST202";
}

async function canUseMatchStatementsRpc(
  supabase: ReturnType<typeof supabasePublic>
): Promise<boolean> {
  const now = Date.now();
  const cached = matchStatementsRpcCache.isAvailable(now);

  if (cached !== null) {
    return cached;
  }

  const probe = await supabase.rpc("match_statements", {
    query_embedding: new Array(2048).fill(0.01),
    match_count: 1,
  });

  if (!isRpcUnavailable(probe.error)) {
    matchStatementsRpcCache.recordSuccess(now);
  } else {
    matchStatementsRpcCache.recordFailure(now);
  }

  return matchStatementsRpcCache.isAvailable(now) ?? false;
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
      query = query.ilike("vyrok", `%${escapeLikePattern(term)}%`);
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

export function resetDetectRouteStateForTests(): void {
  matchStatementsRpcCache.reset();
}

export async function POST(request: NextRequest) {
  const start = performance.now();
  const correlationId = request.headers.get("X-Correlation-ID") 
    ?? request.headers.get("X-Request-ID") 
    ?? generateCorrelationId();
  const logger = createLogger(correlationId);

  const supabaseConfigError = getSupabasePublicConfigError();

  if (supabaseConfigError) {
    return NextResponse.json({ error: supabaseConfigError }, { status: 503 });
  }

  const supabase = supabasePublic();

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Neplatné telo požiadavky." }, { status: 400 });
  }

  if (!isRecord(parsedBody) || typeof parsedBody.statement !== "string") {
    return NextResponse.json({ error: "Výrok je povinný." }, { status: 400 });
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
    return NextResponse.json({ error: "Parameter top_k musí byť medzi 1 a 20." }, { status: 400 });
  }

  const topK = typeof rawTopK === "number" ? rawTopK : 10;

  if (!statement) {
    return NextResponse.json({ error: "Výrok je povinný." }, { status: 400 });
  }
  if (statement.length > 2000) {
    return NextResponse.json(
      { error: "Výrok je príliš dlhý. Maximum je 2000 znakov." },
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

  try {
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
          matchStatementsRpcCache.recordFailure(Date.now());
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
  } catch (error) {
    logger.warn("detect_query_failed", "catch", {
      route: "/api/detect",
      duration_ms: Math.round(performance.now() - start),
    }, error);
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }

  const similarityThreshold = usedLexicalFallback ? 0.15 : 0.5;

  if (rows.length === 0 || rows.every((row) => row.similarity < similarityThreshold)) {
    return buildNewClaimFallbackResponse(statement, start, correlationId);
  }

  try {
    const warnings = new Set<ResponseWarning>();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Classification timeout")), 10000)
    );

    const classifications = await Promise.race([
      classifyMatches(
        statement,
        rows.map((row) => ({
          id: row.id,
          vyrok: row.vyrok,
          vyhodnotenie: row.vyhodnotenie,
        })),
        getGeminiModel(mode === "fast" ? "lite" : "pro")
      ),
      timeoutPromise,
    ]);

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

    const { sourcesMap, warning } = await fetchSourcesForIds(
      supabase,
      rawMatches.map((m) => m.statement.id),
      logger,
    );
    if (warning) {
      warnings.add(warning);
    }

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
      const articlesStartedAt = performance.now();
      try {
        const { data: articleData, error: articleError } = await supabase.rpc(
          "match_articles",
          {
            query_embedding: embedding,
            match_count: 10,
          }
        );

        if (articleError) {
          warnings.add("related_articles_unavailable");
          logger.warn("article_match_failed", "fetch", {
            route: "/api/detect",
            duration_ms: Math.round(performance.now() - articlesStartedAt),
          }, articleError);
        } else {
          const ARTICLE_SIMILARITY_THRESHOLD = 0.3;
          relatedArticles = ((articleData ?? []) as ArticleMatchRow[])
            .filter((row) => row.similarity >= ARTICLE_SIMILARITY_THRESHOLD)
            .map(toArticle)
            .filter((article) => article.text.length > 0);
        }
      } catch (err) {
        logger.warn("article_match_failed", "fetch", {
          route: "/api/detect",
          duration_ms: Math.round(performance.now() - articlesStartedAt),
        }, err);
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
      ...(warnings.size > 0 ? { warnings: Array.from(warnings) } : {}),
    };

    const nextResponse = NextResponse.json(response);
    nextResponse.headers.set("X-Correlation-ID", correlationId);
    return nextResponse;
  } catch (error) {
    logger.warn("detect_classification_failed", "catch", {
      route: "/api/detect",
      duration_ms: Math.round(performance.now() - start),
    }, error);
    return NextResponse.json({ error: "Classification error" }, { status: 502 });
  }
}
