import { NextRequest, NextResponse } from "next/server";

import {
  buildResearchStatementRef,
  mergeStatementRefs,
  toClankyResearchItem,
  toExternalSourceResearchItem,
} from "@/lib/research";
import { createLogger, generateCorrelationId } from "@/lib/logger";
import { getSupabasePublicConfigError, supabasePublic } from "@/lib/supabase";
import { isRecord, normalizeExternalSourceUrl } from "@/lib/utils";
import type {
  Article,
  ResearchStatementRef,
  ResearchWorkspaceResponse,
  StatementSource,
  Verdict,
} from "@/types";

const MAX_STATEMENT_IDS = 20;
const RELATED_ARTICLE_COUNT = 10;

type DetectResearchRow = {
  id: number;
  vyrok: string;
  vyhodnotenie: Verdict;
  meno: string;
  strana: string;
  url: string;
  embedding: number[] | null;
};

type BatchArticleMatchRow = {
  embedding_idx: number;
  id: number;
  datum: string | null;
  autor: string | null;
  text_content: string | null;
  title: string | null;
  similarity: number;
};

type SingleArticleMatchRow = {
  id: number;
  datum: string | null;
  autor: string | null;
  text_content: string | null;
  title: string | null;
  similarity: number;
};

const MATCH_ARTICLES_BATCH_TIMEOUT_MS = 15_000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: Error,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(timeoutError), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

type SourceRow = StatementSource & {
  statement_id: number;
};

type DedupedArticle = {
  article: Article;
  similarity: number;
  statementRefs: ResearchStatementRef[];
};

type DedupedSource = {
  source: SourceRow;
  statementRefs: ResearchStatementRef[];
};

async function fetchArticlesBatch(
  supabase: ReturnType<typeof supabasePublic>,
  statements: DetectResearchRow[],
  statementRefs: Map<number, ResearchStatementRef>,
  matchCount: number,
): Promise<Map<number, DedupedArticle>> {
  const articleMap = new Map<number, DedupedArticle>();
  const statementsWithEmbeddings = statements.filter((s) => s.embedding);

  if (statementsWithEmbeddings.length === 0) {
    return articleMap;
  }

  const embeddings = statementsWithEmbeddings.map((s) => s.embedding as number[]);
  const embeddingIdMap = new Map<number, number>();

  statementsWithEmbeddings.forEach((statement, idx) => {
    if (statement.embedding) {
      embeddingIdMap.set(idx, statement.id);
    }
  });

  let data: unknown;
  let error: { message: string } | null = null;

  try {
    const timeoutError = new Error("match_articles_batch timed out");
    const rpcCall = supabase.rpc("match_articles_batch", {
      query_embeddings: embeddings,
      match_count: matchCount,
    });
    // Supabase RPC returns a Thenable, wrap it in Promise to ensure compatibility
    const rpcPromise = Promise.resolve(rpcCall);
    const result = await withTimeout(
      rpcPromise,
      MATCH_ARTICLES_BATCH_TIMEOUT_MS,
      timeoutError,
    );
    data = result;
  } catch (err) {
    error = { message: err instanceof Error ? err.message : String(err) };
    data = null;
  }

  if (!error && data) {
    for (const row of (data as BatchArticleMatchRow[])) {
      const statementId = embeddingIdMap.get(row.embedding_idx);
      if (!statementId) continue;

      const statementRef = statementRefs.get(statementId);
      if (!statementRef) continue;

      const article: Article = {
        id: row.id,
        datum: row.datum ?? "",
        autor: row.autor ?? "Demagog.sk",
        text: row.text_content?.trim() ?? "",
        title: row.title ?? null,
      };

      const existing = articleMap.get(row.id);

      if (!existing) {
        articleMap.set(row.id, {
          article,
          similarity: row.similarity,
          statementRefs: [statementRef],
        });
        continue;
      }

      existing.statementRefs = mergeStatementRefs(existing.statementRefs, [statementRef]);
      if (row.similarity > existing.similarity) {
        existing.article = article;
        existing.similarity = row.similarity;
      }
    }
    return articleMap;
  }

  const MATCH_ARTICLES_TIMEOUT_MS = 5_000;

  for (const [idx, embedding] of embeddings.entries()) {
    const statementId = embeddingIdMap.get(idx);
    if (!statementId) continue;

    const statementRef = statementRefs.get(statementId);
    if (!statementRef) continue;

    let singleData: unknown;
    let singleError: { message: string } | null = null;

    try {
      const timeoutError = new Error("match_articles timed out");
      const rpcPromise = Promise.resolve(
        supabase.rpc("match_articles", {
          query_embedding: embedding,
          match_count: matchCount,
        }),
      );
      singleData = await withTimeout(rpcPromise, MATCH_ARTICLES_TIMEOUT_MS, timeoutError);
    } catch (err) {
      singleError = { message: err instanceof Error ? err.message : String(err) };
      singleData = null;
    }

    if (singleError || !singleData) continue;

    for (const row of (singleData as SingleArticleMatchRow[])) {
      const article: Article = {
        id: row.id,
        datum: row.datum ?? "",
        autor: row.autor ?? "Demagog.sk",
        text: row.text_content?.trim() ?? "",
        title: row.title ?? null,
      };

      const existing = articleMap.get(row.id);

      if (!existing) {
        articleMap.set(row.id, {
          article,
          similarity: row.similarity,
          statementRefs: [statementRef],
        });
        continue;
      }

      existing.statementRefs = mergeStatementRefs(existing.statementRefs, [statementRef]);
      if (row.similarity > existing.similarity) {
        existing.article = article;
        existing.similarity = row.similarity;
      }
    }
  }

  return articleMap;
}

