"use client";

import { useCallback, useState } from "react";
import { mockFilters, mockStatements } from "@/lib/mock-data";
import type {
  FilterState,
  FiltersResponse,
  SearchRequest,
  SearchResponse,
  Statement,
} from "@/types";

const USE_MOCK = false;

const emptyFilters: FilterState = {
  strana: null,
  oblast: null,
  vyhodnotenie: null,
  meno: null,
  datum_od: null,
  datum_do: null,
};

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

    if (request.meno && statement.meno !== request.meno) {
      return false;
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
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [availableFilters, setAvailableFilters] =
    useState<FiltersResponse | null>(null);

  const loadFilters = useCallback(async () => {
    if (availableFilters) {
      return availableFilters;
    }

    try {
      if (USE_MOCK) {
        setAvailableFilters(mockFilters);
        return mockFilters;
      }

      const response = await fetch("/api/filters", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Nepodarilo sa načítať filtre.");
      }

      const data: FiltersResponse = await response.json();
      setAvailableFilters(data);
      return data;
    } catch {
      setAvailableFilters(mockFilters);
      return mockFilters;
    }
  }, [availableFilters]);

  const search = useCallback(
    async (nextPage = page) => {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      const request = buildRequestBody(query, filters, nextPage);

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
      } catch {
        setResults(runMockSearch(request));
      } finally {
        setLoading(false);
      }
    },
    [filters, page, query],
  );

  return {
    results,
    loading,
    error,
    query,
    filters,
    page,
    availableFilters,
    hasSearched,
    setQuery,
    setFilters,
    setPage,
    setError,
    search,
    loadFilters,
  };
}
