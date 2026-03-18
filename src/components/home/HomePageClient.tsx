"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import DetectionResults from "@/components/detect/DetectionResults";
import HomeOnboarding from "@/components/home/HomeOnboarding";
import ResearchWorkspace from "@/components/research/ResearchWorkspace";
import StatementInput from "@/components/detect/StatementInput";
import FilterSidebar from "@/components/search/FilterSidebar";
import SearchBar from "@/components/search/SearchBar";
import SearchResults from "@/components/search/SearchResults";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useDetect } from "@/hooks/useDetect";
import { useResearch } from "@/hooks/useResearch";
import { useSearch } from "@/hooks/useSearch";
import type { DetectMode } from "@/types";

export type HomeTab = "search" | "detect";

interface HomePageClientProps {
  activeTab: HomeTab;
}

export default function HomePageClient({ activeTab }: HomePageClientProps) {
  const [detectMode, setDetectMode] = useState<DetectMode>("thorough");
  const [isAutoOpeningResearch, setIsAutoOpeningResearch] = useState(false);
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
    resultMode,
    loading: detectLoading,
    error: detectError,
    detect,
    reset: resetDetect,
  } = useDetect();
  const {
    data: researchData,
    loading: researchLoading,
    error: researchError,
    isOpen: isResearchOpen,
    openStatementResearch,
    openAggregateResearch,
    retry: retryResearch,
    close: closeResearch,
  } = useResearch();
  const initializedRef = useRef(false);
  const searchRef = useRef(search);
  const autoOpenedRef = useRef(false);

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

  const matchedStatementIds = useMemo(
    () =>
      detectResult?.matches
        .filter((match) => match.classification !== "UNRELATED")
        .map((match) => match.statement.id) ?? [],
    [detectResult],
  );

  useEffect(() => {
    if (
      resultMode !== "thorough" ||
      !detectResult ||
      detectResult.overall_status === "NEW_CLAIM" ||
      matchedStatementIds.length === 0 ||
      autoOpenedRef.current
    ) {
      return;
    }

    autoOpenedRef.current = true;
    startTransition(() => {
      setIsAutoOpeningResearch(true);
    });

    void openAggregateResearch(matchedStatementIds, { revealWhenReady: false }).finally(() => {
      startTransition(() => {
        setIsAutoOpeningResearch(false);
      });
    });
  }, [detectResult, matchedStatementIds, openAggregateResearch, resultMode]);

  const handleDetectReset = () => {
    autoOpenedRef.current = false;
    setIsAutoOpeningResearch(false);
    resetDetect();
    closeResearch();
  };

  const handleDetect = (statement: string, mode: DetectMode) => {
    autoOpenedRef.current = false;
    setIsAutoOpeningResearch(false);
    setDetectMode(mode);
    closeResearch();
    void detect(statement, mode);
  };

  const handleRerunThorough = (statement: string) => {
    autoOpenedRef.current = false;
    setIsAutoOpeningResearch(false);
    setDetectMode("thorough");
    closeResearch();
    void detect(statement, "thorough");
  };

  const isDetectPanelLoading =
    detectLoading || (resultMode === "thorough" && isAutoOpeningResearch);

  return (
    <div className="relative min-h-[400px]">
      <div className="relative">
        <section
          role="tabpanel"
          id="search-panel"
          aria-labelledby="navbar-search-tab"
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
                    queryUnderstanding={results.query_understanding}
                    query={query}
                    onPageChange={handlePageChange}
                    onOpenResearch={(statementId) => {
                      void openStatementResearch(statementId);
                    }}
                  />
                ) : null}
              </div>
            </section>
          </div>
        </section>

        <section
          role="tabpanel"
          id="detect-panel"
          aria-labelledby="navbar-detect-tab"
          aria-hidden={activeTab !== "detect"}
          className={`transition-[opacity,transform] duration-200 will-change-[opacity,transform] ${
            activeTab === "detect"
              ? "relative translate-y-0 opacity-100"
              : "pointer-events-none absolute inset-0 translate-y-3 opacity-0"
          }`}
        >
          <div className="space-y-6">
            <StatementInput
              onSubmit={handleDetect}
              mode={detectMode}
              onModeChange={setDetectMode}
              loading={isDetectPanelLoading}
              onReset={handleDetectReset}
            />

            <div className="min-h-[320px]">
              {detectError ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  {detectError}
                </div>
              ) : null}

              {isDetectPanelLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700/60 dark:bg-slate-800/40">
                  <div className="flex min-h-[160px] flex-col items-center justify-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-base font-medium text-slate-700 dark:text-slate-200">
                      {resultMode === "thorough" || detectMode === "thorough"
                        ? "Pripravujem prieskum výroku a súvisiace zdroje..."
                        : "Porovnávam výrok s databázou overených tvrdení..."}
                    </p>
                  </div>
                </div>
              ) : null}

              {!isDetectPanelLoading && !detectResult ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700/40 dark:bg-slate-800/40">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Výsledky detekcie sa zobrazia tu
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Po odoslaní uvidíte najbližšie zhody a pri režime Prieskum sa
                      automaticky otvorí aj súhrnný workspace.
                    </p>
                  </div>
                </div>
              ) : null}

              {!isDetectPanelLoading && detectResult ? (
                <DetectionResults
                  result={detectResult}
                  resultMode={resultMode}
                  onOpenStatementResearch={(statementId) => {
                    void openStatementResearch(statementId);
                  }}
                  onOpenAggregateResearch={(statementIds) => {
                    void openAggregateResearch(statementIds);
                  }}
                  onRerunThorough={handleRerunThorough}
                />
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <ResearchWorkspace
        isOpen={isResearchOpen}
        data={researchData}
        loading={researchLoading}
        error={researchError}
        detectResult={detectResult}
        onClose={closeResearch}
        onRetry={() => {
          void retryResearch();
        }}
      />
      <HomeOnboarding />
    </div>
  );
}
