"use client";

import { useEffect, useRef } from "react";
import FilterSidebar from "@/components/search/FilterSidebar";
import SearchBar from "@/components/search/SearchBar";
import SearchResults from "@/components/search/SearchResults";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useSearch } from "@/hooks/useSearch";

export default function Home() {
  const {
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
    search,
    loadFilters,
  } = useSearch();
  const initializedRef = useRef(false);

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    setPage(1);
    const timeout = window.setTimeout(() => {
      void search(1);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [filters, search, setPage]);

  const handleSearch = () => {
    setPage(1);
    void search(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    void search(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-2">
          <span className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">
            Demagog.sk
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Vyhľadávanie overených výrokov
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Vyhľadávajte vo výrokoch overených Demagog.sk a spresnite výsledky
            podľa strany, oblasti, hodnotenia, politika a dátumu.
          </p>
        </div>
        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
          loading={loading}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <FilterSidebar
          filters={filters}
          availableFilters={availableFilters}
          onChange={setFilters}
        />

        <div className="min-h-[360px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {!hasSearched && !loading && !error && !results ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
              <h2 className="text-lg font-semibold text-slate-900">
                Vyhľadávajte vo výrokoch overených Demagog.sk
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Zadajte tému, citáciu alebo meno politika. Filtre môžete meniť
                samostatne a vyhľadávanie sa po úprave automaticky obnoví.
              </p>
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : null}

          {!loading && error ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-6 text-center">
              <div>
                <h2 className="text-lg font-semibold text-red-900">
                  Vyhľadávanie zlyhalo
                </h2>
                <p className="mt-2 text-sm text-red-700">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => void search(page)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Skúsiť znova
              </button>
            </div>
          ) : null}

          {!loading && !error && hasSearched && results?.results.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
              <h2 className="text-lg font-semibold text-slate-900">
                Žiadne výsledky pre zadané kritériá.
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Skúste upraviť dopyt alebo zrušiť niektoré filtre.
              </p>
            </div>
          ) : null}

          {!loading && !error && results?.results.length ? (
            <SearchResults
              results={results}
              query={query}
              onPageChange={handlePageChange}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
