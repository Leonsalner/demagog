import { NextRequest, NextResponse } from "next/server";

import { embedText } from "@/lib/jina";
import { rerankResults, understandQuery } from "@/lib/gemini";
import { getSupabasePublicConfigError, supabasePublic } from "@/lib/supabase";
import { isRecord, VERDICTS } from "@/lib/utils";
import type {
  Article,
  QueryUnderstanding,
  SearchRequest,
  SearchResponse,
  Statement,
  StatementSource,
  Verdict,
} from "@/types";
const SEARCH_TIMINGS_FLAG = "DEBUG_SEARCH_TIMINGS";
const SEARCH_RERANK_FLAG = "ENABLE_SEARCH_RERANK";

type DistinctQueryValues = {
  meno: string[];
  strana: string[];
};

type SearchStageTimings = Partial<
  Record<
    | "distinct_values_ms"
    | "understand_query_ms"
    | "embed_text_ms"
    | "search_statements_ms"
    | "rerank_ms"
    | "related_results_ms"
    | "related_articles_ms"
    | "sources_ms",
    number
  >
>;

interface SearchRow {
  id: number;
  vyrok: string;
  vyhodnotenie: Verdict;
  odovodnenie: string | null;
  datum: string | null;
  meno: string;
  strana: string;
  url: string;
  speaker_url: string | null;
  similarity?: number | null;
}

interface SourceRow {
  id: number;
  statement_id: number;
  position: number;
  label: string;
  url: string;
  title: string | null;
}

interface ArticleMatchRow {
  id: number;
  datum: string | null;
  autor: string | null;
  text_content: string | null;
  similarity: number;
}

const ARTICLE_SIMILARITY_THRESHOLD = 0.3;

function toArticle(row: ArticleMatchRow): Article {
  return {
    id: row.id,
    datum: row.datum ?? "",
    autor: row.autor ?? "Demagog.sk",
    text: row.text_content?.trim() ?? "",
  };
}

function toStatement(row: SearchRow): Statement {
  const statement: Statement = {
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

  if (typeof row.similarity === "number") {
    statement.similarity = row.similarity;
  }

  return statement;
}

function attachSources(
  statements: Statement[],
  sourcesMap: Map<number, StatementSource[]>,
): Statement[] {
  return statements.map((statement) => {
    const sources = sourcesMap.get(statement.id);
    return sources && sources.length > 0 ? { ...statement, sources } : statement;
  });
}

function coerceOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function coerceOptionalStringOrArray(
  value: unknown
): string | string[] | undefined {
  if (Array.isArray(value)) {
    const items = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    return items.length > 0 ? items : undefined;
  }

  return coerceOptionalString(value);
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
    filter_vyhodnotenie: body.vyhodnotenie ?? null,
    filter_meno: Array.isArray(body.meno) ? (body.meno[0] ?? null) : body.meno ?? null,
    filter_datum_od: body.datum_od ?? null,
    filter_datum_do: body.datum_do ?? null,
  };
}

function mergeQueryFilters(
  body: SearchRequest,
  extractedFilters: QueryUnderstanding["filters"]
): SearchRequest {
  return {
    ...body,
    meno: body.meno ?? extractedFilters.meno ?? undefined,
    strana: body.strana ?? extractedFilters.strana ?? undefined,
    vyhodnotenie:
      body.vyhodnotenie ?? extractedFilters.vyhodnotenie ?? undefined,
  };
}

