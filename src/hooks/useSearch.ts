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

const USE_MOCK = process.env.NEXT_PUBLIC_USE_SEARCH_MOCK === "true";

const emptyFilters: FilterState = {
  strana: null,
  oblast: null,
  vyhodnotenie: null,
  meno: null,
  datum_od: null,
  datum_do: null,
};

const extractedFilterKeys = [
  "strana",
  "oblast",
  "vyhodnotenie",
  "meno",
] as const satisfies Array<keyof FilterState>;

type ExtractedFilters =
  NonNullable<SearchResponse["query_understanding"]>["extracted_filters"];

function clearModelOwnedFilters(
  currentFilters: FilterState,
  ownedFields: Set<keyof FilterState>,
): FilterState {
  if (ownedFields.size === 0) {
    return currentFilters;
  }

  return {
    ...currentFilters,
    strana: ownedFields.has("strana") ? null : currentFilters.strana,
    oblast: ownedFields.has("oblast") ? null : currentFilters.oblast,
    vyhodnotenie: ownedFields.has("vyhodnotenie")
      ? null
      : currentFilters.vyhodnotenie,
    meno: ownedFields.has("meno") ? null : currentFilters.meno,
  };
}

function applyExtractedFilters(
  currentFilters: FilterState,
  extractedFilters: ExtractedFilters,
  ownedFields: Set<keyof FilterState>,
): {
  filters: FilterState;
  ownedFields: Set<keyof FilterState>;
} {
  const clearedFilters = clearModelOwnedFilters(currentFilters, ownedFields);
  const nextFilters = { ...clearedFilters };
  const nextOwnedFields = new Set<keyof FilterState>();

  if (clearedFilters.strana === null && extractedFilters.strana !== null) {
    nextFilters.strana = extractedFilters.strana;
    nextOwnedFields.add("strana");
  }
  if (clearedFilters.oblast === null && extractedFilters.oblast !== null) {
    nextFilters.oblast = extractedFilters.oblast;
    nextOwnedFields.add("oblast");
  }
  if (
    clearedFilters.vyhodnotenie === null &&
    extractedFilters.vyhodnotenie !== null
  ) {
    nextFilters.vyhodnotenie = extractedFilters.vyhodnotenie;
    nextOwnedFields.add("vyhodnotenie");
  }
  if (clearedFilters.meno === null && extractedFilters.meno !== null) {
    nextFilters.meno = [extractedFilters.meno];
    nextOwnedFields.add("meno");
  }

  return {
    filters: nextFilters,
    ownedFields: nextOwnedFields,
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
    if (request.strana && statement.strana !== request.strana) {
      return false;
    }

    if (request.oblast && statement.oblast !== request.oblast) {
      return false;
    }

    if (request.vyhodnotenie && statement.vyhodnotenie !== request.vyhodnotenie) {
      return false;
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
  const [query, setQueryState] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [availableFilters, setAvailableFilters] =
    useState<FiltersResponse | null>(null);
  const [filterLoadError, setFilterLoadError] = useState(false);
  const availableFiltersRef = useRef<FiltersResponse | null>(null);
  const modelSetFields = useRef<Set<keyof FilterState>>(new Set<keyof FilterState>());
  const isModelFilterUpdateRef = useRef(false);

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
    async (nextPage = page) => {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      const cleanedFilters = clearModelOwnedFilters(filters, modelSetFields.current);
      const request = buildRequestBody(query, cleanedFilters, nextPage);

      try {
        if (USE_MOCK) {
          setResults(runMockSearch(request));
          return;
        }

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

        const data: SearchResponse = await response.json();
        setResults(data);
        if (data.query_understanding?.extracted_filters) {
          const extractedFilters = data.query_understanding.extracted_filters;
          isModelFilterUpdateRef.current = true;
          setFiltersState((currentFilters) => {
            const nextState = applyExtractedFilters(
              currentFilters,
              extractedFilters,
              modelSetFields.current,
            );
            modelSetFields.current = nextState.ownedFields;
            return nextState.filters;
          });
        }
      } catch (caughtError) {
        setResults(null);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Nepodarilo sa načítať výsledky vyhľadávania.",
        );
      } finally {
        setLoading(false);
      }
    },
    [filters, page, query],
  );

  const setFilters = useCallback((nextState: SetStateAction<FilterState>) => {
    setFiltersState((currentFilters) => {
      const nextFilters =
        typeof nextState === "function" ? nextState(currentFilters) : nextState;

      extractedFilterKeys.forEach((key) => {
        if (currentFilters[key] !== nextFilters[key]) {
          modelSetFields.current.delete(key);
        }
      });

      return nextFilters;
    });
  }, []);

  const setQuery = useCallback((nextQuery: string) => {
    setQueryState(nextQuery);

    if (nextQuery !== "") {
      return;
    }

    setFiltersState((currentFilters) => {
      if (modelSetFields.current.size === 0) {
        return currentFilters;
      }

      const nextFilters = clearModelOwnedFilters(currentFilters, modelSetFields.current);
      modelSetFields.current = new Set<keyof FilterState>();
      return nextFilters;
    });
  }, []);

  return {
    results,
    loading,
    error,
    query,
    filters,
    page,
    availableFilters,
    filterLoadError,
    hasSearched,
    setQuery,
    setFilters,
    setPage,
    setError,
    search,
    loadFilters,
    isModelFilterUpdateRef,
  };
}
