import { NextRequest, NextResponse } from "next/server";

import { embedText } from "@/lib/jina";
import { rerankResults, understandQuery } from "@/lib/gemini";
import {
  buildKeywordTerms,
  normalizeForMatching,
  scoreTextAgainstQuery,
  tokenizeForMatching,
} from "@/lib/lexical-match";
import { extractDateFiltersFromQuery, normalizeExtractedDateFilters } from "@/lib/search-date-understanding";
import { getSupabasePublicConfigError, supabasePublic } from "@/lib/supabase";
import { isRecord, VERDICTS } from "@/lib/utils";
import type {
  Article,
  QueryUnderstanding,
  MultiValueFilter,
  SearchRequest,
  SearchResponse,
  Statement,
  StatementSource,
  Verdict,
} from "@/types";
const SEARCH_TIMINGS_FLAG = "DEBUG_SEARCH_TIMINGS";
const SEARCH_RERANK_FLAG = "ENABLE_SEARCH_RERANK";
const LEXICAL_SEARCH_CANDIDATE_LIMIT = 250;
const LEXICAL_SEARCH_ROWS_PER_TERM = 40;

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
  title: string | null;
  similarity: number;
}

const ARTICLE_SIMILARITY_THRESHOLD = 0.3;
let searchStatementsRpcAvailable: boolean | null = null;

function toArticle(row: ArticleMatchRow): Article {
  return {
    id: row.id,
    datum: row.datum ?? "",
    autor: row.autor ?? "Demagog.sk",
    text: row.text_content?.trim() ?? "",
    title: row.title ?? null,
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

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function toFilterArray<T>(value: MultiValueFilter<T> | null | undefined): T[] | null {
  if (value == null) {
    return null;
  }

  return Array.isArray(value) ? value : [value];
}

function flattenFilterValues(
  values: Array<string | string[] | null | undefined>
): string[] {
  return dedupeStrings(
    values.flatMap((value) => {
      if (Array.isArray(value)) {
        return value;
      }

      return value ? [value] : [];
    }),
  );
}

function coerceOptionalStringArray(
  value: unknown
): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    return items.length > 0 ? dedupeStrings(items) : undefined;
  }

  const singleValue = coerceOptionalString(value);
  return singleValue ? [singleValue] : undefined;
}

function coerceOptionalVerdictArray(value: unknown):
  | { value: Verdict[] | undefined; invalid: boolean }
  | { value: undefined; invalid: boolean } {
  const values = Array.isArray(value) ? value : [value];
  const normalizedValues = values
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalizedValues.length === 0) {
    return { value: undefined, invalid: false };
  }

  const verdicts = normalizedValues.filter((item): item is Verdict =>
    VERDICTS.includes(item as Verdict)
  );

  return {
    value: verdicts.length > 0 ? dedupeStrings(verdicts) as Verdict[] : undefined,
    invalid: verdicts.length !== normalizedValues.length,
  };
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
    filter_strana: toFilterArray(body.strana),
    filter_vyhodnotenie: toFilterArray(body.vyhodnotenie),
    filter_meno: toFilterArray(body.meno),
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
    vyhodnotenie: body.vyhodnotenie ?? extractedFilters.vyhodnotenie ?? undefined,
    datum_od: body.datum_od ?? extractedFilters.datum_od ?? undefined,
    datum_do: body.datum_do ?? extractedFilters.datum_do ?? undefined,
  };
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

function mergeUnderstandingFilters(
  primaryFilters: QueryUnderstanding["filters"],
  fallbackFilters: QueryUnderstanding["filters"]
): QueryUnderstanding["filters"] {
  return {
    meno: primaryFilters.meno ?? fallbackFilters.meno,
    strana: primaryFilters.strana ?? fallbackFilters.strana,
    vyhodnotenie: primaryFilters.vyhodnotenie ?? fallbackFilters.vyhodnotenie,
    datum_od: primaryFilters.datum_od ?? fallbackFilters.datum_od,
    datum_do: primaryFilters.datum_do ?? fallbackFilters.datum_do,
  };
}

function findTokenSequenceStart(
  queryTokens: string[],
  candidateTokens: string[]
): number {
  if (candidateTokens.length === 0 || candidateTokens.length > queryTokens.length) {
    return -1;
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
      return start;
    }
  }

  return -1;
}

