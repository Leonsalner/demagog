import { NextRequest, NextResponse } from "next/server";

import {
  buildResearchStatementRef,
  toAnalysisResearchItem,
  toClankyResearchItem,
  toExternalSourceResearchItem,
} from "@/lib/research";
import { getSupabasePublicConfigError, supabasePublic } from "@/lib/supabase";
import { isRecord } from "@/lib/utils";
import type { Article, ResearchWorkspaceResponse, StatementSource, Verdict } from "@/types";

const RELATED_ARTICLE_COUNT = 10;

type StatementResearchRow = {
  id: number;
  vyrok: string;
  vyhodnotenie: Verdict;
  odovodnenie: string | null;
  datum: string | null;
  meno: string;
  strana: string;
  url: string;
  speaker_url: string | null;
  embedding: number[] | null;
  analysis_paragraphs: unknown[];
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

function toArticle(row: ArticleMatchRow): Article {
  return {
    id: row.id,
    datum: row.datum ?? "",
    autor: row.autor ?? "Demagog.sk",
    text: row.text_content?.trim() ?? "",
    title: row.title ?? null,
  };
}

function coerceStatementId(value: unknown): number | null {
  if (!Number.isInteger(value) || typeof value !== "number" || value <= 0) {
    return null;
  }

  return value;
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

  const statementId = coerceStatementId(body.statement_id);
  if (statementId === null) {
    return NextResponse.json({ error: "statement_id must be a positive integer" }, { status: 400 });
  }

  const supabase = supabasePublic();
  const { data: statement, error: statementError } = await supabase
    .from("vyroky")
    .select(
      "id, vyrok, vyhodnotenie, odovodnenie, datum, meno, strana, url, speaker_url, embedding, analysis_paragraphs",
    )
    .eq("id", statementId)
    .maybeSingle();

  if (statementError) {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }

  if (!statement) {
    return NextResponse.json({ error: "Statement not found" }, { status: 404 });
  }

  const statementRow = statement as StatementResearchRow;
  const statementRef = buildResearchStatementRef(statementRow);
  const items: ResearchWorkspaceResponse["items"] = [
    toAnalysisResearchItem({
      statementRef,
      analysisParagraphs: statementRow.analysis_paragraphs,
      fallbackReasoning: statementRow.odovodnenie,
      verdict: statementRow.vyhodnotenie,
    }),
  ];

  if (statementRow.embedding) {
    const { data: articleRows, error: articleError } = await supabase.rpc("match_articles", {
      query_embedding: statementRow.embedding,
      match_count: RELATED_ARTICLE_COUNT,
    });

    if (articleError) {
      return NextResponse.json({ error: "Database error" }, { status: 502 });
    }

    items.push(
      ...((articleRows ?? []) as ArticleMatchRow[]).map((row) =>
        toClankyResearchItem(toArticle(row), [statementRef]),
      ),
    );
  }

  const { data: sourceRows, error: sourceError } = await supabase
    .from("statement_sources")
    .select("id, statement_id, position, label, url, title")
    .eq("statement_id", statementId)
    .order("position");

  if (sourceError) {
    return NextResponse.json({ error: "Database error" }, { status: 502 });
  }

  items.push(
    ...((sourceRows ?? []) as SourceRow[]).map((source) =>
      toExternalSourceResearchItem(source, [statementRef]),
    ),
  );

  return NextResponse.json({
    mode: "statement",
    items,
  } satisfies ResearchWorkspaceResponse);
}
