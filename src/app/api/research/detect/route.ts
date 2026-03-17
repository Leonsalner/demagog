import { NextRequest, NextResponse } from "next/server";

import {
  buildResearchStatementRef,
  mergeStatementRefs,
  toClankyResearchItem,
  toExternalSourceResearchItem,
} from "@/lib/research";
import { getSupabasePublicConfigError, supabasePublic } from "@/lib/supabase";
import { isRecord, normalizeExternalSourceUrl } from "@/lib/utils";
import type { Article, ResearchStatementRef, ResearchWorkspaceResponse, StatementSource } from "@/types";

const MAX_STATEMENT_IDS = 20;
const RELATED_ARTICLE_COUNT = 10;

type DetectResearchRow = {
  id: number;
  vyrok: string;
  meno: string;
  strana: string;
  embedding: number[] | null;
};

type ArticleMatchRow = {
  id: number;
  datum: string | null;
  autor: string | null;
  text_content: string | null;
  title: string | null;
  similarity: number;
};

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

function toArticle(row: ArticleMatchRow): Article {
  return {
    id: row.id,
    datum: row.datum ?? "",
    autor: row.autor ?? "Demagog.sk",
    text: row.text_content?.trim() ?? "",
    title: row.title ?? null,
  };
}

function parseStatementIds(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_STATEMENT_IDS) {
    return null;
  }

  const uniqueIds = Array.from(
    new Set(
      value.filter((item): item is number => typeof item === "number" && Number.isInteger(item) && item > 0),
    ),
  );

  if (uniqueIds.length === 0) {
    return null;
  }

  return uniqueIds;
}

export async function POST(request: NextRequest) {
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
    .select("id, vyrok, meno, strana, embedding")
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
  const articleMap = new Map<number, DedupedArticle>();

  try {
    await Promise.all(
      statementRows
        .filter((statement) => statement.embedding)
        .map(async (statement) => {
          const embedding = statement.embedding;
          if (!embedding) {
            return;
          }

          const { data: articleRows, error: articleError } = await supabase.rpc("match_articles", {
            query_embedding: embedding,
            match_count: RELATED_ARTICLE_COUNT,
          });

          if (articleError) {
            throw articleError;
          }

          const statementRef = statementRefs.get(statement.id);
          if (!statementRef) {
            return;
          }

          for (const row of (articleRows ?? []) as ArticleMatchRow[]) {
            const existing = articleMap.get(row.id);
            const article = toArticle(row);

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
        }),
    );
  } catch {
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

  return NextResponse.json({
    mode: "aggregate",
    items: [
      ...Array.from(articleMap.values())
        .sort((left, right) => right.similarity - left.similarity)
        .map((entry) => toClankyResearchItem(entry.article, entry.statementRefs)),
      ...Array.from(sourceMap.values()).map((entry) =>
        toExternalSourceResearchItem(entry.source, entry.statementRefs),
      ),
    ],
  } satisfies ResearchWorkspaceResponse);
}