function normalizeForMatching(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function tokenizeForMatching(value: string): string[] {
  const normalized = normalizeForMatching(value);
  return normalized.length > 0 ? normalized.split(" ") : [];
}

function readBooleanEnv(name: string): boolean {
  const value = process.env[name]?.trim().toLocaleLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function shouldLogSearchTimings(): boolean {
  return process.env.NODE_ENV === "development" || readBooleanEnv(SEARCH_TIMINGS_FLAG);
}

function recordStageTiming(
  timings: SearchStageTimings,
  key: keyof SearchStageTimings,
  startedAt: number
) {
  timings[key] = Math.round(performance.now() - startedAt);
}

function logSearchTimings(
  query: string,
  page: number,
  pageSize: number,
  timings: SearchStageTimings
) {
  if (!shouldLogSearchTimings()) {
    return;
  }

  console.info("[search] timings", {
    query,
    page,
    page_size: pageSize,
    ...timings,
  });
}

function queryHasSentenceShape(query: string): boolean {
  return /[?!,:;]/u.test(query) || query.trim().split(/\s+/u).length > 6;
}

function hasStructuredSearchFilters(body: SearchRequest): boolean {
  return Boolean(
    body.meno ||
      body.strana ||
      body.vyhodnotenie ||
      body.datum_od ||
      body.datum_do
  );
}

function containsTokenSequence(queryTokens: string[], candidateTokens: string[]): boolean {
  if (candidateTokens.length === 0 || candidateTokens.length > queryTokens.length) {
    return false;
  }

  for (let start = 0; start <= queryTokens.length - candidateTokens.length; start += 1) {
    let matches = true;

    for (let offset = 0; offset < candidateTokens.length; offset += 1) {
      if (queryTokens[start + offset] !== candidateTokens[offset]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return true;
    }
  }

  return false;
}

function findExactCandidateInQuery(query: string, candidates: string[]): string | null {
  const queryTokens = tokenizeForMatching(query);
  const sortedCandidates = [...candidates].sort((left, right) => right.length - left.length);

  for (const candidate of sortedCandidates) {
    const candidateTokens = tokenizeForMatching(candidate);

    if (containsTokenSequence(queryTokens, candidateTokens)) {
      return candidate;
    }
  }

  return null;
}

function findUniqueNameSurnameInQuery(query: string, candidates: string[]): string | null {
  const queryTokens = new Set(tokenizeForMatching(query));

  if (queryTokens.size === 0) {
    return null;
  }

  const surnameMatches = new Map<string, string[]>();

  for (const candidate of candidates) {
    const candidateTokens = tokenizeForMatching(candidate);
    const surname = candidateTokens.at(-1);

    if (!surname || surname.length < 3) {
      continue;
    }

    const matches = surnameMatches.get(surname);

    if (matches) {
      matches.push(candidate);
    } else {
      surnameMatches.set(surname, [candidate]);
    }
  }

  for (const token of queryTokens) {
    const matches = surnameMatches.get(token);

    if (matches?.length === 1) {
      return matches[0] ?? null;
    }
  }

  return null;
}

function findNameInQuery(query: string, candidates: string[]): string | null {
  return (
    findExactCandidateInQuery(query, candidates) ??
    findUniqueNameSurnameInQuery(query, candidates)
  );
}

function getNameAliases(name: string | null | undefined): string[] {
  if (!name) {
    return [];
  }

  const tokens = name.trim().split(/\s+/u).filter(Boolean);
  const surname = tokens.at(-1);

  if (!surname || surname === name) {
    return [name];
  }

  return [name, surname];
}

function stripMatchedTerms(query: string, values: Array<string | null | undefined>): string {
  const originalTokens = query.trim().split(/\s+/u).filter(Boolean);
  const normalizedTokens = originalTokens.map((token) => normalizeForMatching(token));
  const ignoredIndexes = new Set<number>();
  const sequences = values
    .flatMap((value) => {
      if (!value) {
        return [];
      }

      const tokens = tokenizeForMatching(value);
      return tokens.length > 0 ? [tokens] : [];
    })
    .sort((left, right) => right.length - left.length);

  for (const sequence of sequences) {
    for (let start = 0; start <= normalizedTokens.length - sequence.length; start += 1) {
      const matches = sequence.every(
        (token, index) =>
          !ignoredIndexes.has(start + index) && normalizedTokens[start + index] === token
      );

      if (!matches) {
        continue;
      }

      for (let index = 0; index < sequence.length; index += 1) {
        ignoredIndexes.add(start + index);
      }

      break;
    }
  }

  return originalTokens.filter((_, index) => !ignoredIndexes.has(index)).join(" ").trim();
}

function detectVerdictFromQuery(query: string): Verdict | null {
  const normalizedQuery = normalizeForMatching(query);

  if (normalizedQuery.includes("neoveritelne")) {
    return "Neoveriteľné";
  }

  if (normalizedQuery.includes("zavadzajuce")) {
    return "Zavádzajúce";
  }

  if (normalizedQuery.includes("nepravda")) {
    return "Nepravda";
  }

  if (normalizedQuery.includes("pravda")) {
    return "Pravda";
  }

  return null;
}

function buildFastQueryUnderstanding(
  body: SearchRequest,
  query: string,
  availableNames: string[],
  availableParties: string[]
): QueryUnderstanding {
  const selectedName = Array.isArray(body.meno) ? body.meno[0] : body.meno;
  const detectedName = selectedName ?? findNameInQuery(query, availableNames);
  const detectedParty = body.strana ?? findExactCandidateInQuery(query, availableParties);
  const detectedVerdict = body.vyhodnotenie ?? detectVerdictFromQuery(query);
  const semanticQuery =
    stripMatchedTerms(query, [
      ...getNameAliases(detectedName),
      detectedParty,
      detectedVerdict,
      ...(Array.isArray(body.meno) ? body.meno : [body.meno]),
      body.strana,
      body.vyhodnotenie,
    ]) || query;

  return {
    semantic_query: semanticQuery,
    filters: {
      meno: detectedName,
      strana: detectedParty,
      vyhodnotenie: detectedVerdict,
    },
    related_politicians: [],
  };
}

function shouldUseFastQueryUnderstanding(
  body: SearchRequest,
  query: string,
  availableNames: string[],
  availableParties: string[]
): boolean {
  if (hasStructuredSearchFilters(body)) {
    return true;
  }

  // Name-only detection no longer forces the fast path. When a name is
  // the only signal, the LLM decides whether the user means statements
  // FROM the politician or ABOUT the politician.

  if (findExactCandidateInQuery(query, availableParties)) {
    return true;
  }

  if (detectVerdictFromQuery(query)) {
    return true;
  }

  return !queryHasSentenceShape(query) && !findNameInQuery(query, availableNames);
}

function resolveAvailableValue(
  value: string | null,
  availableValues: string[]
): string | null {
  if (!value) {
    return null;
  }

  const normalizedValue = normalizeForMatching(value);
  const exactMatch = availableValues.find(
    (candidate) => normalizeForMatching(candidate) === normalizedValue
  );

  if (exactMatch) {
    return exactMatch;
  }

  const fuzzyMatch = availableValues.find((candidate) => {
    const normalizedCandidate = normalizeForMatching(candidate);
    return (
      normalizedCandidate.startsWith(normalizedValue) ||
      normalizedCandidate.includes(normalizedValue) ||
      normalizedValue.includes(normalizedCandidate)
    );
  });

  return fuzzyMatch ?? null;
}

function validateExtractedFilters(
  filters: QueryUnderstanding["filters"],
  availableNames: string[],
  availableParties: string[]
): QueryUnderstanding["filters"] {
  return {
    meno: resolveAvailableValue(filters.meno, availableNames),
    strana: resolveAvailableValue(filters.strana, availableParties),
    vyhodnotenie: filters.vyhodnotenie,
  };
}

function validateRelatedPoliticians(
  relatedPoliticians: QueryUnderstanding["related_politicians"],
  availableNames: string[]
): QueryUnderstanding["related_politicians"] {
  const seenNames = new Set<string>();

  return relatedPoliticians.flatMap((politician) => {
    const meno = resolveAvailableValue(politician.meno, availableNames);

    if (!meno || seenNames.has(meno)) {
      return [];
    }

    seenNames.add(meno);
    return [{ ...politician, meno }];
  });
}

async function fetchDistinctValues(
  supabase: ReturnType<typeof supabasePublic>,
  column: "meno" | "strana"
): Promise<string[]> {
  const { data, error } = await supabase.rpc("list_distinct_values", {
    col: column,
  });

  if (error) {
    console.error(
      "[search] list_distinct_values RPC error:",
      error.code,
      error.message,
      error.details
    );
    return [];
  }

  const rows = (data ?? []) as Array<{ value?: string | null }>;

  return Array.from(
    new Set(
      rows
        .map((row) => row.value)
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, "sk"));
}

async function fetchAvailableQueryValues(
  supabase: ReturnType<typeof supabasePublic>
): Promise<DistinctQueryValues> {
  const [meno, strana] = await Promise.all([
    fetchDistinctValues(supabase, "meno"),
    fetchDistinctValues(supabase, "strana"),
  ]);

  return { meno, strana };
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

export function resetSearchRouteStateForTests() {
  // Distinct values are loaded directly from the database per request.
}

function buildRelatedFilterParams(body: SearchRequest, meno: string) {
  return {
    filter_strana: null,
    filter_vyhodnotenie: body.vyhodnotenie ?? null,
    filter_meno: meno,
    filter_datum_od: body.datum_od ?? null,
    filter_datum_do: body.datum_do ?? null,
  };
}

async function fetchRelatedResults(
  supabase: ReturnType<typeof supabasePublic>,
  queryEmbedding: number[],
  body: SearchRequest,
  relatedPoliticians: QueryUnderstanding["related_politicians"],
  excludedIds: Set<number>
): Promise<Statement[]> {
  if (relatedPoliticians.length === 0) {
    return [];
  }

  const searches = await Promise.all(
    relatedPoliticians.slice(0, 3).map(async (politician) => {
      const { data, error } = await supabase.rpc("search_statements", {
        query_embedding: queryEmbedding,
        match_count: 5,
        match_offset: 0,
        ...buildRelatedFilterParams(body, politician.meno),
      });

      if (error) {
        return [];
      }

      return ((data ?? []) as SearchRow[]).map(toStatement);
    })
  );

  const relatedResults: Statement[] = [];
  const seenIds = new Set(excludedIds);

  for (const candidates of searches) {
    const candidate = candidates[0];

    if (!candidate || seenIds.has(candidate.id)) {
      continue;
    }

    relatedResults.push(candidate);
    seenIds.add(candidate.id);

    if (relatedResults.length === 5) {
      return relatedResults;
    }
  }

  const remainingCandidates = searches
    .flatMap((candidates) => candidates.slice(1))
    .filter((candidate) => !seenIds.has(candidate.id))
    .sort(
      (left, right) => (right.similarity ?? 0) - (left.similarity ?? 0)
    );

  for (const candidate of remainingCandidates) {
    relatedResults.push(candidate);
    seenIds.add(candidate.id);

    if (relatedResults.length === 5) {
      break;
    }
  }

  return relatedResults;
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

  if (!isRecord(parsedBody)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawVerdict = parsedBody.vyhodnotenie;
  const coercedVerdict = coerceOptionalVerdict(rawVerdict);
  if (
    typeof rawVerdict === "string" &&
    rawVerdict.trim().length > 0 &&
    coercedVerdict === undefined
  ) {
    return NextResponse.json(
      { error: "Invalid verdict value" },
      { status: 400 }
    );
  }

  const body: SearchRequest = {
    query: coerceOptionalString(parsedBody.query),
    strana: coerceOptionalString(parsedBody.strana),
    vyhodnotenie: coercedVerdict,
    meno: coerceOptionalStringOrArray(parsedBody.meno),
    datum_od: coerceOptionalString(parsedBody.datum_od),
    datum_do: coerceOptionalString(parsedBody.datum_do),
    page: coercePositiveInteger(parsedBody.page, 1),
    page_size: coercePositiveInteger(parsedBody.page_size, 20, 50),
  };

  const page = body.page ?? 1;
  const pageSize = body.page_size ?? 20;
  const offset = (page - 1) * pageSize;
  const timings: SearchStageTimings = {};

  try {
    let results: Statement[] = [];
    let totalCount = 0;
    let hasMore: boolean | undefined;
    let relatedResults: Statement[] | undefined;
    let relatedArticles: Article[] | undefined;
    let queryUnderstanding: SearchResponse["query_understanding"] | undefined;

    if (body.query) {
      const distinctValuesStartedAt = performance.now();
      const {
        meno: allNames,
        strana: allParties,
      } = await fetchAvailableQueryValues(supabase);
      recordStageTiming(timings, "distinct_values_ms", distinctValuesStartedAt);

      const understandingStartedAt = performance.now();
      const understanding = shouldUseFastQueryUnderstanding(
        body,
        body.query,
        allNames,
        allParties
      )
        ? buildFastQueryUnderstanding(body, body.query, allNames, allParties)
        : await understandQuery(body.query, allNames, allParties);
      recordStageTiming(timings, "understand_query_ms", understandingStartedAt);
      const validatedFilters = validateExtractedFilters(
        understanding.filters,
        allNames,
        allParties
      );
      const validatedRelatedPoliticians = validateRelatedPoliticians(
        understanding.related_politicians,
        allNames
      );
      const mergedBody = mergeQueryFilters(body, validatedFilters);
      const semanticQuery = understanding.semantic_query.trim() || body.query;

      let embedding: number[];
      const embedStartedAt = performance.now();
      try {
        embedding = await embedText(semanticQuery);
      } catch {
        return NextResponse.json(
          { error: "Embedding service unavailable" },
          { status: 502 }
        );
      }
      recordStageTiming(timings, "embed_text_ms", embedStartedAt);

      const filterParams = buildFilterParams(mergedBody);
      const searchStartedAt = performance.now();
      const [searchResult, countResult] = await Promise.all([
        supabase.rpc("search_statements", {
          query_embedding: embedding,
          match_count: pageSize,
          match_offset: offset,
          ...filterParams,
        }),
        supabase.rpc("count_statements", {
          ...filterParams,
          require_embedding: true,
        }),
      ]);
      recordStageTiming(timings, "search_statements_ms", searchStartedAt);

      if (searchResult.error || countResult.error) {
        console.error(
          "[search] semantic search RPC error:",
          searchResult.error?.code ?? countResult.error?.code,
          searchResult.error?.message ?? countResult.error?.message,
          searchResult.error?.details ?? countResult.error?.details
        );
        return NextResponse.json({ error: "Database error" }, { status: 502 });
      }

      const semanticRows = ((searchResult.data ?? []) as SearchRow[]).map(toStatement);
      let orderedRows = semanticRows;

      if (readBooleanEnv(SEARCH_RERANK_FLAG) && semanticRows.length > 5) {
        const rerankStartedAt = performance.now();
        const rerankedIds = await rerankResults(
          body.query,
          semanticRows.map((row) => ({ id: row.id, vyrok: row.vyrok }))
        );
        recordStageTiming(timings, "rerank_ms", rerankStartedAt);
        const rowsById = new Map(semanticRows.map((row) => [row.id, row]));
        orderedRows = rerankedIds
          .map((id) => rowsById.get(id))
          .filter((row): row is Statement => Boolean(row));
      }

      results = orderedRows;
      totalCount = countResult.data ?? 0;
      hasMore = offset + results.length < totalCount;
      const relatedResultsStartedAt = performance.now();
      relatedResults = await fetchRelatedResults(
        supabase,
        embedding,
        mergedBody,
        validatedRelatedPoliticians,
        new Set(results.map((statement) => statement.id))
      );
      recordStageTiming(timings, "related_results_ms", relatedResultsStartedAt);

      const articlesStartedAt = performance.now();
      try {
        const { data: articleData, error: articleError } = await supabase.rpc(
          "match_articles",
          { query_embedding: embedding, match_count: 5 }
        );

        if (!articleError) {
          relatedArticles = ((articleData ?? []) as ArticleMatchRow[])
            .filter((row) => row.similarity >= ARTICLE_SIMILARITY_THRESHOLD)
            .map(toArticle)
            .filter((article) => article.text.length > 0);

          if (relatedArticles.length === 0) {
            relatedArticles = undefined;
          }
        }
      } catch {
        // Article context is best-effort; do not fail the search.
      }
      recordStageTiming(timings, "related_articles_ms", articlesStartedAt);

      queryUnderstanding = {
        extracted_filters: validatedFilters,
        related_politicians: validatedRelatedPoliticians,
      };
    } else {
      let query = supabase
        .from("vyroky")
        .select(
          "id, vyrok, vyhodnotenie, odovodnenie, datum, meno, strana, url, speaker_url",
          { count: "exact" }
        );

      if (body.strana) {
        query = query.eq("strana", body.strana);
      }
      if (body.vyhodnotenie) {
        query = query.eq("vyhodnotenie", body.vyhodnotenie);
      }
      if (body.meno) {
        const mena = Array.isArray(body.meno) ? body.meno : [body.meno];
        query = query.in("meno", mena);
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

    // Fetch and attach statement sources for all result IDs.
    const sourcesStartedAt = performance.now();
    const allIds = [
      ...results.map((s) => s.id),
      ...(relatedResults ?? []).map((s) => s.id),
    ];
    const sourcesMap = await fetchSourcesForIds(supabase, allIds);
    recordStageTiming(timings, "sources_ms", sourcesStartedAt);

    results = attachSources(results, sourcesMap);
    if (relatedResults) {
      relatedResults = attachSources(relatedResults, sourcesMap);
    }

    const response: SearchResponse = {
      results,
      total_count: totalCount,
      page,
      page_size: pageSize,
      query_time_ms: Math.round(performance.now() - start),
      ...(typeof hasMore === "boolean" ? { has_more: hasMore } : {}),
      ...(relatedResults && relatedResults.length > 0
        ? { related_results: relatedResults }
        : {}),
      ...(relatedArticles && relatedArticles.length > 0
        ? { related_articles: relatedArticles }
        : {}),
      ...(queryUnderstanding ? { query_understanding: queryUnderstanding } : {}),
    };

    logSearchTimings(body.query ?? "", page, pageSize, timings);

    return NextResponse.json(response);
  } catch (error) {
    console.error("[search] unhandled error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
