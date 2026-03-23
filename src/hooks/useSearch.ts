"use client";

import { useCallback, useRef, useState, type SetStateAction } from "react";
import { mockFilters, mockStatements } from "@/lib/mock-data";
import type {
  FilterState,
  FiltersResponse,
  SearchRequest,
  SearchResponse,
  Statement,
} from "@/types";
import type { SearchFilterOwnershipState, SearchHistoryEntry } from "@/types/history";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_SEARCH_MOCK === "true";

const emptyFilters: FilterState = {
  strana: null,
  vyhodnotenie: null,
  meno: null,
  datum_od: null,
  datum_do: null,
};

const extractedFilterKeys = [
  "strana",
  "vyhodnotenie",
  "meno",
  "datum_od",
  "datum_do",
] as const satisfies Array<keyof FilterState>;

type ExtractedFilters =
  NonNullable<SearchResponse["query_understanding"]>["extracted_filters"];

type SearchCompletionSource = "submit" | "auto-filter-refine" | "restore";

type CompletedSearchSnapshot = {
  requestKey: string;
  query: string;
  filters: FilterState;
  filterOwnership: SearchFilterOwnershipState;
  response: SearchResponse;
  source: SearchCompletionSource;
};

function emptyFilterOwnership(): SearchFilterOwnershipState {
  return {
    strana: "none",
    vyhodnotenie: "none",
    meno: "none",
    datum_od: "none",
    datum_do: "none",
  };
}

function clearModelOwnedFilters(
  currentFilters: FilterState,
  ownership: SearchFilterOwnershipState,
): FilterState {
  return {
    strana: ownership.strana === "model" ? null : currentFilters.strana,
    vyhodnotenie: ownership.vyhodnotenie === "model" ? null : currentFilters.vyhodnotenie,
    meno: ownership.meno === "model" ? null : currentFilters.meno,
    datum_od: ownership.datum_od === "model" ? null : currentFilters.datum_od,
    datum_do: ownership.datum_do === "model" ? null : currentFilters.datum_do,
  };
}

function applyExtractedFilters(
  currentFilters: FilterState,
  currentOwnership: SearchFilterOwnershipState,
  extractedFilters: ExtractedFilters,
): {
  filters: FilterState;
  ownership: SearchFilterOwnershipState;
} {
  const baseFilters = clearModelOwnedFilters(currentFilters, currentOwnership);
  const nextFilters = { ...baseFilters };
  const nextOwnership = { ...currentOwnership };

  if (baseFilters.strana === null && extractedFilters.strana !== null) {
    nextFilters.strana = extractedFilters.strana;
    nextOwnership.strana = "model";
  }
  if (
    baseFilters.vyhodnotenie === null &&
    extractedFilters.vyhodnotenie !== null
  ) {
    nextFilters.vyhodnotenie = extractedFilters.vyhodnotenie;
    nextOwnership.vyhodnotenie = "model";
  }
  if (baseFilters.meno === null && extractedFilters.meno !== null) {
    nextFilters.meno = extractedFilters.meno;
    nextOwnership.meno = "model";
  }
  if (baseFilters.datum_od === null && extractedFilters.datum_od !== null) {
    nextFilters.datum_od = extractedFilters.datum_od;
    nextOwnership.datum_od = "model";
  }
  if (baseFilters.datum_do === null && extractedFilters.datum_do !== null) {
    nextFilters.datum_do = extractedFilters.datum_do;
    nextOwnership.datum_do = "model";
  }

  return {
    filters: nextFilters,
    ownership: nextOwnership,
  };
}

function buildRequestBody(
  query: string,
  filters: FilterState,
  page: number,
): SearchRequest {
  return {
    page,
    page_size: 10,
    ...(query.trim() ? { query: query.trim() } : {}),
    ...Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== null),
    ),
  };
}

