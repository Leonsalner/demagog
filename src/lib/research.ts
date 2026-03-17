import { extractDomain, extractPseudoTitle, isRecord } from "@/lib/utils";
import type {
  Article,
  ResearchItem,
  ResearchStatementRef,
  StatementSource,
  Verdict,
} from "@/types";

type ResearchStatementLike = {
  id: number;
  vyrok: string;
  meno: string;
  strana: string;
};

type ResearchArticleLike = Article & {
  similarity?: number;
};

function collectParagraphText(value: unknown, segments: string[]): void {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      segments.push(trimmed);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectParagraphText(entry, segments));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const directKeys = ["text", "content", "paragraph", "value", "body", "label"] as const;
  for (const key of directKeys) {
    const directValue = value[key];
    if (typeof directValue === "string") {
      const trimmed = directValue.trim();
      if (trimmed) {
        segments.push(trimmed);
        return;
      }
    }
  }

  const nestedKeys = ["children", "items", "parts", "paragraphs", "nodes"] as const;
  for (const key of nestedKeys) {
    if (key in value) {
      collectParagraphText(value[key], segments);
    }
  }
}

export function buildResearchStatementRef(
  statement: ResearchStatementLike,
): ResearchStatementRef {
  return {
    statement_id: statement.id,
    vyrok: statement.vyrok,
    meno: statement.meno,
    strana: statement.strana,
  };
}

export function mergeStatementRefs(
  refs: ResearchStatementRef[],
  additions: ResearchStatementRef[],
): ResearchStatementRef[] {
  const byId = new Map<number, ResearchStatementRef>();

  for (const ref of refs) {
    byId.set(ref.statement_id, ref);
  }

  for (const ref of additions) {
    byId.set(ref.statement_id, ref);
  }

  return Array.from(byId.values());
}

export function buildAnalysisBody(
  analysisParagraphs: unknown[] | null | undefined,
  fallbackReasoning: string | null,
): string | null {
  const paragraphs: string[] = [];

  if (Array.isArray(analysisParagraphs)) {
    analysisParagraphs.forEach((entry) => collectParagraphText(entry, paragraphs));
  }

  const normalizedParagraphs = paragraphs.filter(
    (paragraph, index) => paragraphs.indexOf(paragraph) === index,
  );

  if (normalizedParagraphs.length > 0) {
    return normalizedParagraphs.join("\n\n");
  }

  const reasoning = fallbackReasoning?.trim();
  return reasoning ? reasoning : null;
}

export function toAnalysisResearchItem(options: {
  statementRef: ResearchStatementRef;
  analysisParagraphs: unknown[] | null | undefined;
  fallbackReasoning: string | null;
  verdict?: Verdict | null;
}): ResearchItem {
  return {
    id: `analysis:${options.statementRef.statement_id}`,
    kind: "analysis",
    title: "Analýza",
    body: buildAnalysisBody(options.analysisParagraphs, options.fallbackReasoning),
    url: null,
    domain: null,
    author: null,
    date: null,
    statement_refs: [options.statementRef],
    verdict: options.verdict ?? null,
  };
}

export function toClankyResearchItem(
  article: ResearchArticleLike,
  statementRefs: ResearchStatementRef[],
): ResearchItem {
  const title = article.title?.trim() || extractPseudoTitle(article.text);

  return {
    id: `clanky:${article.id}`,
    kind: "clanky_article",
    title,
    body: article.text.trim() || null,
    url: null,
    domain: null,
    author: article.autor ?? null,
    date: article.datum ?? null,
    statement_refs: statementRefs,
  };
}

export function toExternalSourceResearchItem(
  source: Pick<StatementSource, "id" | "label" | "url" | "title">,
  statementRefs: ResearchStatementRef[],
): ResearchItem {
  const domain = extractDomain(source.url);

  return {
    id: `source:${source.id}`,
    kind: "external_source",
    title: source.title?.trim() || source.label.trim() || domain || "Externý zdroj",
    body: null,
    url: source.url,
    domain,
    author: null,
    date: null,
    statement_refs: statementRefs,
  };
}
