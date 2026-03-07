"use client";

import { useEffect, useRef } from "react";
import DetectionResults from "@/components/detect/DetectionResults";
import StatementInput from "@/components/detect/StatementInput";
import FilterSidebar from "@/components/search/FilterSidebar";
import SearchBar from "@/components/search/SearchBar";
import SearchResults from "@/components/search/SearchResults";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useDetect } from "@/hooks/useDetect";
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
  const {
    result: detectResult,
    loading: detectLoading,
    error: detectError,
    detect,
    reset: resetDetect,
  } = useDetect();
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
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mb-4 flex flex-col gap-2">
          <span className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">
            Demagog.sk
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Vyhľadávanie a detekcia výrokov
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            Vyhľadávajte vo výrokoch overených Demagog.sk, spresnite výsledky
            podľa filtrov a v rovnakom okne skontrolujte, či nový výrok nie je
            už pokrytý existujúcim fact-checkom.
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

        <div className="min-h-[360px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
          {!hasSearched && !loading && !error && !results ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Vyhľadávajte vo výrokoch overených Demagog.sk
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Zadajte tému, citáciu alebo meno politika. Filtre môžete meniť
                samostatne; samotné písanie do vyhľadávania výsledky nespúšťa.
              </p>
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : null}

          {!loading && error ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-6 text-center dark:border-red-950 dark:bg-red-950/40">
              <div>
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">
                  Vyhľadávanie zlyhalo
                </h2>
                <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
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
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Žiadne výsledky pre zadané kritériá.
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
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

      <section
        id="detekcia-duplikatov"
        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Detekcia duplikátov
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Skontrolujte nový výrok bez otvárania ďalšej stránky
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              Vložte nový výrok, spustite analýzu a podľa potreby text hneď
              upravte alebo vymažte. Každé ďalšie kliknutie na analyzovať
              nahradí predchádzajúci výsledok.
            </p>
            <div className="mt-6">
              <StatementInput onSubmit={detect} loading={detectLoading} onReset={resetDetect} />
            </div>
          </div>

          <div className="min-h-[320px]">
            {detectError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                {detectError}
              </div>
            ) : null}

            {detectLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
                <p className="mt-4 text-base font-medium text-slate-700 dark:text-slate-200">
                  Porovnávam výrok s databázou overených tvrdení...
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Analýza zvyčajne trvá niekoľko sekúnd.
                </p>
              </div>
            ) : null}

            {!detectLoading && !detectResult ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center dark:border-slate-800 dark:bg-slate-900/60">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Výsledky detekcie sa zobrazia tu
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Po odoslaní uvidíte najbližšie zhody, ich klasifikáciu a
                    stručné vysvetlenie.
                  </p>
                </div>
              </div>
            ) : null}

            {!detectLoading && detectResult ? <DetectionResults result={detectResult} /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