function parseStatementIds(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_STATEMENT_IDS) {
    return null;
  }

  if (!value.every((item) => typeof item === "number" && Number.isInteger(item) && item > 0)) {
    return null;
  }

  return Array.from(new Set(value));
}

export async function POST(request: NextRequest) {
  const correlationId = request.headers.get("X-Correlation-ID") 
    ?? request.headers.get("X-Request-ID") 
    ?? generateCorrelationId();
  const logger = createLogger(correlationId);

  const supabaseConfigError = getSupabasePublicConfigError();
  if (supabaseConfigError) {
    return NextResponse.json({ error: supabaseConfigError }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const statementIds = parseStatementIds(body.statement_ids);
  if (!statementIds) {
    return NextResponse.json(
      { error: `statement_ids must be a non-empty array of up to ${MAX_STATEMENT_IDS} positive integers` },
      { status: 400 },
    );
  }

  const supabase = supabasePublic();
  const { data: statements, error: statementError } = await supabase
    .from("vyroky")
    .select("id, vyrok, vyhodnotenie, meno, strana, url, embedding")
    .in("id", statementIds);

  if (statementError) {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }

  if (!statements || statements.length === 0) {
    return NextResponse.json({ error: "Statements not found" }, { status: 404 });
  }

  const statementRows = statements as DetectResearchRow[];
  const statementRefs = new Map(
    statementRows.map((statement) => [statement.id, buildResearchStatementRef(statement)]),
  );

  let articleMap: Map<number, DedupedArticle>;
  try {
    articleMap = await fetchArticlesBatch(
      supabase,
      statementRows,
      statementRefs,
      RELATED_ARTICLE_COUNT,
    );
  } catch (err) {
    logger.error("research_article_match_fatal", "fetch", {
      route: "/api/research/detect",
      statement_ids: statementIds.length,
    }, err);
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }

  const { data: sourceRows, error: sourceError } = await supabase
    .from("statement_sources")
    .select("id, statement_id, position, label, url, title")
    .in("statement_id", statementIds)
    .order("position");

  if (sourceError) {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }

  const sourceMap = new Map<string, DedupedSource>();

  for (const source of (sourceRows ?? []) as SourceRow[]) {
    const statementRef = statementRefs.get(source.statement_id);
    if (!statementRef) {
      continue;
    }

    const key = normalizeExternalSourceUrl(source.url);
    const existing = sourceMap.get(key);

    if (!existing) {
      sourceMap.set(key, {
        source,
        statementRefs: [statementRef],
      });
      continue;
    }

    existing.statementRefs = mergeStatementRefs(existing.statementRefs, [statementRef]);
  }

  const response: ResearchWorkspaceResponse = {
    mode: "aggregate",
    items: [
      ...Array.from(articleMap.values())
        .sort((left, right) => right.similarity - left.similarity)
        .map((entry) => toClankyResearchItem(entry.article, entry.statementRefs)),
      ...Array.from(sourceMap.values()).map((entry) =>
        toExternalSourceResearchItem(entry.source, entry.statementRefs),
      ),
    ],
  };

  const nextResponse = NextResponse.json(response);
  nextResponse.headers.set("X-Correlation-ID", correlationId);
  return nextResponse;
}