function sortBySimilarity(query: string, items: Statement[]) {
  const terms = query
    .toLocaleLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  if (terms.length === 0) {
    return items;
  }

  return [...items].sort((left, right) => {
    const leftScore = terms.reduce((score, term) => {
      const haystack = `${left.vyrok} ${left.odovodnenie ?? ""}`.toLocaleLowerCase();
      return score + (haystack.includes(term) ? 1 : 0);
    }, 0);
    const rightScore = terms.reduce((score, term) => {
      const haystack = `${right.vyrok} ${right.odovodnenie ?? ""}`.toLocaleLowerCase();
      return score + (haystack.includes(term) ? 1 : 0);
    }, 0);

    return rightScore - leftScore;
  });
}

function runMockSearch(request: SearchRequest): SearchResponse {
  const startedAt = performance.now();

  let filtered = mockStatements.filter((statement) => {
    if (request.strana) {
      const parties = Array.isArray(request.strana)
        ? request.strana
        : [request.strana];
      if (!parties.includes(statement.strana)) {
        return false;
      }
    }

    if (request.vyhodnotenie) {
      const verdicts = Array.isArray(request.vyhodnotenie)
        ? request.vyhodnotenie
        : [request.vyhodnotenie];
      if (!verdicts.includes(statement.vyhodnotenie)) {
        return false;
      }
    }

    if (request.meno) {
      const mena = Array.isArray(request.meno) ? request.meno : [request.meno];
      if (!mena.includes(statement.meno)) {
        return false;
      }
    }

    if (request.datum_od && (!statement.datum || statement.datum < request.datum_od)) {
      return false;
    }

    if (request.datum_do && (!statement.datum || statement.datum > request.datum_do)) {
      return false;
    }

    return true;
  });

  if (request.query) {
    const normalizedQuery = request.query.toLocaleLowerCase();

    filtered = sortBySimilarity(
      request.query,
      filtered.filter((statement) => {
        const haystack =
          `${statement.vyrok} ${statement.odovodnenie ?? ""}`.toLocaleLowerCase();
        return haystack.includes(normalizedQuery);
      }),
    ).map((statement, index) => ({
      ...statement,
      similarity: Number(Math.max(0.55, 0.96 - index * 0.04).toFixed(2)),
    }));
  }

  const page = request.page ?? 1;
  const pageSize = request.page_size ?? 10;
  const offset = (page - 1) * pageSize;

  return {
    results: filtered.slice(offset, offset + pageSize),
    total_count: filtered.length,
    page,
    page_size: pageSize,
    query_time_ms: Math.round(performance.now() - startedAt),
  };
}