function findExactCandidatesInQuery(query: string, candidates: string[]): string[] | null {
  const queryTokens = tokenizeForMatching(query);
  const occupiedIndexes = new Set<number>();
  const matches: Array<{ candidate: string; start: number }> = [];
  const sortedCandidates = [...candidates].sort((left, right) => {
    const leftTokens = tokenizeForMatching(left).length;
    const rightTokens = tokenizeForMatching(right).length;

    if (rightTokens !== leftTokens) {
      return rightTokens - leftTokens;
    }

    return right.length - left.length;
  });

  for (const candidate of sortedCandidates) {
    const candidateTokens = tokenizeForMatching(candidate);
    const start = findTokenSequenceStart(queryTokens, candidateTokens);

    if (start < 0) {
      continue;
    }

    const overlaps = candidateTokens.some((_, index) =>
      occupiedIndexes.has(start + index)
    );

    if (overlaps) {
      continue;
    }

    candidateTokens.forEach((_, index) => occupiedIndexes.add(start + index));
    matches.push({ candidate, start });
  }

  const orderedMatches = matches
    .sort((left, right) => left.start - right.start)
    .map(({ candidate }) => candidate);

  return orderedMatches.length > 0 ? orderedMatches : null;
}

function findUniqueNameSurnamesInQuery(query: string, candidates: string[]): string[] | null {
  const queryTokens = tokenizeForMatching(query);

  if (queryTokens.length === 0) {
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

  const resolvedMatches: string[] = [];
  const seenCandidates = new Set<string>();

  for (const token of queryTokens) {
    const matches = surnameMatches.get(token);

    if (!matches || matches.length !== 1) {
      continue;
    }

    const candidate = matches[0];
    if (seenCandidates.has(candidate)) {
      continue;
    }

    seenCandidates.add(candidate);
    resolvedMatches.push(candidate);
  }

  return resolvedMatches.length > 0 ? resolvedMatches : null;
}

function findNamesInQuery(query: string, candidates: string[]): string[] | null {
  const matches = dedupeStrings([
    ...(findExactCandidatesInQuery(query, candidates) ?? []),
    ...(findUniqueNameSurnamesInQuery(query, candidates) ?? []),
  ]).slice(0, 3);

  return matches.length > 0 ? matches : null;
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

function getNameAliasesForList(names: string[] | null | undefined): string[] {
  return names?.flatMap((name) => getNameAliases(name)) ?? [];
}

function stripMatchedTerms(
  query: string,
  values: Array<string | string[] | null | undefined>
): string {
  const originalTokens = query.trim().split(/\s+/u).filter(Boolean);
  const normalizedTokens = originalTokens.map((token) => normalizeForMatching(token));
  const ignoredIndexes = new Set<number>();
  const sequences = flattenFilterValues(values)
    .flatMap((value) => {
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

function detectVerdictsFromQuery(query: string): Verdict[] | null {
  const queryTokens = tokenizeForMatching(query);
  const detected: Verdict[] = [];

  if (queryTokens.some((token) => token.startsWith("neoverit"))) {
    detected.push("Neoveriteľné");
  }

  if (queryTokens.some((token) => token.startsWith("zavadz"))) {
    detected.push("Zavádzajúce");
  }

  if (queryTokens.some((token) => token.startsWith("nepravd"))) {
    detected.push("Nepravda");
  }

  if (
    queryTokens.some(
      (token) =>
        token === "pravda" ||
        (token.startsWith("pravdiv") && !token.startsWith("nepravdiv"))
    )
  ) {
    detected.push("Pravda");
  }

  return detected.length > 0 ? dedupeStrings(detected) as Verdict[] : null;
}

function buildFastQueryUnderstanding(
  body: SearchRequest,
  query: string,
  availableNames: string[],
  availableParties: string[]
): QueryUnderstanding {
  const detectedNames = toFilterArray(body.meno) ?? findNamesInQuery(query, availableNames);
  const detectedParties =
    toFilterArray(body.strana) ??
    findExactCandidatesInQuery(query, availableParties)?.slice(0, 3) ??
    null;
  const detectedVerdicts =
    toFilterArray(body.vyhodnotenie) ?? detectVerdictsFromQuery(query);
  const detectedDates = extractDateFiltersFromQuery(query);
  const semanticQuery =
    stripMatchedTerms(query, [
      getNameAliasesForList(detectedNames),
      detectedParties,
      detectedVerdicts,
      toFilterArray(body.meno),
      toFilterArray(body.strana),
      toFilterArray(body.vyhodnotenie),
    ]) || query;

  return {
    semantic_query: semanticQuery,
    filters: {
      meno: detectedNames,
      strana: detectedParties,
      vyhodnotenie: detectedVerdicts,
      datum_od: detectedDates.datum_od,
      datum_do: detectedDates.datum_do,
    },
    related_politicians: [],
  };
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

function resolveAvailableValues(
  values: string[] | null,
  availableValues: string[],
  maxCount = 3
): string[] | null {
  if (!values || values.length === 0) {
    return null;
  }

  const resolved = dedupeStrings(
    values
      .map((value) => resolveAvailableValue(value, availableValues))
      .filter((value): value is string => Boolean(value)),
  ).slice(0, maxCount);

  return resolved.length > 0 ? resolved : null;
}

function validateExtractedFilters(
  query: string,
  filters: QueryUnderstanding["filters"],
  availableNames: string[],
  availableParties: string[]
): QueryUnderstanding["filters"] {
  const normalizedDates = normalizeExtractedDateFilters(query, {
    datum_od: filters.datum_od,
    datum_do: filters.datum_do,
  });

  return {
    meno: resolveAvailableValues(filters.meno, availableNames),
    strana: resolveAvailableValues(filters.strana, availableParties),
    vyhodnotenie:
      filters.vyhodnotenie && filters.vyhodnotenie.length > 0
        ? dedupeStrings(filters.vyhodnotenie).slice(0, 3) as Verdict[]
        : null,
    datum_od: normalizedDates.datum_od,
    datum_do: normalizedDates.datum_do,
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
  searchStatementsRpcAvailable = null;
}

function isRpcUnavailable(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === "PGRST202";
}

async function canUseSearchStatementsRpc(
  supabase: ReturnType<typeof supabasePublic>
): Promise<boolean> {
  if (searchStatementsRpcAvailable !== null) {
    return searchStatementsRpcAvailable;
  }

  const probe = await supabase.rpc("search_statements", {
    query_embedding: [0.01, 0.02, 0.03],
    match_count: 1,
    match_offset: 0,
    filter_strana: null,
    filter_vyhodnotenie: null,
    filter_meno: null,
    filter_datum_od: null,
    filter_datum_do: null,
  });

  searchStatementsRpcAvailable = !isRpcUnavailable(probe.error);
  return searchStatementsRpcAvailable;
}

function applyStatementFilters<
  T extends {
    eq: (column: string, value: string) => T;
    in: (column: string, value: string[]) => T;
    gte: (column: string, value: string) => T;
    lte: (column: string, value: string) => T;
  },
>(
  query: T,
  body: SearchRequest
): T {
  let nextQuery = query;

  const strany = toFilterArray(body.strana);
  if (strany) {
    nextQuery = nextQuery.in("strana", strany) as typeof nextQuery;
  }
  const verdicts = toFilterArray(body.vyhodnotenie);
  if (verdicts) {
    nextQuery = nextQuery.in("vyhodnotenie", verdicts) as typeof nextQuery;
  }
  const mena = toFilterArray(body.meno);
  if (mena) {
    nextQuery = nextQuery.in("meno", mena) as typeof nextQuery;
  }
  if (body.datum_od) {
    nextQuery = nextQuery.gte("datum", body.datum_od) as typeof nextQuery;
  }
  if (body.datum_do) {
    nextQuery = nextQuery.lte("datum", body.datum_do) as typeof nextQuery;
  }

  return nextQuery;
}

async function runLexicalSearchFallback(
  supabase: ReturnType<typeof supabasePublic>,
  body: SearchRequest,
  semanticQuery: string,
  page: number,
  pageSize: number
): Promise<{
  results: Statement[];
  totalCount: number;
  hasMore: boolean;
}> {
  const keywordTerms = buildKeywordTerms(semanticQuery, 3);

  if (keywordTerms.length === 0) {
    return { results: [], totalCount: 0, hasMore: false };
  }

  const candidateMap = new Map<number, SearchRow>();

  for (const term of keywordTerms) {
    const query = applyStatementFilters(
      supabase
        .from("vyroky")
        .select("id, vyrok, vyhodnotenie, odovodnenie, datum, meno, strana, url, speaker_url"),
      body
    );
    const { data, error } = await query
      .ilike("vyrok", `%${term}%`)
      .range(0, LEXICAL_SEARCH_ROWS_PER_TERM - 1);

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as SearchRow[]) {
      candidateMap.set(row.id, row);

      if (candidateMap.size === LEXICAL_SEARCH_CANDIDATE_LIMIT) {
        break;
      }
    }

    if (candidateMap.size === LEXICAL_SEARCH_CANDIDATE_LIMIT) {
      break;
    }
  }

  const scoredRows = Array.from(candidateMap.values())
    .map((row) => ({
      row,
      similarity: scoreTextAgainstQuery(semanticQuery, row.vyrok, row.odovodnenie),
    }))
    .filter((candidate) => candidate.similarity > 0)
    .sort((left, right) => {
      if (right.similarity !== left.similarity) {
        return right.similarity - left.similarity;
      }

      const leftDate = left.row.datum ?? "";
      const rightDate = right.row.datum ?? "";
      return rightDate.localeCompare(leftDate);
    });

  const offset = (page - 1) * pageSize;
  const pagedResults = scoredRows
    .slice(offset, offset + pageSize)
    .map(({ row, similarity }) => toStatement({ ...row, similarity }));
  const totalCount = scoredRows.length;

  return {
    results: pagedResults,
    totalCount,
    hasMore: offset + pagedResults.length < totalCount,
  };
}

function buildRelatedFilterParams(body: SearchRequest, meno: string) {
  return {
    filter_strana: null,
    filter_vyhodnotenie: toFilterArray(body.vyhodnotenie),
    filter_meno: [meno],
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

  const coercedVerdict = coerceOptionalVerdictArray(parsedBody.vyhodnotenie);
  if (coercedVerdict.invalid) {
    return NextResponse.json(
      { error: "Invalid verdict value" },
      { status: 400 }
    );
  }

  const body: SearchRequest = {
    query: coerceOptionalString(parsedBody.query),
    strana: coerceOptionalStringArray(parsedBody.strana),
    vyhodnotenie: coercedVerdict.value,
    meno: coerceOptionalStringArray(parsedBody.meno),
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
      const modelUnderstanding = await understandQuery(body.query, allNames, allParties);
      const fallbackUnderstanding = buildFastQueryUnderstanding(
        body,
        body.query,
        allNames,
        allParties
      );
      const understanding = {
        semantic_query:
          modelUnderstanding.semantic_query.trim() ||
          fallbackUnderstanding.semantic_query.trim() ||
          body.query,
        filters: mergeUnderstandingFilters(
          modelUnderstanding.filters,
          fallbackUnderstanding.filters
        ),
        related_politicians: modelUnderstanding.related_politicians,
      } satisfies QueryUnderstanding;
      recordStageTiming(timings, "understand_query_ms", understandingStartedAt);
      const validatedFilters = validateExtractedFilters(
        body.query,
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
      if (await canUseSearchStatementsRpc(supabase)) {
        let embedding: number[];
        const embedStartedAt = performance.now();
        try {
          embedding = await embedText(semanticQuery, "search");
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
          if (isRpcUnavailable(searchResult.error) || isRpcUnavailable(countResult.error)) {
            searchStatementsRpcAvailable = false;
          } else {
            console.error(
              "[search] semantic search RPC error:",
              searchResult.error?.code ?? countResult.error?.code,
              searchResult.error?.message ?? countResult.error?.message,
              searchResult.error?.details ?? countResult.error?.details
            );
            return NextResponse.json({ error: "Database error" }, { status: 502 });
          }
        } else {
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
        }
      }

      if (!results.length && totalCount === 0 && hasMore === undefined) {
        const fallbackStartedAt = performance.now();
        const fallback = await runLexicalSearchFallback(
          supabase,
          mergedBody,
          semanticQuery,
          page,
          pageSize
        );
        recordStageTiming(timings, "search_statements_ms", fallbackStartedAt);
        results = fallback.results;
        totalCount = fallback.totalCount;
        hasMore = fallback.hasMore;
      }

      queryUnderstanding = {
        extracted_filters: validatedFilters,
        related_politicians: validatedRelatedPoliticians,
      };
    } else {
      const query = applyStatementFilters(
        supabase
          .from("vyroky")
          .select(
            "id, vyrok, vyhodnotenie, odovodnenie, datum, meno, strana, url, speaker_url",
            { count: "exact" }
          ),
        body
      );

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
