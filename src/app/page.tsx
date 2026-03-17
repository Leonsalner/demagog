"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import DetectionResults from "@/components/detect/DetectionResults";
import StatementInput from "@/components/detect/StatementInput";
import FilterSidebar from "@/components/search/FilterSidebar";
import SearchBar from "@/components/search/SearchBar";
import SearchResults from "@/components/search/SearchResults";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useDetect } from "@/hooks/useDetect";
import { useSearch } from "@/hooks/useSearch";

type HomeTab = "search" | "detect";

const tabs: Array<{ id: HomeTab; label: string }> = [
  { id: "search", label: "Vyhľadávanie" },
  { id: "detect", label: "Detekcia duplikátov" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<HomeTab>("search");
  const {
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
    search,
    loadFilters,
    isModelFilterUpdateRef,
  } = useSearch();
  const {
    result: detectResult,
    loading: detectLoading,
    error: detectError,
    detect,
    reset: resetDetect,
  } = useDetect();
  const initializedRef = useRef(false);
  const searchRef = useRef(search);

  useEffect(() => {
    searchRef.current = search;
  });

  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    if (isModelFilterUpdateRef.current) {
      isModelFilterUpdateRef.current = false;
      return;
    }

    setPage(1);
    const timeout = window.setTimeout(() => {
      void searchRef.current(1);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [filters, isModelFilterUpdateRef, setPage]);

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
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
              Vyhľadávanie a detekcia výrokov
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Vyhľadávajte vo výrokoch overených Demagogom, spresnite výsledky
              podľa filtrov a v rovnakom okne skontrolujte, či nový výrok nie je
              už pokrytý existujúcim fact-checkom.
            </p>
          </div>

          <Link
            href="/add"
            prefetch={false}
            className="inline-flex items-center justify-center rounded-full bg-[#e03e1a] px-4 py-2.5 text-sm font-semibold !text-white visited:!text-white hover:!text-white shadow-sm transition hover:bg-[#c73414] dark:bg-[#ff3300] dark:hover:bg-[#e63a00]"
          >
            Pridať nový výrok
          </Link>
        </div>

        <div className="mt-6">
          <div
            className="relative inline-grid min-w-full grid-cols-2 rounded-full border border-slate-200 bg-slate-100/90 p-1 shadow-inner dark:border-slate-700/70 dark:bg-slate-800/80 sm:min-w-[360px] sm:max-w-md"
            role="tablist"
            aria-label="Prepínanie medzi vyhľadávaním a detekciou"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.375rem)] rounded-full bg-[#e03e1a] shadow-[0_12px_30px_rgba(224,62,26,0.2)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform dark:bg-[#ff3300] dark:shadow-[0_12px_30px_rgba(255,51,0,0.22)]"
              style={{
                transform:
                  activeTab === "search"
                    ? "translateX(0)"
                    : "translateX(calc(100% + 0.25rem))",
              }}
            />
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`${tab.id}-tab`}
                  aria-controls={`${tab.id}-panel`}
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative z-10 rounded-full px-4 py-3 text-sm font-semibold transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isActive
                      ? "text-white"
                      : "bg-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="relative min-h-[400px]">
        <section
          role="tabpanel"
          id="search-panel"
          aria-labelledby="search-tab"
          aria-hidden={activeTab !== "search"}
          className={`transition-[opacity,transform] duration-200 will-change-[opacity,transform] ${
            activeTab === "search"
              ? "relative translate-y-0 opacity-100"
              : "pointer-events-none absolute inset-0 translate-y-3 opacity-0"
          }`}
        >
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
              <SearchBar
                value={query}
                onChange={setQuery}
                onSearch={handleSearch}
                loading={loading}
              />
            </div>

            <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <FilterSidebar
                filters={filters}
                availableFilters={availableFilters}
                filterLoadError={filterLoadError}
                onChange={setFilters}
              />

              <div className="min-h-[360px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900 sm:p-6">
                {!hasSearched && !loading && !error && !results ? (
                  <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Vyhľadávajte vo výrokoch overených Demagogom
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Zadajte tému, citáciu alebo meno politika — systém
                      automaticky rozpozná filtre. Výsledky spustíte Enterom alebo
                      tlačidlom Hľadať.
                    </p>
                  </div>
                ) : null}

                {loading ? (
                  <div className="flex min-h-[300px] items-center justify-center">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : null}

                {!loading && error ? (
                  <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-6 text-center dark:border-red-800/60 dark:bg-red-950/40">
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
                  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
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
                    relatedResults={results.related_results}
                    relatedArticles={results.related_articles}
                    queryUnderstanding={results.query_understanding}
                    query={query}
                    onPageChange={handlePageChange}
                  />
                ) : null}
              </div>
            </section>
          </div>
        </section>

        <section
          role="tabpanel"
          id="detect-panel"
          aria-labelledby="detect-tab"
          aria-hidden={activeTab !== "detect"}
          className={`transition-[opacity,transform] duration-200 will-change-[opacity,transform] ${
            activeTab === "detect"
              ? "relative translate-y-0 opacity-100"
              : "pointer-events-none absolute inset-0 translate-y-3 opacity-0"
          }`}
        >
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e03e1a] dark:text-[#ff3300]">
              Detekcia duplikátov
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Skontrolujte nový výrok bez otvárania ďalšej stránky
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              Vložte nový výrok, spustite analýzu a podľa potreby text hneď upravte
              alebo vymažte. Každé ďalšie kliknutie na analyzovať nahradí
              predchádzajúci výsledok.
            </p>

            <div className="mt-8 space-y-6">
              <StatementInput onSubmit={detect} loading={detectLoading} onReset={resetDetect} />

              <div className="min-h-[320px]">
                {detectError ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    {detectError}
                  </div>
                ) : null}

                {detectLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700/60 dark:bg-slate-800/40">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-base font-medium text-slate-700 dark:text-slate-200">
                      Porovnávam výrok s databázou overených tvrdení...
                    </p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Analýza zvyčajne trvá niekoľko sekúnd.
                    </p>
                  </div>
                ) : null}

                {!detectLoading && !detectResult ? (
                  <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
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

                {!detectLoading && detectResult ? (
                  <DetectionResults result={detectResult} />
                ) : null}
              </div>
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