export function useSearch() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [filters, setFiltersState] = useState<FilterState>(emptyFilters);
  const [filterOwnership, setFilterOwnership] = useState<SearchFilterOwnershipState>(emptyFilterOwnership());
  const [query, setQueryState] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [submittedFilters, setSubmittedFilters] = useState<FilterState>(emptyFilters);
  const [submittedOwnership, setSubmittedOwnership] = useState<SearchFilterOwnershipState>(emptyFilterOwnership());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [availableFilters, setAvailableFilters] =
    useState<FiltersResponse | null>(null);
  const [filterLoadError, setFilterLoadError] = useState(false);
  const [completedSearchSnapshot, setCompletedSearchSnapshot] = useState<CompletedSearchSnapshot | null>(null);
  const [restoreVersion, setRestoreVersion] = useState(0);
  const [manualFilterVersion, setManualFilterVersion] = useState(0);
  const availableFiltersRef = useRef<FiltersResponse | null>(null);
  const filterOwnershipRef = useRef<SearchFilterOwnershipState>(emptyFilterOwnership());
  const filtersRef = useRef<FilterState>(emptyFilters);
  const submittedFiltersRef = useRef<FilterState>(emptyFilters);
  const requestSequenceRef = useRef(0);

  const syncFilterOwnership = useCallback((ownership: SearchFilterOwnershipState) => {
    filterOwnershipRef.current = ownership;
    setFilterOwnership(ownership);
  }, []);

  const syncFilters = useCallback((filters: FilterState) => {
    filtersRef.current = filters;
    setFiltersState(filters);
  }, []);

  const syncSubmittedFilters = useCallback((filters: FilterState) => {
    submittedFiltersRef.current = filters;
    setSubmittedFilters(filters);
  }, []);

  const loadFilters = useCallback(async () => {
    if (availableFiltersRef.current) {
      return availableFiltersRef.current;
    }

    try {
      if (USE_MOCK) {
        availableFiltersRef.current = mockFilters;
        setAvailableFilters(mockFilters);
        setFilterLoadError(false);
        return mockFilters;
      }

      const response = await fetch("/api/filters", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Nepodarilo sa načítať filtre.");
      }

      const data: FiltersResponse = await response.json();
      availableFiltersRef.current = data;
      setAvailableFilters(data);
      setFilterLoadError(false);
      return data;
    } catch {
      availableFiltersRef.current = mockFilters;
      setAvailableFilters(mockFilters);
      setFilterLoadError(true);
      return mockFilters;
    }
  }, []);

  const search = useCallback(
    async ({
      nextPage = page,
      submit = false,
      overrideOwnership,
      source = "submit",
    }: {
      nextPage?: number;
      submit?: boolean;
      overrideOwnership?: SearchFilterOwnershipState;
      source?: SearchCompletionSource;
    } = {}) => {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      const activeQuery = submit ? query : submittedQuery;
      const activeFilters = submit ? filtersRef.current : submittedFiltersRef.current;
      const activeOwnership = overrideOwnership ?? (submit ? filterOwnershipRef.current : submittedOwnership);

      const cleanedFilters = clearModelOwnedFilters(activeFilters, activeOwnership);
      const cleanedOwnership = extractedFilterKeys.reduce<SearchFilterOwnershipState>(
        (ownership, key) => {
          ownership[key] =
            cleanedFilters[key] === null
              ? "none"
              : activeOwnership[key] === "model"
                ? "user"
                : activeOwnership[key];
          return ownership;
        },
        emptyFilterOwnership(),
      );
      const request = buildRequestBody(activeQuery, cleanedFilters, nextPage);
      const requestKey = `${source}:${requestSequenceRef.current + 1}`;
      requestSequenceRef.current += 1;

      setSubmittedQuery(activeQuery);
      syncSubmittedFilters(cleanedFilters);
      setSubmittedOwnership(cleanedOwnership);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      try {
        let responseData: SearchResponse | null = null;
        let resolvedFinalFilters = cleanedFilters;
        let resolvedFinalOwnership = cleanedOwnership;

        if (USE_MOCK) {
          const mockResult = runMockSearch(request);
          setResults(mockResult);
          responseData = mockResult;
        } else {
          const response = await fetch("/api/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
          });

          if (!response.ok) {
            throw new Error("Nepodarilo sa načítať výsledky vyhľadávania.");
          }

          responseData = await response.json();
          setResults(responseData);
        }

        if (responseData?.query_understanding?.extracted_filters) {
          const extractedFilters = responseData.query_understanding.extracted_filters;
          const nextState = applyExtractedFilters(
            cleanedFilters,
            cleanedOwnership,
            extractedFilters,
          );
          resolvedFinalFilters = nextState.filters;
          resolvedFinalOwnership = nextState.ownership;
        }

        if (submit) {
          if (responseData === null) {
            throw new Error("Nepodarilo sa zostaviť výsledky vyhľadávania.");
          }

          syncFilters(resolvedFinalFilters);
          syncSubmittedFilters(resolvedFinalFilters);
          syncFilterOwnership(resolvedFinalOwnership);
          setSubmittedOwnership(resolvedFinalOwnership);
          setCompletedSearchSnapshot({
            requestKey,
            query: activeQuery,
            filters: resolvedFinalFilters,
            filterOwnership: resolvedFinalOwnership,
            response: {
              results: responseData.results,
              related_results: responseData.related_results,
              related_articles: responseData.related_articles,
              total_count: responseData.total_count,
              page: responseData.page,
              page_size: responseData.page_size,
              query_time_ms: responseData.query_time_ms,
              has_more: responseData.has_more,
              query_understanding: responseData.query_understanding,
            },
            source,
          });
        }
      } catch (caughtError) {
        if (caughtError instanceof Error && caughtError.name === "AbortError") {
          setError("Vyhľadávanie trvalo príliš dlho. Skúste to prosím znova.");
        } else {
          setResults(null);
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Nepodarilo sa načítať výsledky vyhľadávania.",
          );
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    },
    [page, query, submittedQuery, submittedOwnership, filterOwnershipRef, submittedFiltersRef, filtersRef],
  );

  const setFilters = useCallback((nextState: SetStateAction<FilterState>) => {
    setFiltersState((currentFilters) => {
      const nextFilters =
        typeof nextState === "function" ? nextState(currentFilters) : nextState;

      const hasAnyChange = extractedFilterKeys.some(
        (key) => currentFilters[key] !== nextFilters[key],
      );

      if (hasAnyChange) {
        setFilterOwnership(() => {
          const nextOwnership = extractedFilterKeys.reduce<SearchFilterOwnershipState>(
            (ownership, key) => {
              ownership[key] = nextFilters[key] !== null ? "user" : "none";
              return ownership;
            },
            emptyFilterOwnership(),
          );

          filterOwnershipRef.current = nextOwnership;
          filtersRef.current = nextFilters;
          setManualFilterVersion((currentVersion) => currentVersion + 1);
          return nextOwnership;
        });
      } else {
        filtersRef.current = nextFilters;
      }

      return nextFilters;
    });
  }, []);

  const setQuery = useCallback((nextQuery: string) => {
    setQueryState(nextQuery);

    if (!nextQuery.trim()) {
      setHasSearched(false);
      setResults(null);
      setSubmittedQuery("");
      syncSubmittedFilters(emptyFilters);
      setSubmittedOwnership(emptyFilterOwnership());
      syncFilters(emptyFilters);
      syncFilterOwnership(emptyFilterOwnership());
      setPage(1);
      return;
    }

    setFilterOwnership((currentOwnership) => {
      const hasModelOwnedFilters = extractedFilterKeys.some(
        (key) => currentOwnership[key] === "model",
      );
      if (!hasModelOwnedFilters) {
        return currentOwnership;
      }

      const nextOwnership = { ...currentOwnership };
      extractedFilterKeys.forEach((key) => {
        if (nextOwnership[key] === "model") {
          nextOwnership[key] = "none";
        }
      });

      const clearedFilters = clearModelOwnedFilters(filtersRef.current, currentOwnership);
      setFiltersState(clearedFilters);
      filtersRef.current = clearedFilters;

      filterOwnershipRef.current = nextOwnership;

      return nextOwnership;
    });
  }, []);

  const restore = useCallback((entry: SearchHistoryEntry) => {
    setQueryState(entry.query);
    setSubmittedQuery(entry.query);
    syncFilters(entry.filters);
    syncSubmittedFilters(entry.filters);
    syncFilterOwnership(entry.filterOwnership);
    setSubmittedOwnership(entry.filterOwnership);
    setPage(entry.response.page ?? 1);
    setHasSearched(true);
    setError(null);
    setResults({
      results: entry.response.results,
      related_results: entry.response.related_results,
      related_articles: entry.response.related_articles,
      total_count: entry.response.total_count,
      page: entry.response.page,
      page_size: entry.response.page_size,
      query_time_ms: entry.response.query_time_ms,
      has_more: entry.response.has_more,
      query_understanding: entry.response.query_understanding,
    });
    setCompletedSearchSnapshot({
      requestKey: `restore:${requestSequenceRef.current + 1}`,
      query: entry.query,
      filters: entry.filters,
      filterOwnership: entry.filterOwnership,
      response: {
        results: entry.response.results,
        related_results: entry.response.related_results,
        related_articles: entry.response.related_articles,
        total_count: entry.response.total_count,
        page: entry.response.page,
        page_size: entry.response.page_size,
        query_time_ms: entry.response.query_time_ms,
        has_more: entry.response.has_more,
        query_understanding: entry.response.query_understanding,
      },
      source: "restore",
    });
    requestSequenceRef.current += 1;
    setRestoreVersion((currentVersion) => currentVersion + 1);
  }, []);

  return {
    results,
    loading,
    error,
    query,
    submittedQuery,
    submittedFilters,
    filterOwnership,
    filters,
    page,
    availableFilters,
    filterLoadError,
    completedSearchSnapshot,
    restoreVersion,
    manualFilterVersion,
    hasSearched,
    setQuery,
    setFilters,
    setPage,
    setError,
    search,
    restore,
    loadFilters,
  };
}
